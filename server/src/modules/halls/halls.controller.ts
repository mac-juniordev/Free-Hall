import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../middleware/errorHandler';
import { getScopedUniversityId } from '../../middleware/universityScope';
import * as service from './halls.service';

export async function getHalls(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    const halls = await service.listHalls(universityId, req.query as any);
    res.json({ halls });
  } catch (err) {
    next(err);
  }
}

export async function getHall(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    const { id } = req.params as { id: string };
    const hall = await service.getHallDetail(id, universityId);
    res.json({ hall });
  } catch (err) {
    next(err);
  }
}

export async function postSuggestHall(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    if (!req.user) throw new AppError('Not authenticated', 401, 'UNAUTHORIZED');
    const hall = await service.suggestHall(req.body, universityId, req.user.id);
    res.status(201).json({
      message: 'Hall submitted. A Super Admin will review it shortly.',
      hall,
    });
  } catch (err) {
    next(err);
  }
}