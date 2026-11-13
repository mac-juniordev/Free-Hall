import { q, withTx } from '../../db/query';
import { AppError } from '../../middleware/errorHandler';
import { getIo, isIoReady } from '../../sockets/index';
import { emitSwapNew, emitSwapAccepted, emitSwapRejected } from '../../sockets/hallBoard';
import { logger } from '../../utils/logger';
import { CreateSwapInput } from './swaps.schema';

type BookingRow = {
  id: string;
  university_id: string;
  hall_id: string;
  user_id: string;
  course_code: string;
  student_count: number;
  status: 'active' | 'upcoming' | 'completed' | 'cancelled';
  start_time: string;
  end_time: string;
};

type SwapRow = {
  id: string;
  university_id: string;
  requester_booking_id: string;
  target_booking_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
};

export type SwapDto = {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
  requesterBooking: {
    id: string;
    hallId: string;
    hallName: string;
    courseCode: string;
    studentCount: number;
    userId: string;
    userFullName: string;
    startTime: string;
    endTime: string;
  };
  targetBooking: {
    id: string;
    hallId: string;
    hallName: string;
    courseCode: string;
    studentCount: number;
    userId: string;
    userFullName: string;
    startTime: string;
    endTime: string;
  };
};

/**
 * Create a swap request.
 * Rules:
 *  - Requester's booking must be active or upcoming
 *  - Requester must own their booking
 *  - Target booking must be active or upcoming and in a different hall
 *  - Requester's student_count must be > target's student_count
 *  - No pending swap already exists from requester's booking
 */
