'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, Sparkles, AlertTriangle, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/store/hooks';
import { useTier } from '@/components/providers/TierProvider';
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

// Display order + taglines for the three self-serve tiers.
const TIER_ORDER: PlanId[] = ['free', 'pro', 'ultra'];
const TAGLINE: Record<PlanId, string> = {
  free: 'For side projects',
  pro: 'For growing teams',
  ultra: 'For scale & mission-critical APIs',
};

const STATUS_LABEL: Record<string, string> = {
  none: 'Free',
  created: 'Pending payment',
  active: 'Active',
  past_due: 'Past due',
  cancelled: 'Cancelling',
};

function fmtLimit(v: number | null, noun: string) {
  return v === null ? `Unlimited ${noun}` : `${v} ${noun}${v === 1 ? '' : 's'}`;
}

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        {TIER_ORDER.map((id) => {
          const p = plans.find((pl) => pl.id === id);
          if (!p) return null;

          const price = cycle === 'yearly' ? p.price.yearly : p.price.monthly;
          const per = cycle === 'yearly' ? 'yr' : 'mo';
          const isActive = sub?.subscriptionStatus === 'active';
          const isCurrent = currentPlan === id && (id === 'free' ? true : isActive);
          const features = [
            fmtLimit(p.limits.maxProjects, 'project'),
            fmtLimit(p.limits.maxEndpoints, 'endpoint'),
            `${p.limits.retentionDays}-day retention`,
          ];

          // ── Ultra — ultra-premium animated gold card ──────────────────────
          if (id === 'ultra') {
            return (
              <div key={id} className="relative">
                <div className="ultra-glow pointer-events-none absolute -inset-3 rounded-[1.4rem] bg-amber-500/20 blur-2xl" />
                <div className="ultra-card flex h-full flex-col shadow-[0_0_60px_-12px_rgba(245,158,11,0.5)]">
                  <div className="flex flex-1 flex-col p-7">
                    <span className="absolute right-4 top-4 rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                      Ultimate
                    </span>
                    <div className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-amber-400" />
                      <h3 className="text-lg font-bold text-white">{p.name}</h3>
                    </div>
                    <p className="mt-1 text-sm text-amber-200/60">{TAGLINE.ultra}</p>
                    <p className="mt-3 text-3xl font-bold">
                      <span className="text-shimmer-gold">₹{price.toLocaleString()}</span>
                      <span className="text-base font-normal text-slate-500"> / {per}</span>
                    </p>
                    <ul className="my-6 flex-1 space-y-2.5 text-sm text-slate-200">
                      {features.map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-amber-400" />{f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      disabled={isCurrent || busy !== null || !sub?.billingEnabled}
                      onClick={() => handleUpgrade('ultra')}
                      className="w-full bg-gradient-to-r from-amber-400 to-amber-500 font-semibold text-amber-950 shadow-lg shadow-amber-500/30 hover:from-amber-300 hover:to-amber-400 disabled:opacity-60"
                    >
                      {isCurrent ? 'Current plan' : busy === 'ultra' ? 'Starting…' : 'Upgrade to Ultra'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          }

          // ── Free (plain) + Pro (slightly premium) ─────────────────────────
          const isPro = id === 'pro';
          return (
            <Card
              key={id}
              className={`relative flex flex-col ${
                isPro
                  ? 'border-violet-500/50 bg-gradient-to-b from-violet-950/40 to-slate-900 shadow-lg shadow-violet-900/30'
                  : 'border-slate-800 bg-slate-900'
              }`}
            >
              {isPro && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white shadow">
                  Most popular
                </span>
              )}
              <CardHeader>
                <div className="flex items-center gap-2">
                  {isPro && <Sparkles className="h-4 w-4 text-violet-400" />}
                  <CardTitle className="text-white">{p.name}</CardTitle>
                </div>
                <p className={`text-sm ${isPro ? 'text-violet-200/70' : 'text-slate-400'}`}>{TAGLINE[id]}</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  ₹{price.toLocaleString()}
                  <span className="text-base font-normal text-slate-500"> / {id === 'free' ? 'forever' : per}</span>
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="space-y-2.5 text-sm text-slate-300">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className={`h-4 w-4 ${isPro ? 'text-violet-400' : 'text-emerald-400'}`} />{f}
                    </li>
                  ))}
                </ul>
                <Button
                  disabled={id === 'free' || isCurrent || busy !== null || !sub?.billingEnabled}
                  onClick={() => { if (isPro) handleUpgrade('pro'); }}
                  className={`mt-6 w-full ${
                    isPro ? 'bg-violet-600 text-white hover:bg-violet-500' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  } disabled:opacity-60`}
                >
                  {id === 'free'
                    ? (isCurrent ? 'Current plan' : 'Included')
                    : (isCurrent ? 'Current plan' : busy === 'pro' ? 'Starting…' : 'Upgrade to Pro')}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
