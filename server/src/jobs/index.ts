import cron from 'node-cron';
import { logger } from '../utils/logger';
import { runExpireBookings } from './expireBookings.job';
import { runAutoCancelUnchecked } from './autoCancelUncheckedIn.job';
import { runBookedSoon } from './bookedSoon.job';
import { runSponsorExpiry } from './sponsorExpiry.job';

let started = false;

export function registerAllJobs(): void {
  if (started) {
    logger.warn({}, 'Cron jobs already registered — skipping');
    return;
  }
  started = true;

  cron.schedule('* * * * *', () => {
    void runExpireBookings();
  });
  cron.schedule('* * * * *', () => {
    void runAutoCancelUnchecked();
  });
  cron.schedule('* * * * *', () => {
    void runBookedSoon();
  });

  // Sponsor expiry — every hour at minute 0
  cron.schedule('0 * * * *', () => {
    void runSponsorExpiry();
  });

  logger.info({ jobs: 4 }, 'Cron jobs registered');
}