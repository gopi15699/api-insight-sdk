'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { getSubscription, type PlanId, type SubscriptionStatus } from '@/lib/billing';

interface TierContextValue {
  plan: PlanId;
  status: SubscriptionStatus;
  loading: boolean;
  /** Refetch the plan (e.g. after an upgrade completes). */
  refresh: () => void;
}

const TierContext = createContext<TierContextValue>({
  plan: 'free',
  status: 'none',
  loading: true,
  refresh: () => {},
});

/** Access the current account's plan tier anywhere inside the dashboard. */
export const useTier = () => useContext(TierContext);

/**
 * Loads the account's plan once and exposes it to the dashboard so the whole UI
 * can reflect the tier. Falls back to `free` if billing can't be reached.
 *
 * `overridePlan` forces a tier and skips the network fetch — used by the
 * tier preview route (and handy for tests).
 */
export default function TierProvider({
  children,
  overridePlan,
}: {
  children: React.ReactNode;
  overridePlan?: PlanId;
}) {
  const [plan, setPlan] = useState<PlanId>(overridePlan ?? 'free');
  const [status, setStatus] = useState<SubscriptionStatus>(
    overridePlan && overridePlan !== 'free' ? 'active' : 'none'
  );
  const [loading, setLoading] = useState(!overridePlan);

  const refresh = () => {
    if (overridePlan) return;
    getSubscription()
      .then((s) => {
        setPlan(s.plan);
        setStatus(s.subscriptionStatus);
      })
      .catch(() => {
        /* keep defaults (free) when billing is unreachable */
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TierContext.Provider value={{ plan, status, loading, refresh }}>
      {children}
    </TierContext.Provider>
  );
}
