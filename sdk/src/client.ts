import axios, { AxiosInstance } from 'axios';

export interface LogPayload {
  endpoint: string;
  method: string;
  statusCode: number;
  errorMessage?: string;
  stackTrace?: string;
  requestBody?: Record<string, unknown>;
  responseBody?: Record<string, unknown>;
  requestHeaders?: Record<string, string>;
  duration?: number;
  userAgent?: string;
  ip?: string;
  timestamp?: string;
}

export interface ApiInsightConfig {
  apiKey: string;
  host?: string;       // defaults to https://api.api-insight.dev
  timeout?: number;    // ms, defaults to 3000
  debug?: boolean;
}

export class ApiInsightClient {
  private http: AxiosInstance;
  private debug: boolean;

  constructor(config: ApiInsightConfig) {
    const host = config.host || 'http://localhost:5000';

    this.debug = config.debug || false;
    this.http = axios.create({
      baseURL: `${host}/api`,
      timeout: config.timeout || 3000,
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Send a log entry to API Insight.
   * Fire-and-forget — errors are silently swallowed so the SDK never crashes your app.
   */
  sendLog(payload: LogPayload): void {
    this.http
      .post('/logs', payload)
      .then(() => {
        if (this.debug) console.log('[API Insight] Log sent:', payload.endpoint, payload.statusCode);
      })
      .catch((err) => {
        if (this.debug) console.error('[API Insight] Failed to send log:', err.message);
      });
  }

  /**
   * Async version — useful when you need to await the result.
   */
  async sendLogAsync(payload: LogPayload): Promise<void> {
    await this.http.post('/logs', payload);
  }
}
