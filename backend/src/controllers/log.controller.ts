import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SDKRequest } from '../middleware/apiKeyAuth';
import {
  IngestLogSchema,
  ingestLog,
  getLogs,
  getLogById,
  getErrorGroups,
  getLogStats,
} from '../services/log.service';
import { createError } from '../middleware/errorHandler';

// POST /logs — called by SDK using API key
export const ingest = async (req: SDKRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = IngestLogSchema.parse(req.body);
    const log = await ingestLog(data, req.project!);
    res.status(201).json({ success: true, data: { id: log.id } });
  } catch (err) {
    next(err);
  }
};

// GET /logs — dashboard
export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const projectId = req.query.projectId as string;
    if (!projectId) throw createError('projectId query param is required', 400);

    const result = await getLogs(projectId, {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      statusCode: req.query.statusCode ? Number(req.query.statusCode) : undefined,
      endpoint: req.query.endpoint as string | undefined,
      method: req.query.method as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// GET /logs/groups
export const groups = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const projectId = req.query.projectId as string;
    if (!projectId) throw createError('projectId query param is required', 400);

    const data = await getErrorGroups(projectId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /logs/stats
export const stats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const projectId = req.query.projectId as string;
    if (!projectId) throw createError('projectId query param is required', 400);

    const data = await getLogStats(projectId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /logs/:id
export const getOne = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const projectId = req.query.projectId as string;
    if (!projectId) throw createError('projectId query param is required', 400);

    const log = await getLogById(req.params.id, projectId);
    if (!log) throw createError('Log not found', 404);

    res.json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
};
