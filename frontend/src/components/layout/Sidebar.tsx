'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, LayoutDashboard, FolderOpen, FileText, LogOut, Layers, CreditCard, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, useAppDispatch } from '@/store/hooks';
import { clearCredentials } from '@/store/slices/authSlice';
import { useTier } from '@/components/providers/TierProvider';
import { TIER_THEME } from '@/lib/tierTheme';

const nav = [
  { href: '/dashboard',          label: 'Overview',     icon: LayoutDashboard },
  { href: '/dashboard/projects', label: 'Projects',     icon: FolderOpen },
  { href: '/dashboard/logs',     label: 'Logs',         icon: FileText },
  { href: '/dashboard/groups',   label: 'Error Groups', icon: Layers },
  { href: '/dashboard/billing',  label: 'Billing',      icon: CreditCard },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { plan } = useTier();
  const theme = TIER_THEME[plan];

  const logout = () => {
    // Clears Redux state + localStorage in one dispatch
    dispatch(clearCredentials());
    router.push('/login');
  };

  return (
    <aside className={cn('flex flex-col w-64 min-h-screen border-r animate-slide-left transition-colors', theme.sidebar)}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-800/80">
        <div className={cn('p-1.5 rounded-md transition-colors', theme.logoBox)}>
          <Activity className={cn('h-5 w-5', plan === 'ultra' ? 'text-amber-950' : 'text-white')} />
        </div>
        <span className={cn('font-bold text-lg', theme.brand)}>API Insight</span>
        {theme.badge && (
          <span className={cn('ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider', theme.badge.className)}>
            {theme.badge.crown && <Crown className="h-3 w-3" />}
            {theme.badge.label}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer border border-transparent',
              pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                ? cn(theme.navActive, 'shadow-sm')
                : 'text-slate-400 hover:text-white hover:bg-slate-800 hover:translate-x-0.5'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-2">
        {user && (
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-slate-300 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
