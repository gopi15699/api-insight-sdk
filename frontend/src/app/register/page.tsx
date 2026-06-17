'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Eye, EyeOff, Activity, Check, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GoogleButton from '@/components/auth/GoogleButton';
import GitHubButton from '@/components/auth/GitHubButton';
import api from '@/lib/api';
import { getNextPath } from '@/lib/utils';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';

const PERKS = [
  'Free forever for small projects',
  'SDK integrates in under 2 minutes',
  'Root cause suggestions on every error',
  'Email alerts when errors spike',
  'Full stack trace + request body logged',
];

export default function RegisterPage() {
  const router    = useRouter();
  const dispatch  = useAppDispatch();
  const [form, setForm]       = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);

  const pwStrength = (() => {
    const pw = form.password;
    if (pw.length === 0) return 0;
    let s = 0;
    if (pw.length >= 6)  s++;
    if (pw.length >= 10) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Great'][pwStrength];
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-emerald-500', 'bg-emerald-400'][pwStrength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      // New accounts must verify their email before a session is issued.
      if (data.data?.requiresVerification) {
        toast.success('Check your inbox for a verification code');
        const next = new URLSearchParams(window.location.search).get('next');
        router.push(
          `/verify-email?email=${encodeURIComponent(data.data.email)}${next ? `&next=${encodeURIComponent(next)}` : ''}`
        );
        return;
      }
      // Fallback (e.g. pre-verified accounts).
      dispatch(setCredentials({ user: data.data.user, token: data.data.token }));
      toast.success('Account created! Welcome 🎉');
      router.push(getNextPath());
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Registration failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950 animate-fade-in">
      {/* ── Left panel ──────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden animate-slide-left">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-slate-950 to-slate-900" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-3xl translate-x-1/4 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-500/8 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
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

        <div className="relative z-10 space-y-8 animate-fade-up stagger-2">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Catch errors<br />
              <span className="text-shimmer">before users do.</span>
            </h1>
            <p className="mt-4 text-slate-400 text-lg leading-relaxed max-w-sm">
              Join developers who use API Insight to ship with confidence.
            </p>
          </div>

          <div className="space-y-3">
            {PERKS.map((perk, i) => (
              <div key={perk} className={`flex items-center gap-3 animate-fade-up stagger-${i + 3}`}>
                <div className="h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-emerald-400" />
                </div>
                <span className="text-slate-300 text-sm">{perk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Social proof */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex -space-x-2">
            {['A','B','C','D'].map((l, i) => (
              <div key={l} className={`w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-white ${['bg-violet-600','bg-blue-600','bg-emerald-600','bg-amber-600'][i]}`}>
                {l}
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-sm">
            <span className="text-white font-medium">Developers</span> monitoring their APIs
          </p>
        </div>
      </div>

      {/* ── Right panel — register form ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-slate-950">
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="p-2 bg-violet-600 rounded-xl">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">API Insight</span>
        </div>

        <div className="w-full max-w-[400px] space-y-6">
          <div className="animate-fade-up stagger-1">
            <h2 className="text-2xl font-bold text-white">Create your account</h2>
            <p className="text-slate-400 text-sm mt-1">Start monitoring in minutes — free</p>
          </div>

          {/* Social Sign-Up */}
          <div className="animate-fade-up stagger-2 space-y-3">
            <GoogleButton label="Sign up with Google" />
            <GitHubButton label="Sign up with GitHub" />
          </div>

          {/* Divider */}
          <div className="relative animate-fade-up stagger-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-950 px-3 text-xs text-slate-600">or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 animate-fade-up stagger-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Full name</Label>
              <Input
                placeholder="John Doe"
                autoComplete="name"
                value={form.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}
                required
                minLength={2}
                className="h-11 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:border-violet-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Work email</Label>
              <Input
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                value={form.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, email: e.target.value })}
                required
                className="h-11 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:border-violet-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Password</Label>
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  placeholder="min 6 characters"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                  className="h-11 pr-10 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:border-violet-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Password strength bar */}
              {form.password.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= pwStrength ? strengthColor : 'bg-slate-800'}`} />
                    ))}
                  </div>
                  <p className={`text-xs ${['','text-red-400','text-amber-400','text-yellow-400','text-emerald-400','text-emerald-300'][pwStrength]}`}>
                    {strengthLabel} password
                  </p>
                </div>
              )}
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
                  Creating account…
                </>
              ) : (
                <>Create account <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 leading-relaxed">
            By creating an account you agree to our{' '}
            <span className="text-slate-500">Terms of Service</span> and{' '}
            <span className="text-slate-500">Privacy Policy</span>.
          </p>

          <p className="text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
