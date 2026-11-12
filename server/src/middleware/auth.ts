import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { q } from '../db/query';
import { AppError } from './errorHandler';

type JwtPayload = {
  sub: string;
  iat?: number;
  exp?: number;
};

type DbUserRow = {
  id: string;
  university_id: string;
  full_name: string;
  matricule: string;
  email: string;
  role: 'super_admin' | 'cc' | 'assistant';
  status: 'pending' | 'approved' | 'suspended';
};

/** Verify the JWT from the Authorization header and load the user from DB. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AppError('Missing or malformed Authorization header', 401, 'UNAUTHORIZED');
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED');
    }

    const { rows } = await q<DbUserRow>(
      `SELECT id, university_id, full_name, matricule, email, role, status
         FROM users WHERE id = $1`,
      [payload.sub]
    );
    const user = rows[0];
    if (!user) {
      throw new AppError('Account not found', 401, 'UNAUTHORIZED');
    }
    if (user.status === 'suspended') {
      throw new AppError('Account suspended', 403, 'SUSPENDED');
    }

    req.user = {
      id: user.id,
      universityId: user.university_id,
      role: user.role,
      status: user.status,
      matricule: user.matricule,
      email: user.email,
      fullName: user.full_name,
    };
    next();
  } catch (err) {
    next(err);
  }
}

/** Reject pending or non-approved accounts. */
export function requireApproved(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError('Not authenticated', 401, 'UNAUTHORIZED'));
  }
  if (req.user.status !== 'approved') {
    return next(new AppError('Account is not approved yet', 403, 'NOT_APPROVED'));
  }
  next();
}

/** Allow only the specified roles. */
export function requireRole(...roles: Array<'super_admin' | 'cc' | 'assistant'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401, 'UNAUTHORIZED'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Forbidden — insufficient role', 403, 'FORBIDDEN'));
    }
    next();
  };
}