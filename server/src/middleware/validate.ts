import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { AppError } from './errorHandler';

type Target = 'body' | 'query' | 'params';

export function validate(schema: ZodTypeAny, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[target]);

      // Express 4's `req.query` is a prototype getter (read-only by direct
      // assignment). Shadow it on the instance via defineProperty so the
      // parsed/coerced value is what downstream handlers see.
      if (target === 'query') {
        Object.defineProperty(req, 'query', {
          value: parsed,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      } else {
        (req as any)[target] = parsed;
      }

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