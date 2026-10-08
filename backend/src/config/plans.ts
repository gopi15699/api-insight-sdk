import { env } from './env';

/**
 * Plan catalogue — the single source of truth for what each tier unlocks.
 *
 * These limits mirror the pricing cards on the marketing site and are enforced
 * server-side (project creation, log retention). Display prices are in whole
 * USD; the actual charge is driven by the Stripe Price identified by the
 * `stripePriceId` values below (created via `npm run seed:stripe` and injected
 * via env).
 */

export type PlanId = 'free' | 'pro' | 'ultra';
export type BillingCycle = 'monthly' | 'yearly';

export interface PlanLimits {
  /** Max projects a user may own. null = unlimited. */
  maxProjects: number | null;
  /** Max distinct endpoints monitored per project. null = unlimited. */
  maxEndpoints: number | null;
  /** Log retention window in days. */
  retentionDays: number;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  /** Display price (USD) per cycle. 0 for free. */
  price: { monthly: number; yearly: number };
  limits: PlanLimits;
  /** Stripe Price IDs per billing cycle. Empty for the free tier. */
  stripePriceId: { monthly: string; yearly: string };
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    limits: { maxProjects: 1, maxEndpoints: 5, retentionDays: 7 },
    stripePriceId: { monthly: '', yearly: '' },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    // Yearly = 10x monthly (2 months free).
    price: { monthly: 19, yearly: 190 },
    limits: { maxProjects: 5, maxEndpoints: 50, retentionDays: 30 },
    stripePriceId: {
      monthly: env.STRIPE_PRICE_PRO_MONTHLY,
      yearly: env.STRIPE_PRICE_PRO_YEARLY,
    },
  },
  ultra: {
    id: 'ultra',
    name: 'Ultra',
    price: { monthly: 49, yearly: 490 },
    limits: { maxProjects: null, maxEndpoints: null, retentionDays: 90 },
    stripePriceId: {
      monthly: env.STRIPE_PRICE_ULTRA_MONTHLY,
      yearly: env.STRIPE_PRICE_ULTRA_YEARLY,
    },
  },
};

/** Plans that can actually be subscribed to via Stripe (excludes free). */
export const PAID_PLANS: PlanId[] = ['pro', 'ultra'];

export const getPlan = (id: PlanId): PlanDefinition => PLANS[id];

/** Resolve the Stripe Price id for a tier + cycle, or undefined if unset/free. */
export const resolveStripePriceId = (
  plan: PlanId,
  cycle: BillingCycle
): string | undefined => {
  const id = PLANS[plan]?.stripePriceId[cycle];
  return id ? id : undefined;
};
