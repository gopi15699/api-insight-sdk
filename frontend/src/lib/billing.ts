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

interface CheckoutResponse {
  url: string;
}

export const getPlans = async (): Promise<{ plans: PlanCatalogEntry[]; billingEnabled: boolean }> => {
  const { data } = await api.get('/billing/plans');
  return data.data;
};

export const getSubscription = async (): Promise<SubscriptionInfo> => {
  const { data } = await api.get('/billing/subscription');
  return data.data;
};

/**
 * Create a Stripe Checkout Session and redirect the browser to Stripe's hosted
 * checkout page. On success/cancel Stripe returns the user to /billing.
 */
export const startCheckout = async (plan: PlanId, cycle: BillingCycle): Promise<void> => {
  const { data } = await api.post('/billing/subscribe', { plan, cycle });
  const { url } = data.data as CheckoutResponse;
  if (!url) throw new Error('No checkout URL returned');
  window.location.href = url;
};

export const cancelSubscription = async (): Promise<void> => {
  await api.post('/billing/cancel');
};
