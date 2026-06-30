'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Activity, MailCheck, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { getNextPath } from '@/lib/utils';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';

export default function VerifyEmailPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setEmail(new URLSearchParams(window.location.search).get('email') || '');
    startCooldown(60); // a code was just sent on register/login
    return () => { if (tick.current) clearInterval(tick.current); };
  }, []);

  const startCooldown = (secs: number) => {
    setCooldown(secs);
    if (tick.current) clearInterval(tick.current);
    tick.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1 && tick.current) clearInterval(tick.current);
        return Math.max(0, c - 1);
      });
    }, 1000);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-email', { email, code });
      dispatch(setCredentials({ user: data.data.user, token: data.data.token }));
      toast.success('Email verified 🎉');
      router.push(getNextPath());
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Verification failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await api.post('/auth/resend-otp', { email });
      toast.success('A new code is on its way');
      startCooldown(60);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not resend code';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-slate-950 animate-fade-in">
      <div className="w-full max-w-[400px] space-y-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-violet-600 rounded-xl">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">API Insight</span>
        </div>

        <div>
          <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-violet-600/15 border border-violet-600/30 mb-4">
            <MailCheck className="h-5 w-5 text-violet-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Verify your email</h2>
          <p className="text-slate-400 text-sm mt-1">
            We sent a 6-digit code to{' '}
            <span className="text-slate-200 font-medium">{email || 'your email'}</span>.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <Input
            value={code}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="• • • • • •"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            className="h-12 text-center text-2xl tracking-[0.4em] bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:border-violet-500"
          />
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full h-11 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all"
          >
            {loading ? 'Verifying…' : <>Verify &amp; continue <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <div className="text-center text-sm text-slate-500">
          Didn&apos;t get it?{' '}
          <button
            onClick={handleResend}
            disabled={cooldown > 0}
            className="text-violet-400 hover:text-violet-300 font-medium disabled:text-slate-600 disabled:cursor-not-allowed"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>

        <p className="text-center text-sm text-slate-600">
          Wrong account?{' '}
          <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
