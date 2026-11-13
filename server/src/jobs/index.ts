import cron from 'node-cron';
import { logger } from '../utils/logger';
import { runExpireBookings } from './expireBookings.job';
import { runAutoCancelUnchecked } from './autoCancelUncheckedIn.job';
import { runBookedSoon } from './bookedSoon.job';

let started = false;

export function registerAllJobs(): void {
  if (started) {
    logger.warn({}, 'Cron jobs already registered — skipping');
    return;
  }
  started = true;

  // Every minute: expire past bookings
  cron.schedule('* * * * *', () => {
    void runExpireBookings();
  });

  // Every minute: auto-cancel unchecked-in scheduled bookings
  cron.schedule('* * * * *', () => {
    void runAutoCancelUnchecked();
  });

  // Every minute: broadcast booked-soon to socket rooms
  cron.schedule('* * * * *', () => {
    void runBookedSoon();
  });

  logger.info({ jobs: 3 }, 'Cron jobs registered');
}