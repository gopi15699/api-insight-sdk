import Razorpay from 'razorpay';
import { env, billingEnabled } from '../config/env';
import {
  PAID_PLANS,
  PlanId,
  BillingCycle,
  resolveRazorpayPlanId,
} from '../config/plans';
import { User, IUser, SubscriptionStatus } from '../models/User';
import { createError } from '../middleware/errorHandler';

/**
 * Number of billing cycles to authorise up front. Razorpay requires a finite
 * total_count; we set it high enough to be effectively "until cancelled".
 */
const TOTAL_COUNT: Record<BillingCycle, number> = {
  monthly: 120, // 10 years of monthly charges
  yearly: 10,   // 10 years of yearly charges
};

let client: Razorpay | null = null;

/** Lazily construct the Razorpay client; throws (502) if billing isn't configured. */
const getClient = (): Razorpay => {
  if (!billingEnabled) {
    throw createError('Billing is not configured on this server', 502);
  }
  if (!client) {
    client = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return client;
};

/**
 * Create (or reuse) a Razorpay subscription for a user on a paid plan.
 * Returns the data the frontend Checkout needs. Source of truth for activation
 * remains the webhook — this only puts the user into the `created` state.
 */
export const createSubscription = async (
  user: IUser,
  plan: PlanId,
  cycle: BillingCycle
) => {
  if (!PAID_PLANS.includes(plan)) {
    throw createError(`Plan '${plan}' is not a paid plan`, 400);
  }

  const razorpayPlanId = resolveRazorpayPlanId(plan, cycle);
  if (!razorpayPlanId) {
    throw createError(
      `Razorpay plan id for ${plan}/${cycle} is not configured`,
      502
    );
  }

  const rzp = getClient();

  const subscription = await rzp.subscriptions.create({
    plan_id: razorpayPlanId,
    total_count: TOTAL_COUNT[cycle],
    customer_notify: 1,
    notes: { userId: String(user._id), plan, cycle },
  });

  // Persist intent so the webhook can match this subscription back to the user.
  user.razorpaySubscriptionId = subscription.id;
  user.billingCycle = cycle;
  user.subscriptionStatus = 'created';
  // Stash the target plan in notes-driven webhook handling; also store now so a
  // fast client-side confirmation can read it. Plan only becomes effective on
  // `active`.
  await user.save();

  return {
    subscriptionId: subscription.id,
    keyId: env.RAZORPAY_KEY_ID,
    planId: razorpayPlanId,
    plan,
    cycle,
  };
};

/** Cancel a user's subscription at the end of the current billing cycle. */
export const cancelSubscription = async (user: IUser) => {
  if (!user.razorpaySubscriptionId) {
    throw createError('No active subscription to cancel', 400);
  }
  const rzp = getClient();

  // cancel_at_cycle_end: keep access until currentPeriodEnd, then drop to free.
  await rzp.subscriptions.cancel(user.razorpaySubscriptionId, true);

  user.subscriptionStatus = 'cancelled';
  await user.save();

  return { status: user.subscriptionStatus, accessUntil: user.currentPeriodEnd };
};

/** Verify a Razorpay webhook payload against the configured signing secret. */
export const verifyWebhookSignature = (
  rawBody: string,
  signature: string
): boolean => {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  try {
    return Razorpay.validateWebhookSignature(
      rawBody,
      signature,
      env.RAZORPAY_WEBHOOK_SECRET
    );
  } catch {
    return false;
  }
};

interface RazorpaySubscriptionEntity {
  id: string;
  status: string;
  current_end?: number; // unix seconds
  plan_id?: string;
  notes?: Record<string, string>;
}

/** Map a Razorpay subscription status to our internal lifecycle. */
const mapStatus = (rzpStatus: string): SubscriptionStatus => {
  switch (rzpStatus) {
    case 'active':
    case 'authenticated':
      return 'active';
    case 'halted':
    case 'pending':
      return 'past_due';
    case 'cancelled':
    case 'completed':
    case 'expired':
      return 'cancelled';
    default:
      return 'created';
  }
};

/** Reset an account back to the free tier and clear subscription state. */
const downgradeToFree = (user: IUser): void => {
  user.plan = 'free';
  user.subscriptionStatus = 'none';
  user.razorpaySubscriptionId = undefined;
  user.billingCycle = undefined;
  user.currentPeriodEnd = undefined;
};

/**
 * Apply a Razorpay `subscription.*` webhook event to the matching user.
 * Handles each lifecycle event explicitly and is idempotent — safe to call
 * for redelivered events.
 *
 * @see https://razorpay.com/docs/webhooks/payloads/subscriptions/
 */
export const handleSubscriptionEvent = async (
  event: string,
  subscription: RazorpaySubscriptionEntity
): Promise<void> => {
  const user = await User.findOne({ razorpaySubscriptionId: subscription.id });
  if (!user) {
    console.warn(`[billing] ${event} for unknown subscription ${subscription.id}`);
    return;
  }

  const targetPlan = subscription.notes?.plan as PlanId | undefined;
  const periodEnd = subscription.current_end
    ? new Date(subscription.current_end * 1000)
    : undefined;

  switch (event) {
    case 'subscription.authenticated':
      // Authorisation payment captured; plan not yet live.
      user.subscriptionStatus = 'created';
      break;

    case 'subscription.activated':
    case 'subscription.charged':
      // Activated (first cycle) or renewed (subsequent cycles): plan is live
      // and the access window extends to the new period end.
      user.subscriptionStatus = 'active';
      if (targetPlan) user.plan = targetPlan;
      if (periodEnd) user.currentPeriodEnd = periodEnd;
      break;

    case 'subscription.pending':
    case 'subscription.halted':
      // A charge failed / Razorpay is retrying — keep the plan but flag it.
      user.subscriptionStatus = 'past_due';
      if (periodEnd) user.currentPeriodEnd = periodEnd;
      break;

    case 'subscription.cancelled':
      // Cancelled — retain access until the period end, then drop to free.
      user.subscriptionStatus = 'cancelled';
      if (periodEnd) user.currentPeriodEnd = periodEnd;
      if (!user.currentPeriodEnd || user.currentPeriodEnd <= new Date()) {
        downgradeToFree(user);
      }
      break;

    case 'subscription.completed':
    case 'subscription.expired':
      // Terminal — the subscription is over.
      downgradeToFree(user);
      break;

    default:
      // Any other subscription.* event — record status best-effort.
      user.subscriptionStatus = mapStatus(subscription.status);
  }

  await user.save();
  console.log(
    `[billing] ${event} → user ${user.id} plan=${user.plan} status=${user.subscriptionStatus}`
  );
};
