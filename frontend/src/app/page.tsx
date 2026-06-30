'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Activity, AlertTriangle, Zap,
  ArrowRight, Check, ChevronRight, Menu, X, Terminal,
} from 'lucide-react';
import { useGsapHero, useGsapReveal, useGsapSlide, useGsapScale } from '@/hooks/useGsapReveal';

/* ═══════════════════════════════════════════════════════════════════════════
   NAVBAR
═══════════════════════════════════════════════════════════════════════════ */
function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="p-1.5 bg-violet-600 rounded-md">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">API Insight</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7 text-sm text-slate-400">
          <a href="#platform"   className="hover:text-white transition-colors">Platform</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#pricing"    className="hover:text-white transition-colors">Pricing</a>
          <a href="#resources"  className="hover:text-white transition-colors">Docs</a>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login"    className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5">Sign in</Link>
          <Link href="/register" className="text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-lg transition-colors">
            Get started free
          </Link>
        </div>

        <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/8 bg-slate-950 px-5 py-5 space-y-4">
          {['Platform', 'How it works', 'Pricing', 'Docs'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`}
              className="block text-sm text-slate-400 hover:text-white py-1" onClick={() => setOpen(false)}>{l}</a>
          ))}
          <div className="pt-3 flex flex-col gap-3">
            <Link href="/login"    className="text-sm text-center text-slate-300 border border-slate-700 rounded-lg py-2.5 hover:bg-slate-800 transition-colors">Sign in</Link>
            <Link href="/register" className="text-sm text-center text-white bg-violet-600 hover:bg-violet-500 rounded-lg py-2.5 transition-colors">Get started free</Link>
          </div>
        </div>
      )}
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HERO  — full-width dark, centered text + dashboard screenshot
═══════════════════════════════════════════════════════════════════════════ */
function Hero() {
  const heroRef = useGsapHero();
  return (
    <section className="relative overflow-hidden bg-slate-950 pt-20 pb-0 sm:pt-28">
      {/* Glow blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-violet-600/12 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-40 right-0 w-[500px] h-[400px] bg-blue-600/8 rounded-full blur-[100px] pointer-events-none" />
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(#a78bfa 1px, transparent 1px), linear-gradient(90deg, #a78bfa 1px, transparent 1px)', backgroundSize: '72px 72px' }} />

      <div ref={heroRef} className="relative max-w-5xl mx-auto px-5 sm:px-8 text-center">
        {/* Pill badge */}
        <div data-gsap="hero" className="inline-flex items-center gap-2 bg-violet-600/15 border border-violet-500/25 rounded-full px-4 py-1.5 text-xs font-medium text-violet-300 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Now with AI-powered root cause analysis
          <ChevronRight className="h-3 w-3 opacity-60" />
        </div>

        <h1 data-gsap="hero" className="text-4xl sm:text-5xl lg:text-[64px] font-bold text-white leading-[1.1] tracking-tight">
          Intelligent API monitoring<br />
          <span className="text-shimmer">before issues hit users</span>
        </h1>

        <p data-gsap="hero" className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Capture every failure, pinpoint the root cause, and fix it — all from one dashboard.
          Two lines of middleware. No configuration overload.
        </p>

        <div data-gsap="hero" className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold h-12 px-8 rounded-xl text-base shadow-xl shadow-violet-600/30 hover:shadow-violet-600/50 transition-all duration-200 hover:-translate-y-0.5">
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#how-it-works"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white h-12 px-8 rounded-xl text-base bg-transparent transition-all duration-200 hover:bg-slate-800/50">
            See how it works
          </a>
        </div>

        <p data-gsap="hero" className="mt-5 text-xs text-slate-600">
          Free forever for small projects · No credit card required · Setup in &lt;2 minutes
        </p>

        {/* ── Dashboard preview screenshot ── */}
        <div data-gsap="hero" className="mt-16 relative">
          {/* Gradient fade at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent z-10 pointer-events-none rounded-b-xl" />

          <div className="rounded-t-2xl border border-slate-800 border-b-0 bg-slate-900/80 overflow-hidden shadow-2xl shadow-slate-950 ring-1 ring-white/5">
            {/* Window chrome */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/70" />
                <span className="w-3 h-3 rounded-full bg-amber-500/70" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
              </div>
              <div className="flex items-center gap-2 bg-slate-800 rounded-md px-3 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-slate-400 font-mono">app.apiinsight.dev/dashboard</span>
              </div>
              <div className="w-16" />
            </div>

            {/* Stat bar */}
            <div className="grid grid-cols-4 divide-x divide-slate-800 border-b border-slate-800">
              {[
                { label: 'Total Requests', value: '1.2M', trend: '+12%', up: true },
                { label: 'Error Rate',     value: '0.4%', trend: '-0.1%', up: false },
                { label: 'Avg Response',   value: '142ms', trend: '-8ms', up: false },
                { label: 'Active Projects', value: '7',   trend: null, up: null },
              ].map(({ label, value, trend, up }) => (
                <div key={label} className="px-5 py-4">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className="text-xl font-bold text-white">{value}</p>
                  {trend && <p className={`text-xs mt-0.5 ${up ? 'text-emerald-400' : 'text-red-400'}`}>{trend} vs last week</p>}
                </div>
              ))}
            </div>

            {/* Log rows */}
            <div className="divide-y divide-slate-800/60">
              {[
                { code: 500, method: 'POST', path: '/api/payments/charge',    ms: 8420, time: '2s ago',   cause: 'Database connection timeout — check pool size or MONGO_URI' },
                { code: 401, method: 'GET',  path: '/api/users/me',           ms: 12,   time: '14s ago',  cause: 'JWT signature invalid — token expired or wrong secret' },
                { code: 422, method: 'POST', path: '/api/orders',             ms: 95,   time: '1m ago',   cause: 'Validation failed — required field `customerId` is missing' },
                { code: 429, method: 'GET',  path: '/api/products?page=1',    ms: 3,    time: '3m ago',   cause: 'Rate limit hit — add exponential back-off on the client' },
                { code: 503, method: 'POST', path: '/api/notifications/send', ms: 30001,time: '5m ago',   cause: 'Upstream service timeout — check external API health' },
              ].map(({ code, method, path, ms, time, cause }) => (
                <div key={path} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-800/30 transition-colors">
                  <span className={`text-xs font-mono font-bold shrink-0 px-2 py-0.5 rounded ${
                    code >= 500 ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                    : code >= 400 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                  }`}>{code}</span>
                  <span className="text-xs font-mono text-slate-500 shrink-0 w-10">{method}</span>
                  <span className="text-sm text-slate-300 truncate flex-1 font-mono">{path}</span>
                  <span className="text-xs text-slate-500 shrink-0 hidden lg:block">{ms.toLocaleString()}ms</span>
                  <span className="text-xs text-slate-600 shrink-0 hidden sm:block w-14 text-right">{time}</span>
                  <div className="flex items-center gap-1.5 min-w-0 max-w-xs hidden xl:flex">
                    <Zap className="h-3 w-3 text-violet-400 shrink-0" />
                    <span className="text-xs text-violet-400 truncate">{cause}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TRUST STRIP — logos / company names
═══════════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════════
   FEATURE ROWS — alternating left/right with real visuals
═══════════════════════════════════════════════════════════════════════════ */

/* ── Animated Visual 1: API Health ─────────────────────────────────────── */
const BASE_APIS = [
  { path: '/api/payments/charge',    errorRate: 12.4, avgMs: 8420, status: 'critical' as const, issues: 3 },
  { path: '/api/auth/login',         errorRate: 5.1,  avgMs: 230,  status: 'warning'  as const, issues: 2 },
  { path: '/api/orders',             errorRate: 3.8,  avgMs: 310,  status: 'warning'  as const, issues: 1 },
  { path: '/api/users/me',           errorRate: 0.9,  avgMs: 42,   status: 'healthy'  as const, issues: 0 },
  { path: '/api/products',           errorRate: 0.2,  avgMs: 95,   status: 'healthy'  as const, issues: 0 },
  { path: '/api/notifications/send', errorRate: 8.7,  avgMs: 5200, status: 'critical' as const, issues: 2 },
];

const STATUS_CFG = {
  critical: { bar: 'bg-red-500',     badge: 'bg-red-500/15 text-red-400 border border-red-500/25',       dot: 'bg-red-500',     pulse: 'animate-pulse' },
  warning:  { bar: 'bg-amber-500',   badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/25', dot: 'bg-amber-500',   pulse: 'animate-pulse' },
  healthy:  { bar: 'bg-emerald-500', badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25', dot: 'bg-emerald-500', pulse: '' },
};

function ApiHealthVisual() {
  const [mounted,   setMounted]   = useState(false);
  const [liveRates, setLiveRates] = useState(BASE_APIS.map(a => a.errorRate));
  const [highlight, setHighlight] = useState<number | null>(null);

  // Bars animate in on mount
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);

  // Simulate live rate fluctuation every 2.5s
  useEffect(() => {
    const id = setInterval(() => {
      const idx = Math.floor(Math.random() * BASE_APIS.length);
      setLiveRates(prev => {
        const next = [...prev];
        const base  = BASE_APIS[idx].errorRate;
        next[idx]   = Math.max(0.1, +(base + (Math.random() - 0.5) * base * 0.3).toFixed(1));
        return next;
      });
      setHighlight(idx);
      setTimeout(() => setHighlight(null), 800);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      {/* Header with live dot */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
        <span className="text-sm font-semibold text-white">API Health Overview</span>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs text-slate-500">Live · 6 endpoints</span>
        </div>
      </div>

      {/* Summary counters */}
      <div className="grid grid-cols-3 divide-x divide-slate-800 border-b border-slate-800">
        {[
          { label: 'Critical', value: 2, color: 'text-red-400' },
          { label: 'Warning',  value: 2, color: 'text-amber-400' },
          { label: 'Healthy',  value: 2, color: 'text-emerald-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="px-4 py-3 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-800/60">
        {BASE_APIS.map(({ path, avgMs, status, issues }, i) => {
          const cfg  = STATUS_CFG[status];
          const rate = liveRates[i];
          const isHi = highlight === i;
          return (
            <div key={path}
              className={`px-5 py-3 flex items-center gap-3 transition-colors duration-300 ${isHi ? 'bg-slate-800/50' : ''}`}
              style={{ transitionDelay: `${i * 60}ms`, opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateX(-8px)', transition: 'opacity 0.4s ease, transform 0.4s ease, background-color 0.3s ease' }}
            >
              {/* Pulsing status dot */}
              <span className="relative flex h-2 w-2 shrink-0">
                {status !== 'healthy' && (
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${cfg.dot}`} />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.dot}`} />
              </span>

              <span className="text-xs font-mono text-slate-300 flex-1 truncate">{path}</span>

              {/* Animated bar */}
              <div className="hidden sm:flex items-center gap-1.5 w-24 shrink-0">
                <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${cfg.bar} transition-all duration-700`}
                    style={{ width: mounted ? `${Math.min(rate * 5, 100)}%` : '0%' }}
                  />
                </div>
                <span className={`text-xs w-9 text-right transition-colors duration-300 ${isHi ? (status === 'critical' ? 'text-red-400' : 'text-amber-400') : 'text-slate-500'}`}>
                  {rate}%
                </span>
              </div>

              <span className="text-xs text-slate-500 shrink-0 hidden lg:block w-14 text-right">
                {avgMs >= 1000 ? `${(avgMs / 1000).toFixed(1)}s` : `${avgMs}ms`}
              </span>

              {issues > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${cfg.badge}`}>
                  {issues} issue{issues > 1 ? 's' : ''}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Animated Visual 2: AI Root Cause ──────────────────────────────────── */
const DIAGNOSES = [
  { label: 'Cause',   value: 'Database connection pool exhausted — all 10 connections in use', severity: 'high'   },
  { label: 'Pattern', value: 'Errors spike at payment peaks (09:00–11:00, 18:00–20:00)',       severity: 'medium' },
  { label: 'Impact',  value: '2,100+ users affected · $4,200 estimated revenue at risk',       severity: 'high'   },
];
const FIXES = [
  'Increase MongoDB pool: `maxPoolSize: 50` in connection string',
  'Add timeout guard: `serverSelectionTimeoutMS: 5000`',
  'Queue concurrent DB calls with `p-queue` to prevent overload',
];

function AiRootCauseVisual() {
  const [scanProgress, setScanProgress] = useState(0);
  const [scanning,     setScanning]     = useState(true);
  const [visibleRows,  setVisibleRows]  = useState(0);
  const [visibleFixes, setVisibleFixes] = useState(0);
  const [cycle,        setCycle]        = useState(0); // re-trigger loop

  useEffect(() => {
    // Intentional: reset the demo animation counters whenever the loop
    // re-triggers (cycle changes), then drive them via timers below.
    /* eslint-disable react-hooks/set-state-in-effect */
    setScanProgress(0);
    setScanning(true);
    setVisibleRows(0);
    setVisibleFixes(0);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Scan bar fills over 1.6s
    let progress = 0;
    const scanId = setInterval(() => {
      progress += 4;
      setScanProgress(Math.min(progress, 100));
      if (progress >= 100) {
        clearInterval(scanId);
        setScanning(false);
        // Reveal diagnosis rows one by one
        let row = 0;
        const rowId = setInterval(() => {
          row += 1;
          setVisibleRows(row);
          if (row >= DIAGNOSES.length) {
            clearInterval(rowId);
            // Reveal fix suggestions
            let fix = 0;
            const fixId = setInterval(() => {
              fix += 1;
              setVisibleFixes(fix);
              if (fix >= FIXES.length) {
                clearInterval(fixId);
                // After fully shown, restart cycle after 4s pause
                setTimeout(() => setCycle(c => c + 1), 4000);
              }
            }, 450);
          }
        }, 400);
      }
    }, 30);

    return () => clearInterval(scanId);
  }, [cycle]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-800">
        <AlertTriangle className={`h-4 w-4 ${scanning ? 'text-amber-400 animate-pulse' : 'text-red-400'}`} />
        <span className="text-sm font-semibold text-white">Error Analysis</span>
        <span className="ml-auto text-xs bg-red-500/15 text-red-400 border border-red-500/25 px-2 py-0.5 rounded">500</span>
      </div>

      {/* Error meta */}
      <div className="px-5 py-4 border-b border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-slate-400">POST</span>
          <span className="font-mono text-slate-300">/api/payments/charge</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
          <span>8,420ms</span><span>·</span><span>12.4% error rate</span><span>·</span><span>47 today</span>
        </div>
      </div>

      {/* AI scan progress */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <Zap className={`h-3.5 w-3.5 ${scanning ? 'text-amber-400 animate-spin' : 'text-violet-400'}`} style={{ animationDuration: '1s' }} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${scanning ? 'text-amber-400' : 'text-violet-400'}`}>
            {scanning ? 'AI scanning…' : 'AI Root Cause'}
          </span>
          <span className="ml-auto text-xs text-slate-600">{scanProgress}%</span>
        </div>
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-100 ${scanning ? 'bg-amber-500' : 'bg-violet-500'}`}
            style={{ width: `${scanProgress}%` }}
          />
        </div>
      </div>

      {/* Diagnosis rows */}
      <div className="px-5 space-y-2.5 pb-4 border-b border-slate-800">
        {DIAGNOSES.map(({ label, value, severity }, i) => (
          <div key={label}
            className="flex items-start gap-2.5 transition-all duration-500"
            style={{ opacity: visibleRows > i ? 1 : 0, transform: visibleRows > i ? 'none' : 'translateY(6px)' }}>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
              severity === 'high' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
            }`}>{label}</span>
            <span className="text-xs text-slate-300 leading-relaxed">{value}</span>
          </div>
        ))}
      </div>

      {/* Fix suggestions */}
      <div className="px-5 py-4">
        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-3">AI Fix Suggestions</span>
        <div className="space-y-2">
          {FIXES.map((fix, i) => (
            <div key={i}
              className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed transition-all duration-500"
              style={{ opacity: visibleFixes > i ? 1 : 0, transform: visibleFixes > i ? 'none' : 'translateY(6px)' }}>
              <span className="text-emerald-500 font-bold shrink-0 mt-0.5">{i + 1}.</span>
              <span>{fix}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Animated Visual 3: Error Trends ───────────────────────────────────── */
const BASE_ENDPOINTS = [
  { name: '/api/payments', base: [2,5,12,8,15,11,18], trend: '+45%', color: 'bg-red-500'     },
  { name: '/api/auth',     base: [1,1,3,2,4,3,5],     trend: '+20%', color: 'bg-amber-500'   },
  { name: '/api/orders',   base: [0,1,1,2,1,0,2],     trend: '0%',   color: 'bg-blue-500'    },
  { name: '/api/users',    base: [0,0,1,0,0,1,0],     trend: '-10%', color: 'bg-emerald-500' },
];
const DAYS = ['M','T','W','T','F','S','S'];

function AnalyticsVisual() {
  const [mounted, setMounted] = useState(false);
  const [data,    setData]    = useState(BASE_ENDPOINTS.map(e => [...e.base]));
  const [activeBar, setActiveBar] = useState<string | null>(null);

  // Mount — bars grow in
  useEffect(() => { const t = setTimeout(() => setMounted(true), 150); return () => clearTimeout(t); }, []);

  // Every 2s shift each endpoint's data left and add new value on the right
  useEffect(() => {
    const id = setInterval(() => {
      const idx = Math.floor(Math.random() * BASE_ENDPOINTS.length);
      setActiveBar(BASE_ENDPOINTS[idx].name);
      setData(prev => prev.map((row) => {
        const newVal = Math.max(0, Math.round(row[row.length - 1] + (Math.random() - 0.4) * 4));
        return [...row.slice(1), newVal];
      }));
      setTimeout(() => setActiveBar(null), 600);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const maxVal = Math.max(...data.flat(), 1);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
        <span className="text-sm font-semibold text-white">Error Trends by Endpoint</span>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs text-slate-500">Updating live</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-5 py-3 border-b border-slate-800">
        {BASE_ENDPOINTS.map(({ name, color }) => (
          <div key={name} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-xs text-slate-400 font-mono">{name}</span>
          </div>
        ))}
      </div>

      <div className="p-5 space-y-5">
        {BASE_ENDPOINTS.map(({ name, trend, color }, ei) => (
          <div key={name}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-mono transition-colors duration-300 ${activeBar === name ? 'text-white' : 'text-slate-400'}`}>{name}</span>
              <span className={`text-xs font-medium ${trend.startsWith('+') ? 'text-red-400' : trend === '0%' ? 'text-slate-500' : 'text-emerald-400'}`}>{trend}</span>
            </div>
            <div className="flex items-end gap-1 h-10">
              {data[ei].map((v, i) => {
                const isLast = i === data[ei].length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-sm transition-all duration-500 ${color} ${isLast && activeBar === name ? 'opacity-100' : 'opacity-70'}`}
                      style={{ height: mounted ? `${Math.max((v / maxVal) * 36, v > 0 ? 2 : 0)}px` : '0px' }}
                    />
                    <span className="text-[9px] text-slate-700">{DAYS[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureRow1() {
  const textRef  = useGsapSlide('left');
  const cardRef  = useGsapScale();
  return (
    <div className="py-24 border-b border-slate-800/60">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div ref={textRef}>
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-4 block">API Health</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">See which APIs are weak — instantly</h2>
            <p className="text-slate-400 leading-relaxed mb-8">
              Every endpoint gets a live health score based on its error rate, response time, and failure patterns. Critical, warning, and healthy — you always know where to look first.
            </p>
            <ul className="space-y-3">
              {['Error rate per endpoint', 'Response time tracking', 'Critical / warning / healthy classification', 'Issue count per API'].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />{item}
                </li>
              ))}
            </ul>
          </div>
          <div ref={cardRef} className="lg:order-last"><ApiHealthVisual /></div>
        </div>
      </div>
    </div>
  );
}

function FeatureRow2() {
  const textRef  = useGsapSlide('right');
  const cardRef  = useGsapScale();
  return (
    <div className="py-24 border-b border-slate-800/60">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div ref={textRef} className="lg:order-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-4 block">AI Analysis</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">AI identifies the root cause and tells you how to fix it</h2>
            <p className="text-slate-400 leading-relaxed mb-8">
              When a weak or failing API is detected, our AI engine runs 20+ diagnostic rules — database timeouts, auth failures, rate limits, missing fields — and surfaces a plain-English fix in seconds.
            </p>
            <ul className="space-y-3">
              {['Root cause classification', 'Business impact estimate', 'Step-by-step fix suggestions', 'Recurrence pattern detection'].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />{item}
                </li>
              ))}
            </ul>
          </div>
          <div ref={cardRef} className="lg:order-1"><AiRootCauseVisual /></div>
        </div>
      </div>
    </div>
  );
}

function FeatureRow3() {
  const textRef  = useGsapSlide('left');
  const cardRef  = useGsapScale();
  return (
    <div className="py-24 border-b border-slate-800/60">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div ref={textRef}>
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-4 block">Analytics</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">Spot degradation before your users do</h2>
            <p className="text-slate-400 leading-relaxed mb-8">
              Track error rate trends per endpoint across days and weeks. See which APIs are getting worse over time and act before they become incidents.
            </p>
            <ul className="space-y-3">
              {['Error trends over time', 'Per-endpoint breakdown', 'Week-over-week comparison', 'Traffic volume tracking'].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />{item}
                </li>
              ))}
            </ul>
          </div>
          <div ref={cardRef} className="lg:order-last"><AnalyticsVisual /></div>
        </div>
      </div>
    </div>
  );
}

function FeatureRows() {
  return (
    <section id="platform" className="border-t border-slate-800/60">
      <FeatureRow1 />
      <FeatureRow2 />
      <FeatureRow3 />
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOW IT WORKS
═══════════════════════════════════════════════════════════════════════════ */
function HowItWorks() {
  const headRef  = useGsapReveal();
  const stepsRef = useGsapReveal(0.15);
  const codeRef  = useGsapScale();
  return (
    <section id="how-it-works" className="py-28 border-t border-slate-800/60">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div ref={headRef} className="text-center mb-16">
          <p data-gsap="reveal" className="text-sm font-medium text-violet-400 uppercase tracking-widest mb-3">How it works</p>
          <h2 data-gsap="reveal" className="text-3xl sm:text-4xl font-bold text-white">Live in 2 minutes</h2>
          <p data-gsap="reveal" className="mt-4 text-slate-400">No config overload. No agents to manage. Just install and ship.</p>
        </div>

        <div ref={stepsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[
            { step: '01', headline: 'Create a project',  body: 'Sign up, create a project, and get your unique API key instantly — no credit card.', icon: Activity },
            { step: '02', headline: 'Install the SDK',   body: 'npm install @api-insight/sdk and add two middleware lines to your Express app.', icon: Terminal },
            { step: '03', headline: 'Monitor and fix',   body: 'Every API error appears on your dashboard with root cause suggestions within seconds.', icon: Zap },
          ].map(({ step, headline, body, icon: SIcon }) => (
            <div data-gsap="reveal" key={step} className="relative rounded-2xl border border-slate-800 bg-slate-900/50 p-7">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-xs font-bold text-violet-500 bg-violet-500/10 border border-violet-500/20 rounded-full px-2.5 py-1">{step}</span>
              </div>
              <SIcon className="h-6 w-6 text-violet-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">{headline}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Code block */}
        <div ref={codeRef} className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-800">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/60" />
              <span className="w-3 h-3 rounded-full bg-amber-500/60" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
            </div>
            <span className="text-xs text-slate-500 font-mono ml-2">server.ts</span>
          </div>
          <div className="p-6 text-sm font-mono leading-8 overflow-x-auto">
            <div><span className="text-slate-600">{'// Your existing Express app'}</span></div>
            <div>
              <span className="text-blue-400">import </span>
              <span className="text-white">express </span>
              <span className="text-blue-400">from </span>
              <span className="text-emerald-400">&apos;express&apos;</span>
              <span className="text-slate-400">;</span>
            </div>
            <div>
              <span className="text-blue-400">import </span>
              <span className="text-slate-400">{'{ '}</span>
              <span className="text-white">createMiddleware</span>
              <span className="text-slate-400">, </span>
              <span className="text-white">createErrorMiddleware</span>
              <span className="text-slate-400">{' } '}</span>
              <span className="text-blue-400">from </span>
              <span className="text-emerald-400">&apos;@api-insight/sdk&apos;</span>
              <span className="text-slate-400">;</span>
            </div>
            <div className="mt-2">
              <span className="text-blue-400">const </span>
              <span className="text-white">app </span>
              <span className="text-slate-400">= </span>
              <span className="text-yellow-400">express</span>
              <span className="text-slate-400">();</span>
            </div>
            <div className="mt-2"><span className="text-slate-600">{'// ✅ Add these two lines — that\'s it'}</span></div>
            <div>
              <span className="text-white">app</span>
              <span className="text-slate-400">.</span>
              <span className="text-yellow-400">use</span>
              <span className="text-slate-400">{'('}</span>
              <span className="text-white">createMiddleware</span>
              <span className="text-slate-400">{'({ '}</span>
              <span className="text-violet-300">apiKey</span>
              <span className="text-slate-400">: </span>
              <span className="text-white">process</span>
              <span className="text-slate-400">.env.</span>
              <span className="text-amber-300">API_INSIGHT_KEY</span>
              <span className="text-slate-400">{'! }));'}</span>
            </div>
            <div>
              <span className="text-white">app</span>
              <span className="text-slate-400">.</span>
              <span className="text-yellow-400">use</span>
              <span className="text-slate-400">{'('}</span>
              <span className="text-white">createErrorMiddleware</span>
              <span className="text-slate-400">{'({ '}</span>
              <span className="text-violet-300">apiKey</span>
              <span className="text-slate-400">: </span>
              <span className="text-white">process</span>
              <span className="text-slate-400">.env.</span>
              <span className="text-amber-300">API_INSIGHT_KEY</span>
              <span className="text-slate-400">{'! }));'}</span>
            </div>
            <div className="mt-2"><span className="text-slate-600">{'// ... rest of your routes unchanged'}</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRICING
═══════════════════════════════════════════════════════════════════════════ */
const PLANS = [
  {
    name: 'Free',
    monthly: 0, yearly: 0,
    per: 'forever',
    desc: 'Perfect for side projects.',
    highlight: false,
    features: ['5 API endpoints', '1 project', '7-day retention', 'Root cause suggestions', 'Community support'],
    cta: 'Get started free',
    href: '/register',
    ctaStyle: 'border border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent',
  },
  {
    name: 'Pro',
    monthly: 500, yearly: 4800,
    per: 'mo',
    desc: 'For teams shipping production APIs.',
    highlight: true,
    features: ['50 API endpoints', '5 projects', '30-day retention', 'AI root cause + fix hints', 'Email & Slack alerts', 'Priority support'],
    cta: 'Start Pro trial',
    href: '/register',
    ctaStyle: 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30',
  },
  {
    name: 'Ultra',
    monthly: 1000, yearly: 9600,
    per: 'mo',
    desc: 'Unlimited monitoring at scale.',
    highlight: false,
    features: ['Unlimited endpoints', 'Unlimited projects', '90-day retention', 'Custom alert rules', 'Webhook integrations', 'Dedicated support'],
    cta: 'Start Ultra trial',
    href: '/register',
    ctaStyle: 'border border-amber-600/40 text-amber-300 hover:bg-amber-500/10 bg-transparent',
  },
  {
    name: 'Team',
    monthly: null, yearly: null,
    per: null,
    desc: 'Custom limits, SSO, SLA guarantee.',
    highlight: false,
    features: ['Everything in Ultra', 'Custom limits', 'SSO / SAML', 'Audit logs', 'Custom retention', 'Dedicated manager'],
    cta: 'Contact us',
    href: 'mailto:hello@apiinsight.dev',
    ctaStyle: 'border border-emerald-600/40 text-emerald-300 hover:bg-emerald-500/10 bg-transparent',
  },
];

function Pricing() {
  const [yearly, setYearly] = useState(false);
  const headRef  = useGsapReveal();
  const cardsRef = useGsapReveal(0.1);

  return (
    <section id="pricing" className="py-28 border-t border-slate-800/60">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div ref={headRef} className="text-center mb-12">
          <p data-gsap="reveal" className="text-sm font-medium text-violet-400 uppercase tracking-widest mb-3">Pricing</p>
          <h2 data-gsap="reveal" className="text-3xl sm:text-4xl font-bold text-white">Simple, transparent pricing</h2>
          <p data-gsap="reveal" className="mt-4 text-slate-400">Start free. Scale when you need to. No hidden fees.</p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button onClick={() => setYearly(false)}
              className={`text-sm font-medium px-5 py-2 rounded-lg transition-all ${!yearly ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
              Monthly
            </button>
            <button onClick={() => setYearly(true)}
              className={`text-sm font-medium px-5 py-2 rounded-lg transition-all flex items-center gap-2 ${yearly ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
              Yearly
              <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">-20%</span>
            </button>
          </div>
        </div>

        <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {PLANS.map((plan) => (
            <div data-gsap="reveal" key={plan.name}
              className={`relative flex flex-col rounded-2xl p-7 transition-all duration-200 ${
                plan.highlight
                  ? 'bg-violet-950/40 border border-violet-500/50 shadow-xl shadow-violet-900/20'
                  : 'bg-slate-900 border border-slate-800 hover:border-slate-700'
              }`}>
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="text-xs font-semibold bg-violet-600 text-white px-3 py-1 rounded-full">Most popular</span>
                </div>
              )}

              <div className="mb-5">
                <h3 className="font-bold text-white text-lg">{plan.name}</h3>
                <p className="text-sm text-slate-400 mt-1">{plan.desc}</p>
              </div>

              <div className="mb-7">
                {plan.monthly === null ? (
                  <p className="text-3xl font-bold text-white">Custom</p>
                ) : plan.monthly === 0 ? (
                  <p className="text-3xl font-bold text-white">₹0 <span className="text-base font-normal text-slate-500">/ forever</span></p>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-white">
                      ₹{yearly ? Math.round((plan.yearly as number) / 12).toLocaleString() : (plan.monthly as number).toLocaleString()}
                      <span className="text-base font-normal text-slate-500"> / {plan.per}</span>
                    </p>
                    {yearly && <p className="text-xs text-emerald-400 mt-1.5">₹{(plan.yearly as number).toLocaleString()} billed yearly</p>}
                  </>
                )}
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={
                  plan.monthly === null || plan.monthly === 0
                    ? plan.href // Team → contact, Free → plain signup
                    : `/register?next=${encodeURIComponent(`/dashboard/billing?cycle=${yearly ? 'yearly' : 'monthly'}`)}`
                }
                className={`w-full h-11 inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 ${plan.ctaStyle}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CTA BANNER — dark gradient, full width
═══════════════════════════════════════════════════════════════════════════ */
function CTABanner() {
  const ref = useGsapReveal(0.12);
  return (
    <section className="border-t border-slate-800/60 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/50 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-violet-600/10 rounded-full blur-[80px] pointer-events-none" />

      <div ref={ref} className="relative max-w-4xl mx-auto px-5 sm:px-8 py-28 text-center">
        <h2 data-gsap="reveal" className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
          Stop guessing.<br />Start monitoring.
        </h2>
        <p data-gsap="reveal" className="text-lg text-slate-400 mb-10 max-w-xl mx-auto">
          Join developers who catch API errors before their users do. Free forever for small projects.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold h-13 px-10 rounded-xl text-base shadow-xl shadow-violet-600/30 hover:shadow-violet-600/50 transition-all duration-200 hover:-translate-y-0.5 py-3.5">
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white h-13 px-10 rounded-xl text-base bg-transparent transition-all py-3.5 hover:bg-slate-800/50">
            Sign in to dashboard
          </Link>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-slate-500">
          {['No credit card required', 'Free forever for small projects', 'Setup in under 2 minutes'].map(t => (
            <span key={t} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" /> {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="border-t border-slate-800/60 bg-slate-950 pt-14 pb-10">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-violet-600 rounded-md">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-white">API Insight</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">Intelligent API monitoring and root cause analysis for modern engineering teams.</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Product</p>
            <ul className="space-y-3">
              {['Features', 'Pricing', 'Changelog', 'Roadmap'].map(l => (
                <li key={l}><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Developers</p>
            <ul className="space-y-3">
              {['Documentation', 'SDK Reference', 'API Reference', 'Status'].map(l => (
                <li key={l}><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Company</p>
            <ul className="space-y-3">
              {['About', 'Blog', 'Privacy', 'Terms'].map(l => (
                <li key={l}><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} API Insight. All rights reserved.</p>
          <p className="text-xs text-slate-600">Built for developers, by developers.</p>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <Hero />
      <FeatureRows />
      <HowItWorks />
      <Pricing />
      <CTABanner />
      <Footer />
    </div>
  );
}
