'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity } from 'lucide-react';
import api from '@/lib/api';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';

export default function GithubCallbackPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const savedState = sessionStorage.getItem('gh_oauth_state');
      const next = sessionStorage.getItem('gh_oauth_next') || '/dashboard';
      sessionStorage.removeItem('gh_oauth_state');
      sessionStorage.removeItem('gh_oauth_next');

      if (!code || !state || state !== savedState) {
        setError('Invalid or expired GitHub response. Please try again.');
        return;
      }

      try {
        const { data } = await api.post('/auth/github', { code });
        dispatch(setCredentials({ user: data.data.user, token: data.data.token }));
        router.replace(next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(msg || 'GitHub sign-in failed. Please try again.');
      }
    })();
  }, [dispatch, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 text-slate-300">
      <div className="p-2 bg-violet-600 rounded-xl">
        <Activity className="h-6 w-6 text-white" />
      </div>
      {error ? (
        <>
          <p className="text-red-400 text-sm max-w-sm text-center px-6">{error}</p>
          <button onClick={() => router.replace('/login')} className="text-violet-400 hover:text-violet-300 text-sm font-medium">
            Back to sign in
          </button>
        </>
      ) : (
        <p className="text-sm">Signing you in with GitHub…</p>
      )}
    </div>
  );
}
