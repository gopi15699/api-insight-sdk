'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertTriangle, Activity, Globe, Plus, ArrowRight, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import StatCard from '@/components/projects/StatCard';
import api from '@/lib/api';
import { useAuth } from '@/store/hooks';
import type { Project, Log, LogStats } from '@/types';

interface AggregatedStats {
  total: number;
  success: number;
  failure: number;
  errors24h: number;
  successRate: number;
  uniqueIps: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentLogs, setRecentLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/projects');
        const ps: Project[] = data.data;
        setProjects(ps);

        if (ps.length > 0) {
          // Aggregate stats across every project for the overview.
          const statsResults = await Promise.all(
            ps.map((p) =>
              api
                .get('/logs/stats', { params: { projectId: p._id } })
                .then((r) => r.data.data as LogStats)
                .catch(() => null)
            )
          );
          const agg = statsResults.reduce<AggregatedStats>(
            (acc, s) => {
              if (!s) return acc;
              acc.total += s.total;
              acc.success += s.success;
              acc.failure += s.failure;
              acc.errors24h += s.errors24h;
              acc.uniqueIps += s.uniqueIps;
              return acc;
            },
            { total: 0, success: 0, failure: 0, errors24h: 0, successRate: 0, uniqueIps: 0 }
          );
          agg.successRate = agg.total > 0 ? Number(((agg.success / agg.total) * 100).toFixed(1)) : 0;
          setStats(agg);

          // Recent logs from the first project.
          const logsRes = await api.get('/logs', {
            params: { projectId: ps[0]._id, limit: 5 },
          });
          setRecentLogs(logsRes.data.data.logs);
        }
      } catch {
        // handled by interceptor
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statusColor = (code: number) => {
    if (code >= 500) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (code >= 400) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-up stagger-1">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">Here&apos;s what&apos;s happening with your APIs</p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/projects/new')}
          className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" /> New Project
        </Button>
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-slate-900 border-slate-800">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2 bg-slate-800" />
                <Skeleton className="h-8 w-16 bg-slate-800" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="animate-fade-up stagger-2"><StatCard title="Total API Calls" value={(stats?.total ?? 0).toLocaleString()} icon={Activity} accent="violet" description={`${projects.length} project${projects.length === 1 ? '' : 's'}`} /></div>
          <div className="animate-fade-up stagger-3"><StatCard title="Successful"      value={(stats?.success ?? 0).toLocaleString()} icon={CheckCircle2} accent="green" description={`${stats?.successRate ?? 0}% success rate`} /></div>
          <div className="animate-fade-up stagger-4"><StatCard title="Failed"          value={(stats?.failure ?? 0).toLocaleString()} icon={AlertTriangle} accent="red" description={`${stats?.errors24h ?? 0} in last 24h`} /></div>
          <div className="animate-fade-up stagger-5"><StatCard title="Unique IPs"      value={(stats?.uniqueIps ?? 0).toLocaleString()} icon={Globe} accent="amber" description="Distinct clients" /></div>
        </div>
      )}

      {/* Projects list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Projects</h2>
          <Link href="/dashboard/projects" className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-slate-800 rounded-lg" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800 border-dashed">
            <CardContent className="py-12 text-center">
              <FolderOpen className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No projects yet</p>
              <p className="text-slate-600 text-sm mb-4">Create a project to get your API key and start monitoring</p>
              <Button onClick={() => router.push('/dashboard/projects/new')} className="bg-violet-600 hover:bg-violet-700">
                <Plus className="h-4 w-4 mr-2" /> Create project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((p, i) => (
              <Card key={p._id} className={`bg-slate-900 border-slate-800 hover:border-violet-600/50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-900/20 cursor-pointer animate-fade-up stagger-${Math.min(i + 1, 6)}`}
                onClick={() => router.push(`/dashboard/logs?projectId=${p._id}`)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base text-white">{p.name}</CardTitle>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Active</Badge>
                  </div>
                  {p.description && <p className="text-xs text-slate-500 mt-1">{p.description}</p>}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <code className="text-xs text-slate-500 font-mono bg-slate-800 px-2 py-1 rounded">
                      {p.apiKey.substring(0, 16)}…
                    </code>
                    <span className="text-xs text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent logs */}
      {recentLogs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <Link href={`/dashboard/logs?projectId=${projects[0]?._id}`} className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-0">
              <div className="divide-y divide-slate-800">
                {recentLogs.map((log) => (
                  <div key={log._id} className="flex items-center gap-4 px-5 py-3.5">
                    <Badge className={`text-xs font-mono shrink-0 ${statusColor(log.statusCode)}`}>
                      {log.statusCode}
                    </Badge>
                    <span className="text-xs font-mono text-slate-400 shrink-0 w-14">{log.method}</span>
                    <span className="text-sm text-slate-300 truncate flex-1">{log.endpoint}</span>
                    <span className="text-xs text-slate-500 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
