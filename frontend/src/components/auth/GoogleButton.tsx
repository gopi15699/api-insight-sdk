'use client';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { getNextPath } from '@/lib/utils';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';

interface GoogleButtonProps {
  label?: string;
}

function GoogleButtonInner({ label = 'Continue with Google' }: GoogleButtonProps) {
  const router   = useRouter();
  const dispatch = useAppDispatch();

  const handleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      toast.error('Google sign-in failed — no credential received');
      return;
    }
    try {
      const { data } = await api.post('/auth/google', {
        credential: credentialResponse.credential,
      });
      dispatch(setCredentials({ user: data.data.user, token: data.data.token }));
      toast.success(`Welcome, ${data.data.user.name}!`);
      router.push(getNextPath());
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Google sign-in failed';
      toast.error(message);
    }
  };

  return (
    <div className="w-full flex justify-center [&>div]:w-full [&_iframe]:w-full">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => toast.error('Google sign-in failed')}
        text={label === 'Continue with Google' ? 'continue_with' : 'signup_with'}
        shape="rectangular"
        theme="filled_black"
        size="large"
        width="400"
      />
    </div>
  );
}

export default function GoogleButton(props: GoogleButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <button
        disabled
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-500 text-sm cursor-not-allowed"
        title="Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable"
      >
        <GoogleIcon />
        Continue with Google
        <span className="text-xs ml-1">(not configured)</span>
      </button>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleButtonInner {...props} />
    </GoogleOAuthProvider>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
