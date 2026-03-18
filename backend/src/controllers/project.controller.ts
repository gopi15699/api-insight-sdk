import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  CreateProjectSchema,
  createProject,
  getUserProjects,
  getProjectById,
} from '../services/project.service';

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = CreateProjectSchema.parse(req.body);
    const project = await createProject(req.user!.id, data);
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const projects = await getUserProjects(req.user!.id);
    res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
};

export const getOne = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const project = await getProjectById(req.params.id, req.user!.id);
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};
