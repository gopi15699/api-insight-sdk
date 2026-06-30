import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolve a safe post-auth redirect from the current URL's `next` param.
 * Only same-origin relative paths are allowed (must start with a single `/`),
 * preventing open-redirects. Falls back to `/dashboard`.
 */
export function getNextPath(fallback = '/dashboard'): string {
  if (typeof window === 'undefined') return fallback;
  const next = new URLSearchParams(window.location.search).get('next');
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return fallback;
}
