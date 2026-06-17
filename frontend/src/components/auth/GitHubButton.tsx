'use client';
import { Github } from 'lucide-react';

interface GitHubButtonProps {
  label?: string;
}

/**
 * Kicks off the GitHub OAuth code flow. Stores a CSRF `state` and the post-login
 * `next` path in sessionStorage; the /auth/github/callback page completes it.
 * Disabled when NEXT_PUBLIC_GITHUB_CLIENT_ID isn't set.
 */
export default function GitHubButton({ label = 'Continue with GitHub' }: GitHubButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;

  const start = () => {
    const state = crypto.randomUUID();
    const next = new URLSearchParams(window.location.search).get('next') || '';
    sessionStorage.setItem('gh_oauth_state', state);
    sessionStorage.setItem('gh_oauth_next', next);

    const redirectUri = `${window.location.origin}/auth/github/callback`;
    const url =
      'https://github.com/login/oauth/authorize' +
      `?client_id=${clientId}` +
      `&scope=${encodeURIComponent('read:user user:email')}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}`;
    window.location.href = url;
  };

  if (!clientId) {
    return (
      <button
        disabled
        title="Set NEXT_PUBLIC_GITHUB_CLIENT_ID to enable"
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-500 text-sm cursor-not-allowed"
      >
        <Github className="h-4 w-4" />
        Continue with GitHub
        <span className="text-xs ml-1">(not configured)</span>
      </button>
    );
  }

  return (
    <button
      onClick={start}
      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
    >
      <Github className="h-4 w-4" />
      {label}
    </button>
  );
}
