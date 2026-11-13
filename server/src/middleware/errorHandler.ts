import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: 'Validation failed',
      issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }

  // ── Debug: surface the actual error for non-AppError throws ──
  if (err instanceof Error) {
    logger.error(
      {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
      'Unhandled error'
    );
  } else {
    logger.error({ raw: err }, 'Unhandled non-Error');
  }

  return res.status(500).json({ error: 'Internal server error' });
}