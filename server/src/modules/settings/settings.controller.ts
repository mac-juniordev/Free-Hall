
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../middleware/errorHandler.js';
import { getScopedUniversityId } from '../../middleware/universityScope.js';
import type { SettingKey } from './settings.schema.js';
import * as service from './settings.service.js';
import { env } from '../../config/env.js';
import { q } from '../../db/query.js';

/**
 * GET /api/settings/flags
 * PUBLIC
 */
export async function getFlagsPublic(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const universityId = await resolveUniversityIdFromPublicRequest(req);
    const flags = await service.getFlags(universityId);

    res.json({ flags });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/settings/announcement
 * PUBLIC
 */
export async function getAnnouncementPublic(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const universityId = await resolveUniversityIdFromPublicRequest(req);
    const announcement = await service.getAnnouncement(universityId);

    res.json({ announcement });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/settings/:key
 * SUPER ADMIN
 */
export async function putSetting(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const universityId = getScopedUniversityId(res);
    const key = req.params.key as SettingKey;

    const result = await service.updateSetting(
      universityId,
      key,
      req.body
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/settings/all
 * SUPER ADMIN
 */
export async function listSettings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const universityId = getScopedUniversityId(res);
    const settings = await service.listSettings(universityId);

    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

/**
 * Resolve university for public requests.
 *
 * Priority:
 * 1. X-University-Id header
 * 2. universityId query parameter
 * 3. DEFAULT_UNIVERSITY_CODE environment variable
 */
async function resolveUniversityIdFromPublicRequest(
  req: Request
): Promise<string> {
  const headerId = req.header('X-University-Id')?.trim();

  const queryId =
    typeof req.query.universityId === 'string'
      ? req.query.universityId.trim()
      : undefined;

  const candidate = headerId || queryId;

  if (candidate) {
    return candidate;
  }

  const { rows } = await q<{ id: string }>(
    `SELECT id
     FROM universities
     WHERE short_code = $1
       AND is_active = TRUE
     LIMIT 1`,
    [env.DEFAULT_UNIVERSITY_CODE]
  );

  if (!rows[0]) {
    throw new AppError(
      'Cannot resolve default university',
      400,
      'NO_DEFAULT_UNIVERSITY'
    );
  }

  return rows[0].id;
}
