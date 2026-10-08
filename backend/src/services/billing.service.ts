import Stripe from 'stripe';
import { env, billingEnabled } from '../config/env';
import {
  PLANS,
  PAID_PLANS,
  PlanId,
  BillingCycle,
  resolveStripePriceId,
} from '../config/plans';
import { User, IUser, SubscriptionStatus } from '../models/User';
import { createError } from '../middleware/errorHandler';

let client: Stripe | null = null;

/** Lazily construct the Stripe client; throws (502) if billing isn't configured. */
const getClient = (): Stripe => {
  if (!billingEnabled) {
    throw createError('Billing is not configured on this server', 502);
  }
  if (!client) {
    // Non-null: billingEnabled guarantees STRIPE_SECRET_KEY is set.
    client = new Stripe(env.STRIPE_SECRET_KEY as string);
  }
  return client;
};

/** Reverse-map a Stripe Price id back to our internal plan + cycle. */
const planFromPriceId = (
  priceId: string | undefined
): { plan: PlanId; cycle: BillingCycle } | undefined => {
  if (!priceId) return undefined;
  for (const plan of PAID_PLANS) {
    const ids = PLANS[plan].stripePriceId;
    if (ids.monthly === priceId) return { plan, cycle: 'monthly' };
    if (ids.yearly === priceId) return { plan, cycle: 'yearly' };
  }
  return undefined;
};

/** Map a Stripe subscription status to our internal lifecycle. */
const mapStatus = (status: Stripe.Subscription.Status): SubscriptionStatus => {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
    case 'paused':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'cancelled';
    default:
      return 'created';
  }
};

/** Ensure the user has a Stripe customer, creating and persisting one if not. */
const ensureCustomer = async (user: IUser): Promise<string> => {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const stripe = getClient();
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: String(user._id) },
  });

  user.stripeCustomerId = customer.id;
  await user.save();
  return customer.id;
};

/**
 * Create a Stripe Checkout Session for a user on a paid plan and return the
 * hosted-checkout URL the frontend should redirect to. Activation remains
 * driven by webhooks — this only puts the user into the `created` state.
 */
export const createCheckoutSession = async (
  user: IUser,
  plan: PlanId,
  cycle: BillingCycle
): Promise<{ url: string }> => {
  if (!PAID_PLANS.includes(plan)) {
    throw createError(`Plan '${plan}' is not a paid plan`, 400);
  }

  const priceId = resolveStripePriceId(plan, cycle);
  if (!priceId) {
    throw createError(`Stripe price id for ${plan}/${cycle} is not configured`, 502);
  }

  const stripe = getClient();
  const customerId = await ensureCustomer(user);
  const metadata = { userId: String(user._id), plan, cycle };

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${env.FRONTEND_URL}/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.FRONTEND_URL}/billing?status=cancelled`,
    client_reference_id: String(user._id),
    metadata,
    // Propagate metadata onto the subscription so later webhook events carry it.
    subscription_data: { metadata },
  });

  if (!session.url) {
    throw createError('Failed to create checkout session', 502);
  }

  user.billingCycle = cycle;
  user.subscriptionStatus = 'created';
  await user.save();

  return { url: session.url };
};

/** Cancel a user's subscription at the end of the current billing period. */
export const cancelSubscription = async (user: IUser) => {
  if (!user.stripeSubscriptionId) {
    throw createError('No active subscription to cancel', 400);
  }
  const stripe = getClient();

  // cancel_at_period_end: keep access until currentPeriodEnd, then drop to free.
  await stripe.subscriptions.update(user.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  user.subscriptionStatus = 'cancelled';
  await user.save();

  return { status: user.subscriptionStatus, accessUntil: user.currentPeriodEnd };
};

/**
 * Verify and parse a Stripe webhook payload. Throws if the signature is invalid.
 * Stripe's SDK does the constant-time signature comparison for us.
 */
export const constructWebhookEvent = (rawBody: Buffer | string, signature: string): Stripe.Event => {
  const stripe = getClient();
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw createError('Webhook secret not configured', 502);
  }
  return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
};

/** Reset an account back to the free tier and clear subscription state. */
const downgradeToFree = (user: IUser): void => {
  user.plan = 'free';
  user.subscriptionStatus = 'none';
  user.stripeSubscriptionId = undefined;
  user.billingCycle = undefined;
  user.currentPeriodEnd = undefined;
};

/** Locate the user a subscription belongs to (by sub id, then customer id). */
const findUserForSubscription = async (
  sub: Stripe.Subscription
): Promise<IUser | null> => {
  const metaUserId = sub.metadata?.userId;
  if (metaUserId) {
    const byMeta = await User.findById(metaUserId);
    if (byMeta) return byMeta;
  }
  const bySub = await User.findOne({ stripeSubscriptionId: sub.id });
  if (bySub) return bySub;
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  if (customerId) return User.findOne({ stripeCustomerId: customerId });
  return null;
};

/** Apply the current state of a Stripe subscription to the matching user. */
const applySubscription = async (sub: Stripe.Subscription): Promise<void> => {
  const user = await findUserForSubscription(sub);
  if (!user) {
    console.warn(`[billing] subscription ${sub.id} has no matching user`);
    return;
  }

  const priceId = sub.items?.data?.[0]?.price?.id;
  const resolved = planFromPriceId(priceId);
  const status = mapStatus(sub.status);

  user.stripeSubscriptionId = sub.id;
  if (typeof sub.customer === 'string') user.stripeCustomerId = sub.customer;
  user.subscriptionStatus = status;
  if (sub.current_period_end) {
    user.currentPeriodEnd = new Date(sub.current_period_end * 1000);
  }
  if (resolved) user.billingCycle = resolved.cycle;

  if (status === 'active' && resolved) {
    user.plan = resolved.plan;
  } else if (status === 'cancelled') {
    // Access retained until period end; drop to free once it has passed.
    if (!user.currentPeriodEnd || user.currentPeriodEnd <= new Date()) {
      downgradeToFree(user);
    }
  }

  await user.save();
  console.log(
    `[billing] sub ${sub.id} (${sub.status}) → user ${user.id} plan=${user.plan} status=${user.subscriptionStatus}`
  );
};

/**
 * Handle a verified Stripe webhook event. Idempotent — safe for redeliveries.
 * @see https://stripe.com/docs/billing/subscriptions/webhooks
 */
export const handleStripeEvent = async (event: Stripe.Event): Promise<void> => {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription' || !session.subscription) break;
      const stripe = getClient();
      const subId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id;
      const sub = await stripe.subscriptions.retrieve(subId);
      await applySubscription(sub);
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.resumed':
    case 'customer.subscription.paused': {
      await applySubscription(event.data.object as Stripe.Subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const user = await findUserForSubscription(sub);
      if (user) {
        downgradeToFree(user);
        await user.save();
        console.log(`[billing] sub ${sub.id} deleted → user ${user.id} downgraded to free`);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subId =
        typeof (invoice as { subscription?: unknown }).subscription === 'string'
          ? ((invoice as { subscription?: string }).subscription as string)
          : undefined;
      if (subId) {
        const user = await User.findOne({ stripeSubscriptionId: subId });
        if (user) {
          user.subscriptionStatus = 'past_due';
          await user.save();
          console.log(`[billing] payment failed → user ${user.id} past_due`);
        }
      }
      break;
    }

    default:
      // Unhandled event types are acknowledged (200) without action.
      break;
  }
};
