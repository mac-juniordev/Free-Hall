import { NextFunction, Request, Response } from 'express';
import * as service from './universities.service';

export async function getUniversities(req: Request, res: Response, next: NextFunction) {
  try {
    // Only super admins see inactive ones
    const includeInactive = req.user?.role === 'super_admin';
    const universities = await service.listUniversities({ includeInactive });
    res.json({ universities });
  } catch (err) {
    next(err);
  }
}

export async function getUniversity(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const university = await service.getUniversityById(id);
    res.json({ university });
  } catch (err) {
    next(err);
  }
}

export async function postUniversity(req: Request, res: Response, next: NextFunction) {
  try {
    const university = await service.createUniversity(req.body);
    res.status(201).json({ university });
  } catch (err) {
    next(err);
  }
}

export async function patchUniversity(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const university = await service.updateUniversity(id, req.body);
    res.json({ university });
  } catch (err) {
    next(err);
  }
}