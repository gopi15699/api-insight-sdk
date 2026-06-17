'use client';
import { Check, Sparkles, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlanCatalogEntry, PlanId, BillingCycle } from '@/lib/billing';

// Display order + taglines for the three self-serve tiers.
export const TIER_ORDER: PlanId[] = ['free', 'pro', 'ultra'];
export const TAGLINE: Record<PlanId, string> = {
  free: 'For side projects',
  pro: 'For growing teams',
  ultra: 'For scale & mission-critical APIs',
};

export function fmtLimit(v: number | null, noun: string) {
  return v === null ? `Unlimited ${noun}` : `${v} ${noun}${v === 1 ? '' : 's'}`;
}

interface PlanCardsProps {
  plans: PlanCatalogEntry[];
  cycle: BillingCycle;
  currentPlan: PlanId;
  isActiveSub: boolean;
  billingEnabled: boolean;
  busy: PlanId | null;
  onUpgrade: (plan: PlanId) => void;
}

/** The three tiered pricing cards (Free plain, Pro premium, Ultra ultra-premium). */
export default function PlanCards({
  plans,
  cycle,
  currentPlan,
  isActiveSub,
  billingEnabled,
  busy,
  onUpgrade,
}: PlanCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
      {TIER_ORDER.map((id) => {
        const p = plans.find((pl) => pl.id === id);
        if (!p) return null;

        const price = cycle === 'yearly' ? p.price.yearly : p.price.monthly;
        const per = cycle === 'yearly' ? 'yr' : 'mo';
        const isCurrent = currentPlan === id && (id === 'free' ? true : isActiveSub);
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
                    disabled={isCurrent || busy !== null || !billingEnabled}
                    onClick={() => onUpgrade('ultra')}
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
                disabled={id === 'free' || isCurrent || busy !== null || !billingEnabled}
                onClick={() => { if (isPro) onUpgrade('pro'); }}
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
  );
}
