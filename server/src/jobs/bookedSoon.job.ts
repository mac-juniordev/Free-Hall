import { logger } from '../utils/logger';
import { getIo } from '../sockets/index';
import { q } from '../db/query';

/**
 * Runs every minute:
 *  - Halls with a booking that starts within 45 min → broadcast BOOKED_SOON
 *  - Client-side joins hall room by universityId
 *
 * NOTE: Socket.io wiring lives in Phase 9e (realtime). Until that phase ships,
 * this job is a no-op placeholder that logs — safe to run.
 */
export async function runBookedSoon(): Promise<void> {
  try {
    // Check if sockets are ready before importing emitter
    let io;
    try {
      io = getIo();
    } catch {
      return; // sockets not initialized yet — skip silently
    }

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

    for (const b of rows) {
      io.to(`halls:${b.university_id}`).emit('hall:booked_soon', {
        hallId: b.hall_id,
        bookingId: b.id,
        startsAt: b.start_time,
      });
    }

    if (rows.length > 0) {
      logger.info({ count: rows.length }, 'Booked-soon broadcasts emitted');
    }
  } catch (err) {
    logger.error({ err }, 'bookedSoon job failed');
  }
}