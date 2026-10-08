export interface Project {
  _id: string;
  name: string;
  description?: string;
  apiKey: string;
  alertThreshold: number;
  alertEmail?: string;
  createdAt: string;
}

export interface Log {
  _id: string;
  projectId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  errorMessage?: string;
  stackTrace?: string;
  requestBody?: Record<string, unknown>;
  responseBody?: Record<string, unknown>;
  duration?: number;
  userAgent?: string;
  ip?: string;
  suggestion?: string;
  timestamp: string;
}

export interface ErrorGroup {
  _id: string;
  endpoint: string;
  method: string;
  errorMessage?: string;
  statusCode: number;
  suggestion?: string;
  count: number;
  lastOccurred: string;
  firstOccurred: string;
}

export interface LogStats {
  total: number;
  success: number;
  failure: number;
  total24h: number;
  errors24h: number;
  success24h: number;
  successRate: number;
  uniqueIps: number;
  byStatus: { _id: number; count: number }[];
}

export interface PaginatedLogs {
  logs: Log[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
