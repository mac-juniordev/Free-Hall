import { NextFunction, Request, Response } from 'express';
import { getScopedUniversityId } from '../../middleware/universityScope';
import * as service from './admin.service';

export async function getPendingUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    const users = await service.listPendingUsers(universityId);
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

export async function postApproveUser(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    const { id } = req.params as { id: string };
    await service.approveUser(id, universityId);
    res.json({ message: 'User approved' });
  } catch (err) {
    next(err);
  }
}

export async function postSuspendUser(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    const { id } = req.params as { id: string };
    await service.suspendUser(id, universityId);
    res.json({ message: 'User suspended' });
  } catch (err) {
    next(err);
  }
}

export async function postReinstateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    const { id } = req.params as { id: string };
    await service.reinstateUser(id, universityId);
    res.json({ message: 'User reinstated' });
  } catch (err) {
    next(err);
  }
}

export async function getPendingHalls(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    const halls = await service.listPendingHalls(universityId);
    res.json({ halls });
  } catch (err) {
    next(err);
  }
}

export async function postApproveHall(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    const { id } = req.params as { id: string };
    await service.approveHall(id, universityId);
    res.json({ message: 'Hall approved' });
  } catch (err) {
    next(err);
  }
}

export async function postRejectHall(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    const { id } = req.params as { id: string };
    await service.rejectHall(id, universityId);
    res.json({ message: 'Hall rejected' });
  } catch (err) {
    next(err);
  }
}

export async function getAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = getScopedUniversityId(res);
    const analytics = await service.getAnalytics(universityId);
    res.json({ analytics });
  } catch (err) {
    next(err);
  }
}