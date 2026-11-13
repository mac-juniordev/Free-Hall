import { q } from '../db/query';
import { logger } from '../utils/logger';
import { isIoReady, getIo } from '../sockets/index';
import { emitHallUpdate } from '../sockets/hallBoard';

type ExpiredRow = {
  id: string;
  university_id: string;
  hall_id: string;
  user_id: string;
  course_code: string;
  student_count: number;
  start_time: string;
  end_time: string;
  new_status: 'completed' | 'cancelled';
};

/**
 * Runs every minute:
 *  - Active bookings past end_time → completed + emit FREE
 *  - Upcoming bookings past end_time → cancelled + emit FREE
 */
export async function runExpireBookings(): Promise<void> {
  try {
    const { rows } = await q<ExpiredRow>(
      `UPDATE bookings
          SET status = CASE
            WHEN status = 'active'   THEN 'completed'
            WHEN status = 'upcoming' THEN 'cancelled'
            ELSE status
          END
        WHERE status IN ('active', 'upcoming')
          AND end_time <= NOW()
        RETURNING id, university_id, hall_id, user_id, course_code,
                  student_count, start_time, end_time, status AS new_status`
    );

    if (rows.length === 0) return;
    logger.info({ count: rows.length }, 'Expired bookings updated');

    if (!isIoReady()) return;
    const io = getIo();
    for (const r of rows) {
      emitHallUpdate(io, r.university_id, {
        hallId: r.hall_id,
        liveStatus: 'FREE',
        activeBookingId: null,
        booking: null,
      });
    }
  } catch (err) {
    logger.error({ err }, 'expireBookings job failed');
  }
}