'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/store/hooks';
import { useTier } from '@/components/providers/TierProvider';
import PlanCards from '@/components/billing/PlanCards';
import {
  getPlans,
  getSubscription,
  createSubscription,
  cancelSubscription,
  loadRazorpayCheckout,
  openCheckout,
  type PlanCatalogEntry,
  type SubscriptionInfo,
  type PlanId,
  type BillingCycle,
} from '@/lib/billing';

const STATUS_LABEL: Record<string, string> = {
  none: 'Free',
  created: 'Pending payment',
  active: 'Active',
  past_due: 'Past due',
  cancelled: 'Cancelling',
};

export default function BillingPage() {
  const { user } = useAuth();
  const { refresh: refreshTier } = useTier();
  const [plans, setPlans] = useState<PlanCatalogEntry[]>([]);
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [busy, setBusy] = useState<PlanId | null>(null);

  const refresh = async () => {
    const [cat, s] = await Promise.all([getPlans(), getSubscription()]);
    setPlans(cat.plans);
    setSub(s);
  };

  useEffect(() => {
    // Honor ?cycle=yearly|monthly from a pricing-page deep link.
    const q = new URLSearchParams(window.location.search).get('cycle');
    if (q === 'yearly' || q === 'monthly') setCycle(q);

    refresh()
      .catch(() => toast.error('Failed to load billing info'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (plan: PlanId) => {
    if (!sub?.billingEnabled) {
      toast.error('Billing is not configured on the server yet.');
      return;
    }
    setBusy(plan);
    try {
      const ready = await loadRazorpayCheckout();
      if (!ready) throw new Error('Could not load Razorpay Checkout');

      const order = await createSubscription(plan, cycle);
      await openCheckout({
        keyId: order.keyId,
        subscriptionId: order.subscriptionId,
        plan,
        cycle,
        user: { name: user?.name, email: user?.email },
      });

      toast.success('Payment received — activating your plan…');
      // Webhook is the source of truth; give it a moment, then refetch both the
      // page state and the global tier so the whole dashboard re-themes.
      setTimeout(() => {
        refresh().catch(() => {});
        refreshTier();
      }, 2500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message || (err as Error)?.message || 'Upgrade failed';
      if (msg !== 'Checkout cancelled') toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel your subscription? You keep access until the end of the billing period.')) return;
    try {
      await cancelSubscription();
      toast.success('Subscription will cancel at period end');
      await refresh();
    } catch {
      toast.error('Failed to cancel');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 bg-slate-800" />
        <Skeleton className="h-32 bg-slate-800 rounded-xl" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-72 bg-slate-800 rounded-xl" />
          <Skeleton className="h-72 bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  const currentPlan = sub?.plan ?? 'free';

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing & Plan</h1>
        <p className="text-slate-400 text-sm mt-1">Upgrade to monitor more projects and endpoints with longer retention.</p>
      </div>

      {sub && !sub.billingEnabled && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-600/30 bg-amber-950/20 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200">
            <p className="font-medium">Payments not configured</p>
            <p className="text-amber-200/70 mt-0.5">
              Add your Razorpay keys to the backend (see <code className="text-amber-100">BILLING.md</code>) to enable upgrades.
            </p>
          </div>
        </div>
      )}

      {/* Current plan summary */}
      {sub && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-white capitalize">{currentPlan} plan</CardTitle>
              <Badge
                className={
                  sub.subscriptionStatus === 'active'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : sub.subscriptionStatus === 'past_due'
                    ? 'bg-red-500/15 text-red-300 border-red-500/30'
                    : 'bg-slate-700/40 text-slate-300 border-slate-600/40'
                }
              >
                {STATUS_LABEL[sub.subscriptionStatus] ?? sub.subscriptionStatus}
              </Badge>
            </div>
            {sub.subscriptionStatus === 'active' && (
              <Button variant="outline" onClick={handleCancel}
                className="border-slate-700 text-slate-300 hover:bg-slate-800">
                Cancel plan
              </Button>
            )}
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Projects</p>
              <p className="text-white font-medium mt-0.5">
                {sub.usage.projects} / {sub.limits.maxProjects ?? '∞'}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Endpoints</p>
              <p className="text-white font-medium mt-0.5">{sub.limits.maxEndpoints ?? '∞'}</p>
            </div>
            <div>
              <p className="text-slate-500">Retention</p>
              <p className="text-white font-medium mt-0.5">{sub.limits.retentionDays} days</p>
            </div>
            <div>
              <p className="text-slate-500">Renews / ends</p>
              <p className="text-white font-medium mt-0.5">
                {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing cycle toggle */}
      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        <button onClick={() => setCycle('monthly')}
          className={`text-sm font-medium px-5 py-2 rounded-lg transition-all ${cycle === 'monthly' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
          Monthly
        </button>
        <button onClick={() => setCycle('yearly')}
          className={`text-sm font-medium px-5 py-2 rounded-lg transition-all flex items-center gap-2 ${cycle === 'yearly' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
          Yearly <span className="text-xs text-emerald-400">-20%</span>
        </button>
      </div>

      {/* Plan cards */}
      <PlanCards
        plans={plans}
        cycle={cycle}
        currentPlan={currentPlan}
        isActiveSub={sub?.subscriptionStatus === 'active'}
        billingEnabled={!!sub?.billingEnabled}
        busy={busy}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}
