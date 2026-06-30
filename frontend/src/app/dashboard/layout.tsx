'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/hooks';
import Sidebar from '@/components/layout/Sidebar';
import TierProvider, { useTier } from '@/components/providers/TierProvider';
import { TIER_THEME } from '@/lib/tierTheme';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  // `mounted` ensures server HTML and first client render both output null,
  // eliminating the hydration mismatch caused by localStorage being unavailable on the server.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Intentional: flip to mounted after the first client render to avoid the
    // localStorage-driven hydration mismatch described above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) router.replace('/login');
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated) return null;

  return (
    <TierProvider>
      <DashboardShell>{children}</DashboardShell>
    </TierProvider>
  );
}

/** Inner shell that reads the resolved tier to theme the whole dashboard. */
function DashboardShell({ children }: { children: React.ReactNode }) {
  const { plan } = useTier();
  const theme = TIER_THEME[plan];

  return (
    <div className="relative flex min-h-screen bg-slate-950">
      {theme.ambient && (
        <div
          className={`pointer-events-none fixed -top-40 left-1/2 -translate-x-1/2 h-[420px] w-[960px] rounded-full blur-[130px] ${theme.ambient}`}
        />
      )}
      <Sidebar />
      <main className="relative flex-1 overflow-auto">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
