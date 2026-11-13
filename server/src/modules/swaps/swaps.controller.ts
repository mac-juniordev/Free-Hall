import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../middleware/errorHandler';
import { getScopedUniversityId } from '../../middleware/universityScope';
import * as service from './swaps.service';

export async function postCreate(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    if (!req.user) throw new AppError('Not authenticated', 401, 'UNAUTHORIZED');
    const swap = await service.createSwap(req.body, universityId, req.user.id);
    res.status(201).json({ swap });
  } catch (err) {
    next(err);
  }
}

export async function postAccept(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    if (!req.user) throw new AppError('Not authenticated', 401, 'UNAUTHORIZED');
    const { id } = req.params as { id: string };
    const swap = await service.acceptSwap(id, universityId, req.user.id);
    res.json({ swap });
  } catch (err) {
    next(err);
  }
}

export async function postReject(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    if (!req.user) throw new AppError('Not authenticated', 401, 'UNAUTHORIZED');
    const { id } = req.params as { id: string };
    const swap = await service.rejectSwap(id, universityId, req.user.id);
    res.json({ swap });
  } catch (err) {
    next(err);
  }
}

export async function getMine(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    if (!req.user) throw new AppError('Not authenticated', 401, 'UNAUTHORIZED');
    const result = await service.listMySwaps(req.user.id, universityId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}