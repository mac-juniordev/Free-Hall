import { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler';

/**
 * Determines the university context for this request:
 *  - Regular CC / assistant → always their own university
 *  - Super Admin → may pass `X-University-Id` header to switch context,
 *    otherwise defaults to their own university.
 *
 * The result is attached to `res.locals.universityId`.
 */
export function universityScope(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError('Not authenticated', 401, 'UNAUTHORIZED'));
  }

  if (req.user.role === 'super_admin') {
    const override = req.header('X-University-Id');
    if (override && override.trim().length > 0) {
      res.locals.universityId = override.trim();
      return next();
    }
  }

  res.locals.universityId = req.user.universityId;
  next();
}

export function getScopedUniversityId(res: Response): string {
  const id = res.locals.universityId as string | undefined;
  if (!id) {
    throw new AppError('Missing university scope', 500, 'SCOPE_ERROR');
  } return id;
}