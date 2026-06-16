'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Eye, EyeOff, Activity, Zap, Shield, BarChart3, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GoogleButton from '@/components/auth/GoogleButton';
import api from '@/lib/api';
import { getNextPath } from '@/lib/utils';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';

const FEATURES = [
  { icon: Zap,       title: 'Instant capture',    desc: '2-line SDK setup. Every 4xx/5xx logged automatically.' },
  { icon: BarChart3, title: 'Root cause analysis', desc: 'Rule-based engine suggests fixes alongside every error.' },
  { icon: Shield,    title: 'Smart alerts',        desc: 'Get notified by email when errors exceed your threshold.' },
];

export default function LoginPage() {
  const router    = useRouter();
  const dispatch  = useAppDispatch();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      dispatch(setCredentials({ user: data.data.user, token: data.data.token }));
      toast.success('Welcome back!');
      router.push(getNextPath());
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950 animate-fade-in">
      {/* ── Left panel — branding + features ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden animate-slide-left">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-slate-950 to-slate-900" />
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

        {/* Animated grid lines */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#a78bfa 1px, transparent 1px), linear-gradient(90deg, #a78bfa 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-600 rounded-xl">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">API Insight</span>
          </div>
        </div>

        <div className="relative z-10 space-y-10 animate-fade-up stagger-2">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Stop guessing.<br />
              <span className="text-shimmer">Start fixing.</span>
            </h1>
            <p className="mt-4 text-slate-400 text-lg leading-relaxed max-w-sm">
              Monitor every API failure, understand why it happened, and get alerted before your users notice.
            </p>
          </div>

          <div className="space-y-5">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className={`flex items-start gap-4 animate-fade-up stagger-${i + 3}`}>
                <div className="p-2 rounded-lg bg-violet-600/20 border border-violet-600/20 shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{title}</p>
                  <p className="text-slate-500 text-sm mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fake terminal snippet */}
        <div className="relative z-10 bg-slate-900/70 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <pre className="text-xs font-mono leading-relaxed">
            <span className="text-slate-500">// Two lines. That&apos;s all it takes.</span>{'\n'}
            <span className="text-violet-400">app</span>
            <span className="text-slate-300">.use(</span>
            <span className="text-emerald-400">createMiddleware</span>
            <span className="text-slate-300">(insight));</span>{'\n'}
            <span className="text-violet-400">app</span>
            <span className="text-slate-300">.use(</span>
            <span className="text-emerald-400">createErrorMiddleware</span>
            <span className="text-slate-300">(insight));</span>{'\n'}
            <span className="text-slate-500 text-[10px]">// Every error is now tracked ✓</span>
          </pre>
        </div>
      </div>

      {/* ── Right panel — sign in form ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-slate-950">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="p-2 bg-violet-600 rounded-xl">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">API Insight</span>
        </div>

        <div className="w-full max-w-[400px] space-y-6">
          <div className="animate-fade-up stagger-1">
            <h2 className="text-2xl font-bold text-white">Welcome back</h2>
            <p className="text-slate-400 text-sm mt-1">Sign in to your dashboard</p>
          </div>

          {/* Google Sign-In */}
          <div className="animate-fade-up stagger-2">
            <GoogleButton label="Continue with Google" />
          </div>

          {/* Divider */}
          <div className="relative animate-fade-up stagger-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-950 px-3 text-xs text-slate-600">or continue with email</span>
            </div>
          </div>

          {/* Email / password form */}
          <form onSubmit={handleSubmit} className="space-y-4 animate-fade-up stagger-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300 text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                value={form.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, email: e.target.value })}
                required
                className="h-11 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:border-violet-500 focus:ring-violet-500/20 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-300 text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, password: e.target.value })}
                  required
                  className="h-11 pr-10 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:border-violet-500 focus:ring-violet-500/20 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-violet-600/25 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in…
                </>
              ) : (
                <>Sign in <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
