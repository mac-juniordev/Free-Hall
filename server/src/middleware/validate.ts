import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { AppError } from './errorHandler';

type Target = 'body' | 'query' | 'params';

export function validate(schema: ZodTypeAny, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[target]);
      (req as any)[target] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const detail = err.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ');
        return next(new AppError(`Validation failed — ${detail}`, 422, 'VALIDATION'));
      }
      next(err);
    }
  };
}