/**
 * Rule-based Root Cause Analysis Engine
 * Matches error patterns and suggests fixes.
 */

interface RuleMatch {
  pattern: RegExp | ((input: RuleInput) => boolean);
  suggestion: string;
  priority: number; // higher = checked first
}

interface RuleInput {
  errorMessage?: string;
  stackTrace?: string;
  statusCode?: number;
}

const rules: RuleMatch[] = [
  // ── Auth / Permission ──────────────────────────────────────────────
  {
    priority: 100,
    pattern: ({ statusCode }) => statusCode === 401,
    suggestion:
      'HTTP 401 Unauthorized: The request lacks valid credentials. Check JWT token validity, expiry, and ensure the Authorization header is being sent correctly.',
  },
  {
    priority: 100,
    pattern: ({ statusCode }) => statusCode === 403,
    suggestion:
      'HTTP 403 Forbidden: The caller is authenticated but lacks permission. Verify role-based access control (RBAC) rules and user permissions.',
  },
  // ── Not Found ──────────────────────────────────────────────────────
  {
    priority: 90,
    pattern: ({ statusCode }) => statusCode === 404,
    suggestion:
      'HTTP 404 Not Found: The requested resource does not exist. Validate the URL, route registration, and that the resource ID exists in the database.',
  },
  // ── Validation ─────────────────────────────────────────────────────
  {
    priority: 90,
    pattern: ({ statusCode }) => statusCode === 400,
    suggestion:
      'HTTP 400 Bad Request: The request payload is invalid. Check required fields, data types, and schema validation rules.',
  },
  {
    priority: 90,
    pattern: ({ statusCode }) => statusCode === 422,
    suggestion:
      'HTTP 422 Unprocessable Entity: Input failed semantic validation. Review the field constraints and business logic validations.',
  },
  // ── Rate Limiting ──────────────────────────────────────────────────
  {
    priority: 90,
    pattern: ({ statusCode }) => statusCode === 429,
    suggestion:
      'HTTP 429 Too Many Requests: Rate limit exceeded. Implement exponential backoff on the client side or increase server rate limits.',
  },
  // ── Server Errors ──────────────────────────────────────────────────
  {
    priority: 80,
    pattern: ({ statusCode }) => statusCode === 500,
    suggestion:
      'HTTP 500 Internal Server Error: An unhandled exception occurred on the server. Check the stack trace for the root cause.',
  },
  {
    priority: 80,
    pattern: ({ statusCode }) => statusCode === 503,
    suggestion:
      'HTTP 503 Service Unavailable: The server is overloaded or a downstream dependency is down. Check health of dependent services.',
  },
  // ── Null / Undefined ───────────────────────────────────────────────
  {
    priority: 70,
    pattern: /cannot read propert(y|ies) of (null|undefined)/i,
    suggestion:
      'Null/Undefined access: A property was accessed on a null or undefined value. Add null guards (optional chaining `?.` or explicit checks) before accessing nested properties.',
  },
  {
    priority: 70,
    pattern: /null is not an object/i,
    suggestion:
      'Null object access: Attempting to use a null reference. Ensure the object is initialised before use and guard async data fetching results.',
  },
  // ── Connection Issues ──────────────────────────────────────────────
  {
    priority: 70,
    pattern: /ECONNREFUSED/i,
    suggestion:
      'Connection Refused (ECONNREFUSED): The target service is not running or unreachable on the given host/port. Verify the service is up, check environment variables for the correct host/port, and confirm firewall rules.',
  },
  {
    priority: 70,
    pattern: /ETIMEDOUT|ESOCKETTIMEDOUT|connection timed out/i,
    suggestion:
      'Connection Timeout: The downstream service did not respond in time. Investigate network latency, increase timeout limits, or implement a circuit breaker pattern.',
  },
  {
    priority: 70,
    pattern: /ENOTFOUND/i,
    suggestion:
      'DNS Resolution Failed (ENOTFOUND): The hostname cannot be resolved. Check DNS configuration and environment variable values for service URLs.',
  },
  // ── Timeout (generic) ──────────────────────────────────────────────
  {
    priority: 65,
    pattern: /timeout/i,
    suggestion:
      'Timeout detected: An operation exceeded its allowed time. Identify the slow dependency (database query, external API, computation) and optimise it or increase the timeout budget.',
  },
  // ── Database ───────────────────────────────────────────────────────
  {
    priority: 65,
    pattern: /MongoServerError|MongoError|duplicate key/i,
    suggestion:
      'MongoDB Error: Check for duplicate key violations, schema mismatches, or write concern issues. Review the exact MongoDB error code for more detail.',
  },
  {
    priority: 65,
    pattern: /cast to objectid failed/i,
    suggestion:
      'Invalid MongoDB ObjectId: The supplied ID string is not a valid ObjectId. Validate IDs with `mongoose.isValidObjectId()` before querying.',
  },
  // ── JWT / Token ────────────────────────────────────────────────────
  {
    priority: 65,
    pattern: /JsonWebTokenError|invalid token|jwt malformed/i,
    suggestion:
      'JWT Malformed/Invalid: The token cannot be verified. Ensure the correct JWT_SECRET is set and that the token has not been tampered with.',
  },
  {
    priority: 65,
    pattern: /TokenExpiredError|jwt expired/i,
    suggestion:
      'JWT Expired: The access token has expired. Implement a refresh-token flow or prompt the user to re-authenticate.',
  },
  // ── Syntax / Type Errors ───────────────────────────────────────────
  {
    priority: 60,
    pattern: /SyntaxError/i,
    suggestion:
      'Syntax Error: Malformed JSON or invalid code syntax. Verify the request Content-Type is application/json and the body is well-formed.',
  },
  {
    priority: 60,
    pattern: /TypeError/i,
    suggestion:
      'Type Error: An operation was performed on a value of the wrong type. Add runtime type checks or strengthen TypeScript typings.',
  },
  // ── Memory / Resources ─────────────────────────────────────────────
  {
    priority: 60,
    pattern: /heap out of memory|out of memory/i,
    suggestion:
      'Out of Memory: The Node.js process ran out of heap space. Profile memory usage, fix memory leaks, or increase the --max-old-space-size flag.',
  },
  // ── Validation Libraries ───────────────────────────────────────────
  {
    priority: 55,
    pattern: /ValidationError|validation failed/i,
    suggestion:
      'Validation Error: Input data failed schema validation (e.g. Mongoose or Zod). Review required fields and data constraints, and return descriptive error messages to the caller.',
  },
];

