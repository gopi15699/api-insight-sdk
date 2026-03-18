import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Project } from '../models/Project';
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
