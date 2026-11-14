import { logger } from '../utils/logger';
import { expireSponsors } from '../modules/sponsors/sponsors.service';

/**
 * Runs hourly:
 *  - Deactivates sponsors whose expires_at has passed
 */
export async function runSponsorExpiry(): Promise<void> {
  try {
    const count = await expireSponsors();
    if (count > 0) {
      logger.info({ count }, 'Expired sponsors deactivated');
    }
  } catch (err) {
    logger.error({ err }, 'sponsorExpiry job failed');
  }
} 