// Sort rules by priority once at module load
const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

/**
 * Analyse error context and return a human-readable root cause suggestion.
 */
export function analyseRootCause(input: RuleInput): string {
  for (const rule of sortedRules) {
    const { pattern } = rule;

    if (typeof pattern === 'function') {
      if (pattern(input)) return rule.suggestion;
      continue;
    }

    // RegExp — test against errorMessage + stackTrace
    const text = `${input.errorMessage || ''} ${input.stackTrace || ''}`;
    if (pattern.test(text)) return rule.suggestion;
  }

  // Generic fallback based on status code range
  if (input.statusCode) {
    if (input.statusCode >= 500)
      return 'Server-side error: Review server logs and stack trace to identify the unhandled exception.';
    if (input.statusCode >= 400)
      return 'Client-side error: The request was rejected by the server. Validate request parameters, headers, and authentication.';
  }

  return 'No specific pattern matched. Review the full stack trace and server logs for more context.';
}

/**
 * Generate a stable group key for deduplicating similar errors.
 * Groups by endpoint + normalised error message.
 */
export function buildGroupKey(endpoint: string, errorMessage?: string): string {
  const normalisedError = (errorMessage || 'no-error')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .substring(0, 80)
    .trim();
  return `${endpoint}::${normalisedError}`;
}
