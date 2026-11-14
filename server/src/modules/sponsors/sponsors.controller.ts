import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../middleware/errorHandler';
import { getScopedUniversityId } from '../../middleware/universityScope';
import { env } from '../../config/env';
import { q } from '../../db/query';
import * as service from './sponsors.service';

/**
 * Public — returns active sponsor OR null. Also resolves universityId from
 * X-University-Id header or defaults to env.DEFAULT_UNIVERSITY_CODE.
 */
export async function getActivePublic(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = await resolveUniversityIdFromPublicRequest(req);
    const sponsor = await service.getActiveSponsor(universityId);
    res.json({ sponsor });
  } catch (err) {
    next(err);
  }
}

export async function getList(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    const sponsors = await service.listSponsors(universityId);
    res.json({ sponsors });
  } catch (err) {
    next(err);
  }
}

export async function postCreate(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    const sponsor = await service.createSponsor(req.body, universityId);
    res.status(201).json({ sponsor });
  } catch (err) {
    next(err);
  }
}

export async function patchSponsor(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    const { id } = req.params as { id: string };
    const sponsor = await service.updateSponsor(id, universityId, req.body);
    res.json({ sponsor });
  } catch (err) {
    next(err);
  }
}

export async function deleteSponsor(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    const { id } = req.params as { id: string };
    const sponsor = await service.deactivateSponsor(id, universityId);
    res.json({ sponsor });
  } catch (err) {
    next(err);
  }
}

async function resolveUniversityIdFromPublicRequest(req: Request): Promise<string> {
  const headerId = req.header('X-University-Id')?.trim();
  const queryId =
    typeof req.query.universityId === 'string' ? req.query.universityId.trim() : undefined;
  const candidate = headerId || queryId;
  if (candidate) return candidate;

  const { rows } = await q<{ id: string }>(
    `SELECT id FROM universities WHERE short_code = $1 AND is_active = TRUE LIMIT 1`,
    [env.DEFAULT_UNIVERSITY_CODE]
  );
  if (!rows[0]) {
    throw new AppError('Cannot resolve default university', 400, 'NO_DEFAULT_UNIVERSITY');
  }
  return rows[0].id;
}