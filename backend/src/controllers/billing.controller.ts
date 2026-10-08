import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { PLANS, PlanId } from '../config/plans';
import { billingEnabled } from '../config/env';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { createError } from '../middleware/errorHandler';
import {
  createCheckoutSession,
  cancelSubscription,
  constructWebhookEvent,
  handleStripeEvent,
} from '../services/billing.service';

const SubscribeSchema = z.object({
  plan: z.enum(['pro', 'ultra']),
  cycle: z.enum(['monthly', 'yearly']),
});

/** Public — the plan catalogue (limits + display price) the pricing page uses. */
export const listPlans = (_req: Request, res: Response): void => {
  const plans = Object.values(PLANS).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    limits: p.limits,
  }));
  res.json({ success: true, data: { plans, billingEnabled } });
};

/** Authed — current user's subscription plus live usage (project count). */
export const getSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) throw createError('User not found', 404);

    const projectCount = await Project.countDocuments({ userId: user.id });
    const limits = PLANS[user.plan].limits;

    res.json({
      success: true,
      data: {
        plan: user.plan,
        billingCycle: user.billingCycle ?? null,
        subscriptionStatus: user.subscriptionStatus,
        currentPeriodEnd: user.currentPeriodEnd ?? null,
        limits,
        usage: { projects: projectCount },
        billingEnabled,
      },
    });
  } catch (err) {
    next(err);
  }
};

/** Authed — create a Stripe Checkout Session; returns the hosted-checkout URL. */
export const subscribe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { plan, cycle } = SubscribeSchema.parse(req.body);

    const user = await User.findById(req.user!.id);
    if (!user) throw createError('User not found', 404);

    if (user.plan === plan && user.subscriptionStatus === 'active') {
      throw createError(`You are already on the ${plan} plan`, 409);
    }

    const result = await createCheckoutSession(user, plan as PlanId, cycle);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/** Authed — cancel at the end of the current billing cycle. */
export const cancel = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) throw createError('User not found', 404);

    const result = await cancelSubscription(user);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * Stripe webhook. Mounted with a raw body parser so the signature can be
 * verified against the exact bytes Stripe signed. Always 200s on success to
 * stop Stripe retrying; 400 on a bad signature.
 */
export const webhook = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  const signature = req.headers['stripe-signature'] as string | undefined;
  if (!signature) {
    res.status(400).json({ success: false, message: 'Missing signature' });
    return;
  }

  let event;
  try {
    // req.body is a Buffer here (express.raw). Verify against the exact bytes.
    event = constructWebhookEvent(req.body as Buffer, signature);
  } catch (err) {
    console.error('[billing] webhook signature verification failed:', (err as Error).message);
    res.status(400).json({ success: false, message: 'Invalid signature' });
    return;
  }

  try {
    await handleStripeEvent(event);
    res.json({ received: true });
  } catch (err) {
    // Return 500 so Stripe retries a transient handler failure.
    console.error('[billing] webhook handler error:', (err as Error).message);
    res.status(500).json({ success: false, message: 'Webhook handler error' });
  }
};
