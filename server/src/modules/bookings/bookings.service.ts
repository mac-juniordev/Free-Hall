
import { q, withTx } from '../../db/query.js';
import { AppError } from '../../middleware/errorHandler.js';
import { getIo } from '../../sockets/index.js';
import { emitHallUpdate } from '../../sockets/hallBoard.js';
import { logger } from '../../utils/logger.js';
import type {
  ClaimBookingInput,
  ScheduleBookingInput,
} from './bookings.schema.js';
import type { PoolClient } from 'pg';

type HallRow = {
  id: string;
  university_id: string;
  name: string;
  zone: string;
  capacity_tier: 'small' | 'medium' | 'large' | 'amphi';
  approx_capacity_range: string;
  status: 'approved' | 'pending' | 'rejected';
};

type BookingRow = {
  id: string;
  university_id: string;
  hall_id: string;
  user_id: string;
  course_code: string;
  student_count: number;
  booking_type: 'instant' | 'scheduled';
  is_checked_in: boolean;
  start_time: string;
  end_time: string;
  status: 'active' | 'upcoming' | 'completed' | 'cancelled';
  created_at: string;
};

export type BookingDto = {
  id: string;
  universityId: string;
  hallId: string;
  hallName: string;
  userId: string;
  courseCode: string;
  studentCount: number;
  bookingType: 'instant' | 'scheduled';
  isCheckedIn: boolean;
  startTime: string;
  endTime: string;
  status: 'active' | 'upcoming' | 'completed' | 'cancelled';
  createdAt: string;
};

type LiveStatus = 'FREE' | 'OCCUPIED' | 'BOOKED_SOON';

const TIER_RANGES: Record<string, [number, number]> = {
  small: [1, 60],
  medium: [50, 130],
  large: [120, 260],
  amphi: [240, 2000],
};

/**
 * Typed wrapper around the existing database query helper.
 * This avoids requiring q itself to be declared as a generic function.
 */
    async function queryRows<T>(
    sql: string,
    params: unknown[] = []
    ): Promise<{ rows: T[] }> {
    const result = await q(sql, params);
    return result as unknown as { rows: T[] };
    }

function capacityWarning(
  tier: string,
  studentCount: number
): string | null {
  const range = TIER_RANGES[tier];

  if (!range) return null;

  const [min, max] = range;

  if (studentCount > max) {
    return `Your class (${studentCount}) exceeds this ${tier} hall's typical capacity. Consider a larger hall.`;
  }

  if (studentCount < Math.floor(min * 0.4)) {
    return `Your class (${studentCount}) is much smaller than this ${tier} hall. A smaller hall would free space for others.`;
  }

  return null;
}

async function getApprovedHall(
  hallId: string,
  universityId: string
): Promise<HallRow> {
  const { rows } = await queryRows<HallRow>(
    `SELECT id, university_id, name, zone,
            capacity_tier, approx_capacity_range, status
       FROM halls
      WHERE id = $1
        AND university_id = $2`,
    [hallId, universityId]
  );

  const hall = rows[0];

  if (!hall || hall.status !== 'approved') {
    throw new AppError(
      'Hall not found or not approved',
      404,
      'HALL_NOT_FOUND'
    );
  }

  return hall;
}

async function hasOverlap(
  hallId: string,
  start: Date,
  end: Date
): Promise<BookingRow | null> {
  const { rows } = await queryRows<BookingRow>(
    `SELECT *
       FROM bookings
      WHERE hall_id = $1
        AND status IN ('active', 'upcoming')
        AND start_time < $3
        AND end_time > $2
      LIMIT 1`,
    [hallId, start.toISOString(), end.toISOString()]
  );

  return rows[0] ?? null;
}

/**
 * Socket emitter.
 * Socket failures must never break booking HTTP responses.
 */
function safeEmitHallState(
  universityId: string,
  booking: BookingRow,
  liveStatus: LiveStatus
): void {
  try {
    const io = getIo();

    emitHallUpdate(io, universityId, {
      hallId: booking.hall_id,
      liveStatus,
      activeBookingId:
        liveStatus === 'OCCUPIED' ? booking.id : null,
      booking:
        liveStatus === 'OCCUPIED'
          ? {
              id: booking.id,
              courseCode: booking.course_code,
              startTime: booking.start_time,
              endTime: booking.end_time,
              userId: booking.user_id,
              studentCount: booking.student_count,
            }
          : null,
    });
  } catch (err) {
    logger.warn(
      { err },
      'Failed to emit hall update (socket not ready?)'
    );
  }
}

