import type { PlanId } from './billing';

/**
 * Visual treatment applied across the whole dashboard once a user is on a plan.
 * Free keeps the existing look; Pro is slightly premium (violet); Ultra is the
 * full premium treatment (gold + glow). Values are Tailwind class strings so
 * components stay declarative.
 */
export interface TierTheme {
  /** Sidebar logo tile background. */
  logoBox: string;
  /** Brand wordmark text classes. */
  brand: string;
  /** Active nav-item classes (overrides the default violet). */
  navActive: string;
  /** Small plan pill shown next to the wordmark, or null for Free. */
  badge: { label: string; className: string; crown?: boolean } | null;
  /** Extra classes for the sidebar <aside>. */
  sidebar: string;
  /** Ambient glow colour behind the main area, or '' for none. */
  ambient: string;
}

export const TIER_THEME: Record<PlanId, TierTheme> = {
  free: {
    logoBox: 'bg-violet-600',
    brand: 'text-white',
    navActive: 'bg-violet-600/20 text-violet-300 border-violet-600/30',
    badge: null,
    sidebar: 'bg-slate-900 border-slate-800',
    ambient: '',
  },
  pro: {
    logoBox: 'bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-600/40',
    brand: 'text-white',
    navActive: 'bg-violet-500/25 text-violet-200 border-violet-500/40',
    badge: {
      label: 'PRO',
      className: 'bg-violet-500/15 text-violet-300 border border-violet-500/40',
    },
    sidebar: 'bg-gradient-to-b from-violet-950/40 to-slate-900 border-violet-900/40',
    ambient: 'bg-violet-600/10',
  },
  ultra: {
    logoBox: 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/40',
    brand: 'text-shimmer-gold',
    navActive: 'bg-amber-500/15 text-amber-200 border-amber-500/40',
    badge: {
      label: 'ULTRA',
      className: 'bg-amber-500/15 text-amber-300 border border-amber-400/40',
      crown: true,
    },
    sidebar: 'bg-gradient-to-b from-amber-950/25 to-slate-900 border-amber-900/30',
    ambient: 'bg-amber-500/10',
  },
};
