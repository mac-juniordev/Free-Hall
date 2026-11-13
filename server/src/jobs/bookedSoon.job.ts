import { q } from '../db/query';
import { logger } from '../utils/logger';
import { getIo, isIoReady } from '../sockets/index';
import { emitHallBookedSoon } from '../sockets/hallBoard';

/**
 * Runs every minute:
 *  - Broadcast BOOKED_SOON to hall-board rooms for bookings starting within 45 min
 *  - Skip silently if sockets aren't ready (before initSockets runs)
 */
export async function runBookedSoon(): Promise<void> {
  if (!isIoReady()) return;

  try {
    const { rows } = await q<{
      id: string;
      university_id: string;
      hall_id: string;
      start_time: string;
    }>(
      `SELECT id, university_id, hall_id, start_time
         FROM bookings
        WHERE status IN ('active', 'upcoming')
          AND start_time > NOW()
          AND start_time <= NOW() + INTERVAL '45 minutes'`
    );

    if (rows.length === 0) return;

    const io = getIo();
    for (const b of rows) {
      emitHallBookedSoon(io, b.university_id, {
        hallId: b.hall_id,
        bookingId: b.id,
        startsAt: b.start_time,
      });
    }

    logger.info({ count: rows.length }, 'Booked-soon broadcasts emitted');
  } catch (err) {
    logger.error({ err }, 'bookedSoon job failed');
  }
}