export async function claimBooking(
  input: ClaimBookingInput,
  universityId: string,
  userId: string
): Promise<{ booking: BookingDto; warning: string | null }> {
  const hall = await getApprovedHall(
    input.hallId,
    universityId
  );

  const start = new Date();
  const end = new Date(
    start.getTime() + input.durationMin * 60_000
  );

  const overlap = await hasOverlap(hall.id, start, end);

  if (overlap) {
    throw new AppError(
      `Hall is already booked for ${overlap.course_code} until ${overlap.end_time}. Try another hall.`,
      409,
      'HALL_OCCUPIED'
    );
  }

  const { rows } = await queryRows<BookingRow>(
    `INSERT INTO bookings
       (university_id, hall_id, user_id, course_code,
        student_count, booking_type, is_checked_in,
        start_time, end_time, status)
     VALUES ($1, $2, $3, $4, $5, 'instant', TRUE, $6, $7, 'active')
     RETURNING *`,
    [
      universityId,
      hall.id,
      userId,
      input.courseCode,
      input.studentCount,
      start.toISOString(),
      end.toISOString(),
    ]
  );

  const booking = rows[0];

  safeEmitHallState(universityId, booking, 'OCCUPIED');

  return {
    booking: toDto(booking, hall.name),
    warning: capacityWarning(
      hall.capacity_tier,
      input.studentCount
    ),
  };
}

export async function scheduleBooking(
  input: ScheduleBookingInput,
  universityId: string,
  userId: string
): Promise<{ booking: BookingDto; warning: string | null }> {
  const hall = await getApprovedHall(
    input.hallId,
    universityId
  );

  const start = new Date(input.startTime);

  if (Number.isNaN(start.getTime())) {
    throw new AppError(
      'Invalid booking start time',
      400,
      'INVALID_START_TIME'
    );
  }

  const end = new Date(
    start.getTime() + input.durationMin * 60_000
  );

  if (start.getTime() <= Date.now() || end <= start) {
    throw new AppError(
      'Booking must have a valid future start time and duration',
      400,
      'INVALID_TIME'
    );
  }

  const overlap = await hasOverlap(hall.id, start, end);

  if (overlap) {
    throw new AppError(
      `Time slot conflicts with existing booking ${overlap.course_code} (${overlap.start_time} – ${overlap.end_time}).`,
      409,
      'TIME_CONFLICT'
    );
  }

  const now = Date.now();
  const isImmediate = start.getTime() - now < 60_000;

  const status = isImmediate ? 'active' : 'upcoming';
  const isCheckedIn = isImmediate;

  const { rows } = await queryRows<BookingRow>(
    `INSERT INTO bookings
       (university_id, hall_id, user_id, course_code,
        student_count, booking_type, is_checked_in,
        start_time, end_time, status)
     VALUES ($1, $2, $3, $4, $5, 'scheduled', $6, $7, $8, $9)
     RETURNING *`,
    [
      universityId,
      hall.id,
      userId,
      input.courseCode,
      input.studentCount,
      isCheckedIn,
      start.toISOString(),
      end.toISOString(),
      status,
    ]
  );

  const booking = rows[0];

  safeEmitHallState(
    universityId,
    booking,
    isImmediate ? 'OCCUPIED' : 'BOOKED_SOON'
  );

  return {
    booking: toDto(booking, hall.name),
    warning: capacityWarning(
      hall.capacity_tier,
      input.studentCount
    ),
  };
}

export async function checkinBooking(
  bookingId: string,
  userId: string
): Promise<BookingDto> {
  const result = await withTx(
    async (client: PoolClient) => {
      const { rows } = await client.query<BookingRow>(
        `SELECT *
           FROM bookings
          WHERE id = $1
          FOR UPDATE`,
        [bookingId]
      );

      const booking = rows[0];

      if (!booking) {
        throw new AppError(
          'Booking not found',
          404,
          'NOT_FOUND'
        );
      }

      if (booking.user_id !== userId) {
        throw new AppError(
          'Not your booking',
          403,
          'FORBIDDEN'
        );
      }

      if (booking.status !== 'upcoming') {
        throw new AppError(
          `Cannot check in — booking is ${booking.status}`,
          400,
          'BAD_STATE'
        );
      }

      const now = Date.now();
      const start = new Date(booking.start_time).getTime();
      const end = new Date(booking.end_time).getTime();

      if (now < start - 5 * 60_000) {
        throw new AppError(
          'Too early to check in — please wait until 5 minutes before start time',
          400,
          'TOO_EARLY'
        );
      }

      if (now > end) {
        throw new AppError(
          'Booking window has already passed',
          400,
          'EXPIRED'
        );
      }

      if (now > start + 15 * 60_000) {
        throw new AppError(
          'Check-in window closed — booking was auto-cancelled',
          400,
          'CHECKIN_EXPIRED'
        );
      }

      const { rows: updated } =
        await client.query<BookingRow>(
          `UPDATE bookings
              SET is_checked_in = TRUE,
                  status = 'active'
            WHERE id = $1
            RETURNING *`,
          [bookingId]
        );

      const hallName = await getHallName(
        client,
        updated[0].hall_id
      );

      return {
        booking: toDto(updated[0], hallName),
        raw: updated[0],
      };
    }
  );

  safeEmitHallState(
    result.raw.university_id,
    result.raw,
    'OCCUPIED'
  );

  return result.booking;
}

