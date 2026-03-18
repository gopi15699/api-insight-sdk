import { z } from 'zod';
import { Log } from '../models/Log';
import { analyseRootCause, buildGroupKey } from '../engines/rootCause';
import { sendAlert } from '../utils/alerts';
import { env } from '../config/env';

export const IngestLogSchema = z.object({
  endpoint: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
  statusCode: z.number().int().min(100).max(599),
  errorMessage: z.string().optional(),
  stackTrace: z.string().optional(),
  requestBody: z.record(z.unknown()).optional(),
  responseBody: z.record(z.unknown()).optional(),
  requestHeaders: z.record(z.string()).optional(),
  duration: z.number().optional(),
  userAgent: z.string().optional(),
  ip: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

interface ProjectContext {
  id: string;
  name: string;
  alertThreshold: number;
  alertEmail?: string;
}

export const ingestLog = async (
  data: z.infer<typeof IngestLogSchema>,
  project: ProjectContext
) => {
  const suggestion = analyseRootCause({
    errorMessage: data.errorMessage,
    stackTrace: data.stackTrace,
    statusCode: data.statusCode,
  });

  const groupKey = buildGroupKey(data.endpoint, data.errorMessage);

  const log = await Log.create({
    ...data,
    projectId: project.id,
    suggestion,
    groupKey,
    timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
  });

  // Async alert check (non-blocking)
  checkAndAlert(project, data.endpoint, data.errorMessage, groupKey).catch(console.error);

  return log;
};

export const getLogs = async (
  projectId: string,
  query: {
    page?: number;
    limit?: number;
    statusCode?: number;
    endpoint?: string;
    method?: string;
    from?: string;
    to?: string;
  }
) => {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, query.limit || 20);
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { projectId };

  if (query.statusCode) filter.statusCode = query.statusCode;
  if (query.endpoint) filter.endpoint = { $regex: query.endpoint, $options: 'i' };
  if (query.method) filter.method = query.method.toUpperCase();
  if (query.from || query.to) {
    filter.timestamp = {};
    if (query.from) filter.timestamp.$gte = new Date(query.from);
    if (query.to) filter.timestamp.$lte = new Date(query.to);
  }

  const [logs, total] = await Promise.all([
    Log.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    Log.countDocuments(filter),
  ]);

  return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getLogById = async (logId: string, projectId: string) => {
  return Log.findOne({ _id: logId, projectId }).lean();
};

export const getErrorGroups = async (projectId: string) => {
  return Log.aggregate([
    { $match: { projectId: new (require('mongoose').Types.ObjectId)(projectId) } },
    {
      $group: {
        _id: '$groupKey',
        endpoint: { $first: '$endpoint' },
        method: { $first: '$method' },
        errorMessage: { $first: '$errorMessage' },
        statusCode: { $first: '$statusCode' },
        suggestion: { $first: '$suggestion' },
        count: { $sum: 1 },
        lastOccurred: { $max: '$timestamp' },
        firstOccurred: { $min: '$timestamp' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 50 },
  ]);
};

export const getLogStats = async (projectId: string) => {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [total, errors24h, byStatus] = await Promise.all([
    Log.countDocuments({ projectId }),
    Log.countDocuments({ projectId, statusCode: { $gte: 400 }, timestamp: { $gte: last24h } }),
    Log.aggregate([
      { $match: { projectId: new (require('mongoose').Types.ObjectId)(projectId) } },
      { $group: { _id: '$statusCode', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  return { total, errors24h, byStatus };
};

// ── Internal alert checker ─────────────────────────────────────────────────────
async function checkAndAlert(
  project: ProjectContext,
  endpoint: string,
  errorMessage: string | undefined,
  groupKey: string
) {
  const threshold = project.alertThreshold || env.ALERT_ERROR_THRESHOLD;
  const recentWindow = new Date(Date.now() - 60 * 60 * 1000); // last 1 hour

  const count = await Log.countDocuments({
    projectId: project.id,
    groupKey,
    timestamp: { $gte: recentWindow },
  });

  if (count === threshold) {
    await sendAlert({
      projectName: project.name,
      endpoint,
      errorMessage,
      errorCount: count,
      threshold,
      alertEmail: project.alertEmail,
    });
  }
}
