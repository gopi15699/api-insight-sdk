import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { PLANS, PlanId } from '../config/plans';
import { billingEnabled } from '../config/env';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { createError } from '../middleware/errorHandler';
import {
  createSubscription,
  cancelSubscription,
  verifyWebhookSignature,
  handleSubscriptionEvent,
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

/** Authed — create a Razorpay subscription; returns data for Checkout. */
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

    const result = await createSubscription(user, plan as PlanId, cycle);
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
 * Razorpay webhook. Mounted with a raw body parser so the signature can be
 * verified against the exact bytes Razorpay signed. Always 200s on success to
 * stop Razorpay retrying; 400 on a bad signature.
 */
export const webhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const rawBody = (req.body as Buffer)?.toString('utf8') ?? '';

    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      res.status(400).json({ success: false, message: 'Invalid signature' });
      return;
    }

    const payload = JSON.parse(rawBody) as {
      event: string;
      payload?: { subscription?: { entity?: unknown } };
    };

    const entity = payload.payload?.subscription?.entity;
    if (payload.event?.startsWith('subscription.') && entity) {
      await handleSubscriptionEvent(payload.event, entity as never);
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
