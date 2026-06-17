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
 */
export default function TierProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<PlanId>('free');
  const [status, setStatus] = useState<SubscriptionStatus>('none');
  const [loading, setLoading] = useState(true);

  const refresh = () => {
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
  }, []);

  return (
    <TierContext.Provider value={{ plan, status, loading, refresh }}>
      {children}
    </TierContext.Provider>
  );
}
