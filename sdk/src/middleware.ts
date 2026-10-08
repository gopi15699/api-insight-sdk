import { Request, Response, NextFunction } from 'express';
import { ApiInsightClient } from './client';

// Marker set by the error middleware so the response-finish handler doesn't
// log the same failure a second time.
const CAPTURED = Symbol.for('apiInsight.captured');

export interface MiddlewareOptions {
  /**
   * When true, only 4xx/5xx responses are captured (legacy behaviour).
   * Default: false — every request is captured so the dashboard can show
   * total / success / failure counts and unique IPs.
   */
  errorsOnly?: boolean;
  /**
   * Paths to skip (exact match or prefix). Useful for health checks / metrics
   * endpoints you don't want counted. Example: ['/health', '/metrics'].
   */
  ignorePaths?: string[];
}

function isIgnored(path: string, ignorePaths?: string[]): boolean {
  if (!ignorePaths || ignorePaths.length === 0) return false;
  return ignorePaths.some((p) => path === p || path.startsWith(p));
}

/**
 * Express middleware that captures API traffic.
 *
 * By default it records EVERY request (success + failure) so the dashboard can
 * report total calls, success rate, failure count, and unique IPs. Response and
 * request bodies are only attached to failures (4xx/5xx) to keep success logs
 * lightweight and avoid capturing sensitive payloads on the happy path.
 *
 * Usage:
 *   import { ApiInsightClient, createMiddleware } from 'api-insight-sdk';
 *   const insight = new ApiInsightClient({ apiKey: 'aik_...' });
 *   app.use(createMiddleware(insight, { ignorePaths: ['/health'] }));
 */
export function createMiddleware(client: ApiInsightClient, options: MiddlewareOptions = {}) {
  const { errorsOnly = false, ignorePaths } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    if (isIgnored(req.path, ignorePaths)) return next();

    const startTime = Date.now();

    // Intercept res.json to capture the response body on errors only.
    const originalJson = res.json.bind(res);
    let responseBody: Record<string, unknown> | undefined;

    res.json = function (body: unknown) {
      if (res.statusCode >= 400) {
        responseBody = body as Record<string, unknown>;
      }
      return originalJson(body);
    };

    res.on('finish', () => {
      const statusCode = res.statusCode;
      const isError = statusCode >= 400;

      // Skip if the error middleware already logged this request (thrown error).
      if ((res as unknown as Record<symbol, boolean>)[CAPTURED]) return;

      if (errorsOnly && !isError) return;

      const duration = Date.now() - startTime;

      client.sendLog({
        endpoint: req.path,
        method: req.method,
        statusCode,
        // Heavy / potentially sensitive fields: errors only.
        errorMessage: isError ? (responseBody?.message as string | undefined) : undefined,
        requestBody:
          isError && req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
        responseBody: isError ? responseBody : undefined,
        requestHeaders: isError
          ? {
              'content-type': (req.headers['content-type'] as string) || '',
              'user-agent': (req.headers['user-agent'] as string) || '',
            }
          : undefined,
        duration,
        userAgent: req.headers['user-agent'] as string | undefined,
        ip: req.ip || req.socket?.remoteAddress,
        timestamp: new Date().toISOString(),
      });
    });

    next();
  };
}

/**
 * Express error middleware — captures unhandled errors thrown inside routes.
 * Must be registered AFTER all routes:  app.use(createErrorMiddleware(client))
 */
export function createErrorMiddleware(client: ApiInsightClient) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (err: Error, req: Request, res: Response, next: NextFunction): void => {
    // Mark so createMiddleware's finish handler doesn't double-log this failure.
    (res as unknown as Record<symbol, boolean>)[CAPTURED] = true;

    client.sendLog({
      endpoint: req.path,
      method: req.method,
      statusCode: (err as { statusCode?: number }).statusCode || 500,
      errorMessage: err.message,
      stackTrace: err.stack,
      requestBody: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
      duration: undefined,
      userAgent: req.headers['user-agent'] as string | undefined,
      ip: req.ip || req.socket?.remoteAddress,
      timestamp: new Date().toISOString(),
    });

    next(err); // pass to your own error handler
  };
}
