import { Request, Response, NextFunction } from 'express';
import { Project } from '../models/Project';
import { User } from '../models/User';
import { PlanId } from '../config/plans';

export interface SDKRequest extends Request {
  project?: {
    id: string;
    name: string;
    alertThreshold: number;
    alertEmail?: string;
    plan: PlanId;
  };
}

/**
 * Validates the X-API-Key header sent by the SDK.
 * Attaches the resolved project to req.project.
 */
export const apiKeyAuth = async (
  req: SDKRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    res.status(401).json({ success: false, message: 'Missing X-API-Key header' });
    return;
  }

  const project = await Project.findOne({ apiKey });

  if (!project) {
    res.status(401).json({ success: false, message: 'Invalid API key' });
    return;
  }

  // Resolve the owning account's plan so ingest can enforce plan limits.
  const owner = await User.findById(project.userId).select('plan');

  req.project = {
    id: project.id,
    name: project.name,
    alertThreshold: project.alertThreshold,
    alertEmail: project.alertEmail,
    plan: owner?.plan ?? 'free',
  };

  next();
};
