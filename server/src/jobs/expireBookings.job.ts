import { q } from '../db/query';
import { logger } from '../utils/logger';

/**
 * Runs every minute:
 *  - Active bookings past end_time → completed
 *  - Upcoming bookings past end_time (missed check-in window + already past) → cancelled
 */
export async function runExpireBookings(): Promise<void> {
  try {
    const { rowCount } = await q(
      `UPDATE bookings
          SET status = CASE
            WHEN status = 'active'   THEN 'completed'
            WHEN status = 'upcoming' THEN 'cancelled'
            ELSE status
          END
        WHERE status IN ('active', 'upcoming')
          AND end_time <= NOW()`
    );
    if (rowCount && rowCount > 0) {
      logger.info({ count: rowCount }, 'Expired bookings updated');
    }
  } catch (err) {
    logger.error({ err }, 'expireBookings job failed');
  }
}