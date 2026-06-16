import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Project } from '../models/Project';
import { User } from '../models/User';
import { PLANS } from '../config/plans';
import { createError } from '../middleware/errorHandler';

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  alertThreshold: z.number().int().min(1).max(10000).optional(),
  alertEmail: z.string().email().optional(),
});

export const createProject = async (
  userId: string,
  data: z.infer<typeof CreateProjectSchema>
) => {
  // Enforce the account's plan project limit (null = unlimited).
  const user = await User.findById(userId).select('plan');
  if (!user) throw createError('User not found', 404);

  const limit = PLANS[user.plan].limits.maxProjects;
  if (limit !== null) {
    const count = await Project.countDocuments({ userId });
    if (count >= limit) {
      throw createError(
        `Your ${PLANS[user.plan].name} plan allows ${limit} project${limit === 1 ? '' : 's'}. Upgrade to add more.`,
        403
      );
    }
  }

  const apiKey = `aik_${uuidv4().replace(/-/g, '')}`;
  return Project.create({ ...data, userId, apiKey });
};

export const getUserProjects = async (userId: string) =>
  Project.find({ userId }).sort({ createdAt: -1 });

export const getProjectById = async (projectId: string, userId: string) => {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) throw createError('Project not found', 404);
  return project;
};
