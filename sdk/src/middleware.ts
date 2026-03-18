import { Request, Response, NextFunction } from 'express';
import { ApiInsightClient } from './client';

/**
 * Express middleware that automatically captures API errors (4xx, 5xx).
 *
 * Usage:
 *   import { createMiddleware } from 'api-insight-sdk';
 *   app.use(createMiddleware({ apiKey: 'aik_...' }));
 */
export function createMiddleware(client: ApiInsightClient) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    // Intercept res.json to capture response body on errors
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
      if (statusCode < 400) return; // only capture errors

      const duration = Date.now() - startTime;

      client.sendLog({
        endpoint: req.path,
        method: req.method,
        statusCode,
        errorMessage: responseBody?.message as string | undefined,
        requestBody: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
        responseBody,
        requestHeaders: {
          'content-type': req.headers['content-type'] || '',
          'user-agent': req.headers['user-agent'] || '',
        },
        duration,
        userAgent: req.headers['user-agent'],
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
    client.sendLog({
      endpoint: req.path,
      method: req.method,
      statusCode: (err as { statusCode?: number }).statusCode || 500,
      errorMessage: err.message,
      stackTrace: err.stack,
      requestBody: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
      duration: undefined,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.socket?.remoteAddress,
      timestamp: new Date().toISOString(),
    });

    next(err); // pass to your own error handler
  };
}
