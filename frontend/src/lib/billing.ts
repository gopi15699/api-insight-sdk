import api from './api';

export type PlanId = 'free' | 'pro' | 'ultra';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'none' | 'created' | 'active' | 'past_due' | 'cancelled';

export interface PlanLimits {
  maxProjects: number | null;
  maxEndpoints: number | null;
  retentionDays: number;
}

export interface PlanCatalogEntry {
  id: PlanId;
  name: string;
  price: { monthly: number; yearly: number };
  limits: PlanLimits;
}

export interface SubscriptionInfo {
  plan: PlanId;
  billingCycle: BillingCycle | null;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: string | null;
  limits: PlanLimits;
  usage: { projects: number };
  billingEnabled: boolean;
}

interface SubscribeResponse {
  subscriptionId: string;
  keyId: string;
  planId: string;
  plan: PlanId;
  cycle: BillingCycle;
}

export const getPlans = async (): Promise<{ plans: PlanCatalogEntry[]; billingEnabled: boolean }> => {
  const { data } = await api.get('/billing/plans');
  return data.data;
};

export const getSubscription = async (): Promise<SubscriptionInfo> => {
  const { data } = await api.get('/billing/subscription');
  return data.data;
};

export const createSubscription = async (
  plan: PlanId,
  cycle: BillingCycle
): Promise<SubscribeResponse> => {
  const { data } = await api.post('/billing/subscribe', { plan, cycle });
  return data.data;
};

export const cancelSubscription = async (): Promise<void> => {
  await api.post('/billing/cancel');
};

// ── Razorpay Checkout ─────────────────────────────────────────────────────────

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

declare global {
  interface Window {
    // Razorpay's checkout constructor is injected by the external script.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay?: any;
  }
}

/** Inject the Razorpay Checkout script once and resolve when ready. */
export const loadRazorpayCheckout = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = CHECKOUT_SRC;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export interface CheckoutResult {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

/**
 * Open Razorpay Checkout for a subscription. Resolves with the payment result
 * on success, or rejects if the user dismisses the modal.
 */
export const openCheckout = (
  opts: {
    keyId: string;
    subscriptionId: string;
    plan: PlanId;
    cycle: BillingCycle;
    user: { name?: string; email?: string };
  }
): Promise<CheckoutResult> =>
  new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: opts.keyId,
      subscription_id: opts.subscriptionId,
      name: 'API Insight',
      description: `${opts.plan.toUpperCase()} plan — billed ${opts.cycle}`,
      theme: { color: '#7c3aed' },
      prefill: { name: opts.user.name, email: opts.user.email },
      handler: (response: CheckoutResult) => resolve(response),
      modal: { ondismiss: () => reject(new Error('Checkout cancelled')) },
    });
    rzp.open();
  });
