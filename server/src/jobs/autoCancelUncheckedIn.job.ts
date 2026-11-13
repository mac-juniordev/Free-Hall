import { q } from '../db/query';
import { logger } from '../utils/logger';

/**
 * Runs every minute:
 *  - Upcoming bookings where start_time + 15 min <= NOW()
 *    AND is_checked_in = false → cancelled
 *
 * Rationale: scheduled bookings must be checked in within 15 min of start.
 * Otherwise the hall is effectively wasted — cancel and free it.
 */
export async function runAutoCancelUnchecked(): Promise<void> {
  try {
    const { rowCount } = await q(
      `UPDATE bookings
          SET status = 'cancelled'
        WHERE status = 'upcoming'
          AND is_checked_in = FALSE
          AND start_time + INTERVAL '15 minutes' <= NOW()`
    );
    if (rowCount && rowCount > 0) {
      logger.info({ count: rowCount }, 'Auto-cancelled unchecked bookings');
    }
  } catch (err) {
    logger.error({ err }, 'autoCancelUncheckedIn job failed');
  }
}