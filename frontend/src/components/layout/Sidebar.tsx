'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, LayoutDashboard, FolderOpen, FileText, LogOut, Layers, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, useAppDispatch } from '@/store/hooks';
import { clearCredentials } from '@/store/slices/authSlice';

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

  const logout = () => {
    // Clears Redux state + localStorage in one dispatch
    dispatch(clearCredentials());
    router.push('/login');
  };

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 border-r border-slate-800 animate-slide-left">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-800">
        <div className="p-1.5 bg-violet-600 rounded-md">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-white text-lg">API Insight</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer',
              pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                ? 'bg-violet-600/20 text-violet-300 border border-violet-600/30 shadow-sm'
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