export async function releaseBooking(
  bookingId: string,
  userId: string
): Promise<BookingDto> {
  const result = await withTx(
    async (client: PoolClient) => {
      const { rows } = await client.query<BookingRow>(
        `SELECT *
           FROM bookings
          WHERE id = $1
          FOR UPDATE`,
        [bookingId]
      );

      const booking = rows[0];

      if (!booking) {
        throw new AppError(
          'Booking not found',
          404,
          'NOT_FOUND'
        );
      }

      if (booking.user_id !== userId) {
        throw new AppError(
          'Not your booking',
          403,
          'FORBIDDEN'
        );
      }

      if (
        booking.status === 'completed' ||
        booking.status === 'cancelled'
      ) {
        const hallName = await getHallName(
          client,
          booking.hall_id
        );

        return {
          booking: toDto(booking, hallName),
          raw: booking,
          changed: false,
        };
      }

      const { rows: updated } =
        await client.query<BookingRow>(
          `UPDATE bookings
              SET status = 'completed',
                  end_time = LEAST(end_time, NOW())
            WHERE id = $1
            RETURNING *`,
          [bookingId]
        );

      const hallName = await getHallName(
        client,
        updated[0].hall_id
      );

      return {
        booking: toDto(updated[0], hallName),
        raw: updated[0],
        changed: true,
      };
    }
  );

  if (result.changed) {
    safeEmitHallState(
      result.raw.university_id,
      result.raw,
      'FREE'
    );
  }

  return result.booking;
}

export async function listMyBookings(
  userId: string,
  universityId: string
): Promise<BookingDto[]> {
  const { rows } = await queryRows<
    BookingRow & { hall_name: string }
  >(
    `SELECT b.*, h.name AS hall_name
       FROM bookings b
       JOIN halls h ON h.id = b.hall_id
      WHERE b.user_id = $1
        AND b.university_id = $2
        AND b.status IN ('active', 'upcoming')
      ORDER BY b.start_time ASC`,
    [userId, universityId]
  );

  return rows.map((row) =>
    toDto(row, row.hall_name)
  );
}

async function getHallName(
  client: PoolClient,
  hallId: string
): Promise<string> {
  const { rows } = await client.query<{ name: string }>(
    `SELECT name
       FROM halls
      WHERE id = $1`,
    [hallId]
  );

  return rows[0]?.name ?? 'Unknown hall';
}

function toDto(
  row: BookingRow,
  hallName: string
): BookingDto {
  return {
    id: row.id,
    universityId: row.university_id,
    hallId: row.hall_id,
    hallName,
    userId: row.user_id,
    courseCode: row.course_code,
    studentCount: row.student_count,
    bookingType: row.booking_type,
    isCheckedIn: row.is_checked_in,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function getActiveBookingForHall(
  hallId: string
): Promise<{
  id: string;
  start_time: string;
  end_time: string;
  status: string;
} | null> {
  const { rows } = await queryRows<{
    id: string;
    start_time: string;
    end_time: string;
    status: string;
  }>(
    `SELECT id, start_time, end_time, status
       FROM bookings
      WHERE hall_id = $1
        AND status = 'active'
        AND start_time <= NOW()
        AND end_time > NOW()
      LIMIT 1`,
    [hallId]
  );

  return rows[0] ?? null;
}

export async function getUpcomingBookingSoon(
  hallId: string
): Promise<{ id: string; start_time: string } | null> {
  const { rows } = await queryRows<{
    id: string;
    start_time: string;
  }>(
    `SELECT id, start_time
       FROM bookings
      WHERE hall_id = $1
        AND status IN ('active', 'upcoming')
        AND start_time > NOW()
        AND start_time <= NOW() + INTERVAL '45 minutes'
      ORDER BY start_time ASC
      LIMIT 1`,
    [hallId]
  );

  return rows[0] ?? null;
}
