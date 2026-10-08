import { z } from 'zod';
import { Log } from '../models/Log';
import { Project } from '../models/Project';
import { User } from '../models/User';
import { analyseRootCause, buildGroupKey } from '../engines/rootCause';
import { normalizeEndpoint } from '../utils/endpoint';
import { sendAlert } from '../utils/alerts';
import { env } from '../config/env';
import { PLANS, PlanId } from '../config/plans';
import { createError } from '../middleware/errorHandler';

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
  plan: PlanId;
}

export const ingestLog = async (
  data: z.infer<typeof IngestLogSchema>,
  project: ProjectContext
) => {
  // Normalise dynamic segments (/users/999 → /users/:id) so that resource ids
  // don't each count as a distinct endpoint or fragment error groups.
  const normalizedEndpoint = normalizeEndpoint(data.endpoint);

  // Enforce the plan's monitored-endpoint limit against NORMALISED endpoints.
  // A new endpoint beyond the cap is rejected; logs for endpoints already
  // tracked continue to flow.
  const maxEndpoints = PLANS[project.plan].limits.maxEndpoints;
  if (maxEndpoints !== null) {
    const known = await Log.distinct('normalizedEndpoint', { projectId: project.id });
    if (!known.includes(normalizedEndpoint) && known.length >= maxEndpoints) {
      throw createError(
        `Endpoint limit reached (${maxEndpoints}) for your plan. Upgrade to monitor more endpoints.`,
        403
      );
    }
  }

  const isError = data.statusCode >= 400;

  // Root-cause analysis and error grouping only apply to failures. Success
  // logs are stored as lightweight traffic records (for counts / IPs / rate).
  const suggestion = isError
    ? analyseRootCause({
        errorMessage: data.errorMessage,
        stackTrace: data.stackTrace,
        statusCode: data.statusCode,
      })
    : undefined;

  const groupKey = isError ? buildGroupKey(normalizedEndpoint, data.errorMessage) : undefined;

  const log = await Log.create({
    ...data,
    projectId: project.id,
    normalizedEndpoint,
    suggestion,
    groupKey,
    timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
  });

  // Async alert check (non-blocking) — errors only.
  if (isError && groupKey) {
    checkAndAlert(project, data.endpoint, data.errorMessage, groupKey).catch(console.error);
  }

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

  // Clamp the lower time bound to the plan's retention window — logs older than
  // the retention period are not surfaced on lower tiers.
  const retentionFloor = await getRetentionFloor(projectId);
  const fromBound = query.from ? new Date(query.from) : undefined;
  const lowerBound =
    fromBound && retentionFloor
      ? new Date(Math.max(fromBound.getTime(), retentionFloor.getTime()))
      : fromBound || retentionFloor;

  if (lowerBound || query.to) {
    filter.timestamp = {};
    if (lowerBound) filter.timestamp.$gte = lowerBound;
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
    {
      $match: {
        projectId: new (require('mongoose').Types.ObjectId)(projectId),
        // Error groups only — success logs have no groupKey.
        statusCode: { $gte: 400 },
        groupKey: { $ne: null },
      },
    },
    {
      $group: {
        _id: '$groupKey',
        endpoint: { $first: '$normalizedEndpoint' },
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
  const oid = new (require('mongoose').Types.ObjectId)(projectId);

  const [total, success, failure, total24h, errors24h, byStatus, uniqueIps] =
    await Promise.all([
      Log.countDocuments({ projectId }),
      Log.countDocuments({ projectId, statusCode: { $lt: 400 } }),
      Log.countDocuments({ projectId, statusCode: { $gte: 400 } }),
      Log.countDocuments({ projectId, timestamp: { $gte: last24h } }),
      Log.countDocuments({
        projectId,
        statusCode: { $gte: 400 },
        timestamp: { $gte: last24h },
      }),
      Log.aggregate([
        { $match: { projectId: oid } },
        { $group: { _id: '$statusCode', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Log.distinct('ip', { projectId, ip: { $nin: [null, ''] } }),
    ]);

  const successRate = total > 0 ? Number(((success / total) * 100).toFixed(2)) : 0;

  return {
    total,
    success,
    failure,
    total24h,
    errors24h,
    success24h: Math.max(0, total24h - errors24h),
    successRate,
    uniqueIps: uniqueIps.length,
    byStatus,
  };
};

/**
 * The earliest timestamp visible for a project, based on its owner's plan
 * retention window. Returns undefined if the project/owner can't be resolved.
 */
async function getRetentionFloor(projectId: string): Promise<Date | undefined> {
  const project = await Project.findById(projectId).select('userId');
  if (!project) return undefined;
  const owner = await User.findById(project.userId).select('plan');
  const plan: PlanId = owner?.plan ?? 'free';
  const days = PLANS[plan].limits.retentionDays;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

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
