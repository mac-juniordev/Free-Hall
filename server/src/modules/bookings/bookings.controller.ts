import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../middleware/errorHandler';
import { getScopedUniversityId } from '../../middleware/universityScope';
import * as service from './bookings.service';

export async function postClaim(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    if (!req.user) throw new AppError('Not authenticated', 401, 'UNAUTHORIZED');
    const result = await service.claimBooking(req.body, universityId, req.user.id);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function postSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    if (!req.user) throw new AppError('Not authenticated', 401, 'UNAUTHORIZED');
    const result = await service.scheduleBooking(req.body, universityId, req.user.id);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function postCheckin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401, 'UNAUTHORIZED');
    const { id } = req.params as { id: string };
    const booking = await service.checkinBooking(id, req.user.id);
    res.json({ booking });
  } catch (err) {
    next(err);
  }
}

export async function postRelease(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401, 'UNAUTHORIZED');
    const { id } = req.params as { id: string };
    const booking = await service.releaseBooking(id, req.user.id);
    res.json({ booking });
  } catch (err) {
    next(err);
  }
}

export async function getMine(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    if (!req.user) throw new AppError('Not authenticated', 401, 'UNAUTHORIZED');
    const bookings = await service.listMyBookings(req.user.id, universityId);
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
}