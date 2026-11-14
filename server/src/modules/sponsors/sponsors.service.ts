import { q, withTx } from '../../db/query';
import { AppError } from '../../middleware/errorHandler';
import { getFlag } from '../settings/settings.service';
import {
  CreateSponsorInput,
  UpdateSponsorInput,
} from './sponsors.schema';

type SponsorRow = {
  id: string;
  university_id: string;
  business_name: string;
  banner_text: string;
  whatsapp_footer: string;
  contact_phone: string | null;
  expires_at: string;
  is_active: boolean;
  created_at: string;
};

export type SponsorDto = {
  id: string;
  universityId: string;
  businessName: string;
  bannerText: string;
  whatsappFooter: string;
  contactPhone: string | null;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
};

export type ActiveSponsorDto = {
  businessName: string;
  bannerText: string;
  whatsappFooter: string;
} | null;

function toDto(row: SponsorRow): SponsorDto {
  return {
    id: row.id,
    universityId: row.university_id,
    businessName: row.business_name,
    bannerText: row.banner_text,
    whatsappFooter: row.whatsapp_footer,
    contactPhone: row.contact_phone,
    expiresAt: row.expires_at,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

/**
 * Public endpoint: returns the CURRENT active sponsor for the WhatsApp footer,
 * but only if the `enable_sponsor_banners` feature flag is ON.
 *
 * "Current" = is_active = true AND expires_at > NOW().
 * The most recently created active one wins (matching the "one active at a time"
 * invariant enforced on write).
 */
export async function getActiveSponsor(universityId: string): Promise<ActiveSponsorDto> {
  const flagOn = await getFlag(universityId, 'enable_sponsor_banners');
  if (!flagOn) return null;

  const { rows } = await q<SponsorRow>(
    `SELECT * FROM sponsors
      WHERE university_id = $1
        AND is_active = TRUE
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1`,
    [universityId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    businessName: row.business_name,
    bannerText: row.banner_text,
    whatsappFooter: row.whatsapp_footer,
  };
}

/**
 * Admin: list all sponsors (including inactive/expired).
 */
export async function listSponsors(universityId: string): Promise<SponsorDto[]> {
  const { rows } = await q<SponsorRow>(
    `SELECT * FROM sponsors
      WHERE university_id = $1
      ORDER BY created_at DESC`,
    [universityId]
  );
  return rows.map(toDto);
}

/**
 * Admin: create a new sponsor. If `isActive` is true, deactivates any other
 * currently-active sponsors for the same university (one-active-at-a-time).
 */
export async function createSponsor(
  input: CreateSponsorInput,
  universityId: string
): Promise<SponsorDto> {
  const expires = new Date(input.expiresAt);
  if (expires.getTime() <= Date.now()) {
    throw new AppError('expiresAt must be in the future', 400, 'EXPIRY_PAST');
  }

  return withTx(async (client) => {
    if (input.isActive) {
      await client.query(
        `UPDATE sponsors SET is_active = FALSE
          WHERE university_id = $1 AND is_active = TRUE`,
        [universityId]
      );
    }

    const { rows } = await client.query<SponsorRow>(
      `INSERT INTO sponsors
         (university_id, business_name, banner_text, whatsapp_footer,
          contact_phone, expires_at, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        universityId,
        input.businessName,
        input.bannerText,
        input.whatsappFooter,
        input.contactPhone ?? null,
        expires.toISOString(),
        input.isActive ?? true,
      ]
    );
    return toDto(rows[0]);
  });
}

/**
 * Admin: update. Setting `isActive` to true deactivates any OTHER active sponsors.
 */
export async function updateSponsor(
  sponsorId: string,
  universityId: string,
  input: UpdateSponsorInput
): Promise<SponsorDto> {
  if (input.expiresAt) {
    const expires = new Date(input.expiresAt);
    if (expires.getTime() <= Date.now() && input.isActive !== false) {
      throw new AppError(
        'expiresAt must be in the future unless isActive is set to false',
        400,
        'EXPIRY_PAST'
      );
    }
  }

  return withTx(async (client) => {
    // Check exists
    const { rows: existing } = await client.query<SponsorRow>(
      `SELECT * FROM sponsors WHERE id = $1 AND university_id = $2`,
      [sponsorId, universityId]
    );
    const current = existing[0];
    if (!current) {
      throw new AppError('Sponsor not found', 404, 'NOT_FOUND');
    }

    // If activating, deactivate others
    if (input.isActive === true && !current.is_active) {
      await client.query(
        `UPDATE sponsors SET is_active = FALSE
          WHERE university_id = $1 AND is_active = TRUE AND id <> $2`,
        [universityId, sponsorId]
      );
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.businessName !== undefined) {
      fields.push(`business_name = $${idx++}`);
      values.push(input.businessName);
    }
    if (input.bannerText !== undefined) {
      fields.push(`banner_text = $${idx++}`);
      values.push(input.bannerText);
    }
    if (input.whatsappFooter !== undefined) {
      fields.push(`whatsapp_footer = $${idx++}`);
      values.push(input.whatsappFooter);
    }
    if (input.contactPhone !== undefined) {
      fields.push(`contact_phone = $${idx++}`);
      values.push(input.contactPhone);
    }
    if (input.expiresAt !== undefined) {
      fields.push(`expires_at = $${idx++}`);
      values.push(new Date(input.expiresAt).toISOString());
    }
    if (input.isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(input.isActive);
    }

    if (fields.length === 0) {
      throw new AppError('No fields to update', 400, 'NO_CHANGES');
    }

    values.push(sponsorId, universityId);
    const { rows } = await client.query<SponsorRow>(
      `UPDATE sponsors
          SET ${fields.join(', ')}
        WHERE id = $${idx++} AND university_id = $${idx}
        RETURNING *`,
      values
    );

    return toDto(rows[0]);
  });
}

/**
 * Admin: soft-delete (deactivate). The row stays for audit.
 */
export async function deactivateSponsor(
  sponsorId: string,
  universityId: string
): Promise<SponsorDto> {
  const { rows } = await q<SponsorRow>(
    `UPDATE sponsors
        SET is_active = FALSE
      WHERE id = $1 AND university_id = $2
      RETURNING *`,
    [sponsorId, universityId]
  );
  if (!rows[0]) {
    throw new AppError('Sponsor not found', 404, 'NOT_FOUND');
  }
  return toDto(rows[0]);
}

/**
 * Cron helper: auto-deactivate sponsors whose expires_at has passed.
 * Returns number of rows touched.
 */
export async function expireSponsors(): Promise<number> {
  const { rowCount } = await q(
    `UPDATE sponsors
        SET is_active = FALSE
      WHERE is_active = TRUE
        AND expires_at <= NOW()`
  );
  return rowCount ?? 0;
}