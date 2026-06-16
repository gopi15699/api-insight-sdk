import { env } from './env';

/**
 * Plan catalogue — the single source of truth for what each tier unlocks.
 *
 * These limits mirror the pricing cards on the marketing site and are enforced
 * server-side (project creation, log retention). Prices are in paise where
 * relevant but the actual charge is driven by the Razorpay plan, identified by
 * the `razorpayPlanId` values below (created once in the Razorpay dashboard and
 * injected via env).
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
  /** Display price (INR) per cycle. 0 for free. */
  price: { monthly: number; yearly: number };
  limits: PlanLimits;
  /** Razorpay plan IDs per billing cycle. Empty for the free tier. */
  razorpayPlanId: { monthly: string; yearly: string };
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    limits: { maxProjects: 1, maxEndpoints: 5, retentionDays: 7 },
    razorpayPlanId: { monthly: '', yearly: '' },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 500, yearly: 4800 },
    limits: { maxProjects: 5, maxEndpoints: 50, retentionDays: 30 },
    razorpayPlanId: {
      monthly: env.RAZORPAY_PLAN_PRO_MONTHLY,
      yearly: env.RAZORPAY_PLAN_PRO_YEARLY,
    },
  },
  ultra: {
    id: 'ultra',
    name: 'Ultra',
    price: { monthly: 1000, yearly: 9600 },
    limits: { maxProjects: null, maxEndpoints: null, retentionDays: 90 },
    razorpayPlanId: {
      monthly: env.RAZORPAY_PLAN_ULTRA_MONTHLY,
      yearly: env.RAZORPAY_PLAN_ULTRA_YEARLY,
    },
  },
};

/** Plans that can actually be subscribed to via Razorpay (excludes free). */
export const PAID_PLANS: PlanId[] = ['pro', 'ultra'];

export const getPlan = (id: PlanId): PlanDefinition => PLANS[id];

/** Resolve the Razorpay plan id for a tier + cycle, or undefined if unset/free. */
export const resolveRazorpayPlanId = (
  plan: PlanId,
  cycle: BillingCycle
): string | undefined => {
  const id = PLANS[plan]?.razorpayPlanId[cycle];
  return id ? id : undefined;
};
