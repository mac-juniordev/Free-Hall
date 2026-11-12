import { NextFunction, Request, Response } from 'express';
import * as service from './auth.service';

export async function getUniversities(_req: Request, res: Response, next: NextFunction) {
  try {
    const universities = await service.listUniversities();
    res.json({ universities });
  } catch (err) {
    next(err);
  }
}

export async function postRegister(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function postLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
}