'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Search, ChevronLeft, ChevronRight, Lightbulb, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import StatusBadge from '@/components/logs/StatusBadge';
import MethodBadge from '@/components/logs/MethodBadge';
import api from '@/lib/api';
import type { Log, Project, PaginatedLogs } from '@/types';

function LogsContent() {
  const searchParams = useSearchParams();
  const initialProject = searchParams.get('projectId') || '';

  const [projects, setProjects]     = useState<Project[]>([]);
  const [projectId, setProjectId]   = useState(initialProject);
  const [logs, setLogs]             = useState<Log[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(false);
  const [selected, setSelected]     = useState<Log | null>(null);

  // Filters
  const [endpoint, setEndpoint]     = useState('');
  const [method, setMethod]         = useState('');
  const [statusCode, setStatusCode] = useState('');

  useEffect(() => {
    api.get('/projects').then(({ data }) => {
      const ps: Project[] = data.data;
      setProjects(ps);
      if (!projectId && ps.length > 0) setProjectId(ps[0]._id);
    });
  }, [projectId]);

  const loadLogs = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const { data } = await api.get<{ data: PaginatedLogs }>('/logs', {
        params: {
          projectId, page, limit: 20,
          ...(endpoint && { endpoint }),
          ...(method && method !== 'ALL' && { method }),
          ...(statusCode && { statusCode: Number(statusCode) }),
        },
      });
      setLogs(data.data.logs);
      setTotal(data.data.total);
      setTotalPages(data.data.totalPages);
    } catch {
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [projectId, page, endpoint, method, statusCode]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const clearFilters = () => {
    setEndpoint(''); setMethod(''); setStatusCode(''); setPage(1);
  };

  const hasFilters = endpoint || (method && method !== 'ALL') || statusCode;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 animate-fade-up stagger-1">
        <div>
          <h1 className="text-2xl font-bold text-white">Logs</h1>
          <p className="text-slate-400 text-sm mt-1">
            {total > 0 ? `${total.toLocaleString()} total errors` : 'API error logs'}
          </p>
        </div>
        <Button onClick={loadLogs} variant="ghost" className="text-slate-400 hover:text-white gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Filters bar */}
      <Card className="bg-slate-900 border-slate-800 animate-fade-up stagger-2">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Project selector */}
            <Select value={projectId} onValueChange={(v) => { setProjectId(v); setPage(1); }}>
              <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {projects.map((p) => (
                  <SelectItem key={p._id} value={p._id} className="text-slate-200 focus:bg-slate-700">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Endpoint search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <Input
                placeholder="Filter endpoint…"
                value={endpoint}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setEndpoint(e.target.value); setPage(1); }}
                className="pl-8 w-52 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm"
              />
            </div>

            {/* Method */}
            <Select value={method || 'ALL'} onValueChange={(v) => { setMethod(v === 'ALL' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-28 bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                  <SelectItem key={m} value={m} className="text-slate-200 focus:bg-slate-700">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status code */}
            <Input
              placeholder="Status (e.g. 500)"
              value={statusCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setStatusCode(e.target.value); setPage(1); }}
              className="w-36 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm"
            />

            {hasFilters && (
              <Button onClick={clearFilters} variant="ghost" size="sm" className="text-slate-500 hover:text-white gap-1.5">
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800 animate-fade-up stagger-3">
        <CardContent className="p-0">
          {/* Table header */}
          <div className="grid grid-cols-[80px_70px_1fr_180px_100px_80px] gap-2 px-5 py-3 border-b border-slate-800 text-xs font-medium text-slate-500 uppercase tracking-wider">
            <span>Status</span>
            <span>Method</span>
            <span>Endpoint / Error</span>
            <span>Suggestion</span>
            <span>Time</span>
            <span>Duration</span>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-800">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="px-5 py-4 flex gap-4">
                  <Skeleton className="h-5 w-16 bg-slate-800" />
                  <Skeleton className="h-5 w-14 bg-slate-800" />
                  <Skeleton className="h-5 flex-1 bg-slate-800" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-slate-400">No logs found</p>
              <p className="text-sm mt-1">
                {hasFilters ? 'Try adjusting your filters' : 'Logs will appear here once your SDK sends errors'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {logs.map((log) => (
                <div
                  key={log._id}
                  onClick={() => setSelected(log)}
                  className="grid grid-cols-[80px_70px_1fr_180px_100px_80px] gap-2 px-5 py-3.5 hover:bg-slate-800/50 cursor-pointer transition-colors items-center"
                >
                  <StatusBadge code={log.statusCode} />
                  <MethodBadge method={log.method} />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 font-mono truncate">{log.endpoint}</p>
                    {log.errorMessage && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{log.errorMessage}</p>
                    )}
                  </div>
                  <div className="min-w-0">
                    {log.suggestion ? (
                      <p className="text-xs text-amber-400/80 truncate leading-relaxed">{log.suggestion.substring(0, 60)}…</p>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(log.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {log.duration ? `${log.duration}ms` : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800">
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages} ({total.toLocaleString()} total)
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="text-slate-400 hover:text-white disabled:opacity-30">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  className="text-slate-400 hover:text-white disabled:opacity-30">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log detail modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-white">
                  <StatusBadge code={selected.statusCode} />
                  <MethodBadge method={selected.method} />
                  <span className="font-mono text-sm">{selected.endpoint}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                {/* Root cause suggestion */}
                {selected.suggestion && (
                  <div className="bg-amber-950/30 border border-amber-600/30 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-amber-400 mb-1">Root Cause Suggestion</p>
                        <p className="text-sm text-amber-200/80 leading-relaxed">{selected.suggestion}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Timestamp', new Date(selected.timestamp).toLocaleString()],
                    ['Duration',  selected.duration ? `${selected.duration}ms` : '—'],
                    ['IP',        selected.ip || '—'],
                    ['User Agent', selected.userAgent?.substring(0, 40) || '—'],
                  ].map(([label, val]) => (
                    <div key={label} className="bg-slate-800 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">{label}</p>
                      <p className="text-sm text-slate-200 truncate">{val}</p>
                    </div>
                  ))}
                </div>

                {/* Error message */}
                {selected.errorMessage && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-2">Error Message</p>
                    <p className="text-sm text-red-300 bg-red-950/20 border border-red-900/30 rounded-lg px-3 py-2">
                      {selected.errorMessage}
                    </p>
                  </div>
                )}

                {/* Stack trace */}
                {selected.stackTrace && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-2">Stack Trace</p>
                    <pre className="text-xs text-slate-400 bg-slate-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                      {selected.stackTrace}
                    </pre>
                  </div>
                )}

                {/* Request body */}
                {selected.requestBody && Object.keys(selected.requestBody).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-2">Request Body</p>
                    <pre className="text-xs text-slate-300 bg-slate-800 rounded-lg p-3 overflow-x-auto font-mono">
                      {JSON.stringify(selected.requestBody, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Response body */}
                {selected.responseBody && Object.keys(selected.responseBody).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-2">Response Body</p>
                    <pre className="text-xs text-slate-300 bg-slate-800 rounded-lg p-3 overflow-x-auto font-mono">
                      {JSON.stringify(selected.responseBody, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LogsPage() {
  return (
    <Suspense fallback={<div className="text-slate-400 p-8">Loading…</div>}>
      <LogsContent />
    </Suspense>
  );
}