export async function createSwap(
  input: CreateSwapInput,
  universityId: string,
  requesterUserId: string
): Promise<SwapDto> {
  // Load both bookings
  const { rows: bookingRows } = await q<BookingRow>(
    `SELECT * FROM bookings
      WHERE id IN ($1, $2)
        AND university_id = $3`,
    [input.requesterBookingId, input.targetBookingId, universityId]
  );
  const requesterBooking = bookingRows.find((b) => b.id === input.requesterBookingId);
  const targetBooking = bookingRows.find((b) => b.id === input.targetBookingId);

  if (!requesterBooking) {
    throw new AppError('Requester booking not found', 404, 'NOT_FOUND');
  }
  if (!targetBooking) {
    throw new AppError('Target booking not found', 404, 'NOT_FOUND');
  }
  if (requesterBooking.user_id !== requesterUserId) {
    throw new AppError('You can only offer your own booking for swap', 403, 'FORBIDDEN');
  }
  if (requesterBooking.hall_id === targetBooking.hall_id) {
    throw new AppError('Both bookings are for the same hall', 400, 'SAME_HALL');
  }
  if (!['active', 'upcoming'].includes(requesterBooking.status)) {
    throw new AppError('Your booking is no longer active', 400, 'BAD_STATE');
  }
  if (!['active', 'upcoming'].includes(targetBooking.status)) {
    throw new AppError('Target booking is no longer active', 400, 'BAD_STATE');
  }
  if (requesterBooking.student_count <= targetBooking.student_count) {
    throw new AppError(
      'Your class must be larger than the target class to request a swap (you need the bigger hall)',
      400,
      'SIZE_MISMATCH'
    );
  }

  // No duplicate pending swap from this requester booking
  const { rows: existing } = await q<{ id: string }>(
    `SELECT id FROM swap_requests
      WHERE requester_booking_id = $1 AND status = 'pending' LIMIT 1`,
    [requesterBooking.id]
  );
  if (existing[0]) {
    throw new AppError(
      'This booking already has a pending swap request',
      409,
      'PENDING_EXISTS'
    );
  }

  const { rows: created } = await q<SwapRow>(
    `INSERT INTO swap_requests
       (university_id, requester_booking_id, target_booking_id, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
    [universityId, requesterBooking.id, targetBooking.id]
  );

  const dto = await hydrateSwap(created[0]);

  // Notify target owner
  if (isIoReady()) {
    try {
      const io = getIo();
      emitSwapNew(io, targetBooking.user_id, {
        swapId: dto.id,
        targetBooking: dto.targetBooking,
        requesterBooking: dto.requesterBooking,
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to emit swap:new');
    }
  }

  return dto;
}

/**
 * Accept a swap — atomic transaction:
 *  1. Lock both bookings
 *  2. Update swap status to accepted
 *  3. Swap the hall_ids on both bookings
 *  Only target owner can accept.
 */
export async function acceptSwap(
  swapId: string,
  universityId: string,
  userId: string
): Promise<SwapDto> {
  const result = await withTx(async (client) => {
    const { rows: swapRows } = await client.query<SwapRow>(
      `SELECT * FROM swap_requests
        WHERE id = $1 AND university_id = $2
        FOR UPDATE`,
      [swapId, universityId]
    );
    const swap = swapRows[0];
    if (!swap) throw new AppError('Swap not found', 404, 'NOT_FOUND');
    if (swap.status !== 'pending') {
      throw new AppError(`Swap is ${swap.status}`, 400, 'BAD_STATE');
    }

    // Lock bookings in deterministic order (avoid deadlocks)
    const ids = [swap.requester_booking_id, swap.target_booking_id].sort();
    const { rows: bookingRows } = await client.query<BookingRow>(
      `SELECT * FROM bookings WHERE id = ANY($1::uuid[]) FOR UPDATE`,
      [ids]
    );
    const requesterBooking = bookingRows.find((b) => b.id === swap.requester_booking_id);
    const targetBooking = bookingRows.find((b) => b.id === swap.target_booking_id);
    if (!requesterBooking || !targetBooking) {
      throw new AppError('One or both bookings missing', 404, 'NOT_FOUND');
    }
    if (targetBooking.user_id !== userId) {
      throw new AppError('Only the target owner can accept this swap', 403, 'FORBIDDEN');
    }
    if (!['active', 'upcoming'].includes(requesterBooking.status)) {
      throw new AppError('Requester booking is no longer active', 400, 'BAD_STATE');
    }
    if (!['active', 'upcoming'].includes(targetBooking.status)) {
      throw new AppError('Your booking is no longer active', 400, 'BAD_STATE');
    }

    // Atomic hall swap
    await client.query(
      `UPDATE bookings SET hall_id = $1 WHERE id = $2`,
      [targetBooking.hall_id, requesterBooking.id]
    );
    await client.query(
      `UPDATE bookings SET hall_id = $1 WHERE id = $2`,
      [requesterBooking.hall_id, targetBooking.id]
    );

    const { rows: updated } = await client.query<SwapRow>(
      `UPDATE swap_requests SET status = 'accepted' WHERE id = $1 RETURNING *`,
      [swapId]
    );

    return { swap: updated[0], requesterBooking };
  });

  const dto = await hydrateSwap(result.swap);

  if (isIoReady()) {
    try {
      const io = getIo();
      emitSwapAccepted(io, result.requesterBooking.user_id, {
        swapId: dto.id,
        requesterBooking: dto.requesterBooking,
        targetBooking: dto.targetBooking,
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to emit swap:accepted');
    }
  }

  return dto;
}

/**
 * Reject — target owner only.
 */
export async function rejectSwap(
  swapId: string,
  universityId: string,
  userId: string
): Promise<SwapDto> {
  const { rows: swapRows } = await q<SwapRow>(
    `SELECT * FROM swap_requests
      WHERE id = $1 AND university_id = $2`,
    [swapId, universityId]
  );
  const swap = swapRows[0];
  if (!swap) throw new AppError('Swap not found', 404, 'NOT_FOUND');
  if (swap.status !== 'pending') {
    throw new AppError(`Swap is ${swap.status}`, 400, 'BAD_STATE');
  }

  const { rows: targetRows } = await q<{ user_id: string }>(
    `SELECT user_id FROM bookings WHERE id = $1`,
    [swap.target_booking_id]
  );
  if (targetRows[0]?.user_id !== userId) {
    throw new AppError('Only the target owner can reject this swap', 403, 'FORBIDDEN');
  }

  const { rows: updated } = await q<SwapRow>(
    `UPDATE swap_requests SET status = 'rejected' WHERE id = $1 RETURNING *`,
    [swapId]
  );

  const dto = await hydrateSwap(updated[0]);

  if (isIoReady()) {
    try {
      const { rows: requesterRows } = await q<{ user_id: string }>(
        `SELECT user_id FROM bookings WHERE id = $1`,
        [swap.requester_booking_id]
      );
      if (requesterRows[0]) {
        const io = getIo();
        emitSwapRejected(io, requesterRows[0].user_id, { swapId: dto.id });
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to emit swap:rejected');
    }
  }

  return dto;
}

/**
 * My swaps — returns swaps where I'm requester OR target.
 */
export async function listMySwaps(
  userId: string,
  universityId: string
): Promise<{ incoming: SwapDto[]; outgoing: SwapDto[] }> {
  const { rows: myBookings } = await q<{ id: string }>(
    `SELECT id FROM bookings WHERE user_id = $1 AND university_id = $2`,
    [userId, universityId]
  );
  const bookingIds = myBookings.map((b) => b.id);
  if (bookingIds.length === 0) return { incoming: [], outgoing: [] };

  const { rows } = await q<SwapRow>(
    `SELECT * FROM swap_requests
      WHERE university_id = $1
        AND (requester_booking_id = ANY($2::uuid[]) OR target_booking_id = ANY($2::uuid[]))
      ORDER BY created_at DESC`,
    [universityId, bookingIds]
  );

  const dtos = await Promise.all(rows.map(hydrateSwap));
  const incoming: SwapDto[] = [];
  const outgoing: SwapDto[] = [];

  for (let i = 0; i < rows.length; i++) {
    const swap = rows[i];
    const dto = dtos[i];
    if (bookingIds.includes(swap.target_booking_id)) incoming.push(dto);
    else outgoing.push(dto);
  }

  return { incoming, outgoing };
}

/**
 * Hydrate a swap row with booking + hall + user data for a rich DTO.
 */
async function hydrateSwap(swap: SwapRow): Promise<SwapDto> {
  const { rows } = await q<{
    booking_id: string;
    hall_id: string;
    hall_name: string;
    course_code: string;
    student_count: number;
    user_id: string;
    user_full_name: string;
    start_time: string;
    end_time: string;
  }>(
    `SELECT b.id AS booking_id, b.hall_id, h.name AS hall_name,
            b.course_code, b.student_count, b.user_id,
            u.full_name AS user_full_name, b.start_time, b.end_time
       FROM bookings b
       JOIN halls h ON h.id = b.hall_id
       JOIN users u ON u.id = b.user_id
      WHERE b.id = ANY($1::uuid[])`,
    [[swap.requester_booking_id, swap.target_booking_id]]
  );

  const pick = (bookingId: string) => {
    const r = rows.find((x) => x.booking_id === bookingId);
    if (!r) {
      return {
        id: bookingId,
        hallId: '',
        hallName: '(deleted)',
        courseCode: '',
        studentCount: 0,
        userId: '',
        userFullName: '(deleted)',
        startTime: '',
        endTime: '',
      };
    }
    return {
      id: r.booking_id,
      hallId: r.hall_id,
      hallName: r.hall_name,
      courseCode: r.course_code,
      studentCount: r.student_count,
      userId: r.user_id,
      userFullName: r.user_full_name,
      startTime: r.start_time,
      endTime: r.end_time,
    };
  };

  return {
    id: swap.id,
    status: swap.status,
    createdAt: swap.created_at,
    requesterBooking: pick(swap.requester_booking_id),
    targetBooking: pick(swap.target_booking_id),
  };
}