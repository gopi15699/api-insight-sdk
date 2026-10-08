/**
 * Endpoint normalisation.
 *
 * Collapses dynamic path segments (numeric IDs, Mongo ObjectIds, UUIDs, long
 * hex/opaque tokens) to a `:id` placeholder so that `/users/1`, `/users/2` and
 * `/users/999` are treated as a SINGLE endpoint `/users/:id`.
 *
 * Why it matters:
 *  - Plan `maxEndpoints` limits count distinct endpoints — without this, every
 *    unique resource id would count as its own endpoint and exhaust the cap.
 *  - Error grouping dedupes by endpoint — without this, the same failing route
 *    fragments into one group per id.
 *
 * The matchers are intentionally conservative and explicit to avoid collapsing
 * legitimate static segments (e.g. `/v1`, `/health`, `/users`).
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OBJECT_ID = /^[0-9a-f]{24}$/i;
const ALL_DIGITS = /^\d+$/;
const LONG_HEX = /^[0-9a-f]{32,}$/i;

/** True when a single path segment looks like a dynamic identifier. */
function isDynamicSegment(seg: string): boolean {
  if (ALL_DIGITS.test(seg)) return true;
  if (UUID.test(seg)) return true;
  if (OBJECT_ID.test(seg)) return true;
  if (LONG_HEX.test(seg)) return true;
  // Opaque tokens: long AND containing at least one digit (e.g. api keys,
  // base64url ids). Threshold is high to avoid matching real words.
  if (seg.length >= 20 && /\d/.test(seg)) return true;
  return false;
}

/**
 * Normalise a request path to a stable route pattern.
 * Strips any query string, collapses dynamic segments to `:id`, and removes a
 * trailing slash (except for the root path).
 */
export function normalizeEndpoint(path: string): string {
  if (!path) return '/';

  // Drop query string / hash if a full URL or path+query was passed.
  const clean = path.split('?')[0].split('#')[0];

  const segments = clean.split('/');
  const normalized = segments
    .map((seg) => (seg && isDynamicSegment(seg) ? ':id' : seg))
    .join('/');

  // Remove trailing slash, but keep the root '/'.
  if (normalized.length > 1 && normalized.endsWith('/')) {
    return normalized.slice(0, -1);
  }
  return normalized || '/';
}
