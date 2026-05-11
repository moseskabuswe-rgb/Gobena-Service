import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Issue } from '../types';
import { AlertCircle, CheckCircle, Search, X, Clock } from '../components/Icons';

const severityColor: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-amber-100 text-amber-700 border-amber-200',
  low:      'bg-stone-100 text-stone-500 border-stone-200',
};
const issueStatusColor: Record<string, string> = {
  open:        'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved:    'bg-green-100 text-green-700',
  closed:      'bg-stone-100 text-stone-500',
};
const issueStatusLabel: Record<string, string> = {
  open: 'Open', in_progress: 'In progress', resolved: 'Resolved', closed: 'Closed',
};

export default function AdminIssuesPage() {
  const [issues, setIssues] = useState<(Issue & { shops?: { name: string }; equipment?: { name: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Issue['status']>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | Issue['severity']>('all');
  const [selected, setSelected] = useState<(Issue & { shops?: { name: string }; equipment?: { name: string } }) | null>(null);
  const [resolution, setResolution] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('issues')
      .select('id, title, description, severity, status, created_at, resolved_at, resolution_notes, reporter_name, reporter_email, shop_id, equipment_id, shops:shop_id(name), equipment:equipment_id(name, brand, model)')
      .order('created_at', { ascending: false })
      .limit(100);
    setIssues((data as (Issue & { shops?: { name: string }; equipment?: { name: string } })[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateIssue = async (id: string, updates: Partial<Issue>) => {
    setSaving(true);
    await supabase.from('issues').update(updates).eq('id', id);
    setIssues(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, ...updates } : null);
    setSaving(false);
  };

  const resolve = async () => {
    if (!selected) return;
    await updateIssue(selected.id, {
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolution_notes: resolution || null,
    });
    setSelected(null);
    setResolution('');
  };

  const filtered = issues.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (severityFilter !== 'all' && i.severity !== severityFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return i.title.toLowerCase().includes(q) ||
      (i.shops as unknown as { name: string } | undefined)?.name.toLowerCase().includes(q) ||
      (i.equipment as unknown as { name: string } | undefined)?.name.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-stone-50 pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-5">

        <div>
          <h1 className="text-2xl font-bold text-stone-900">All issues</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            {issues.filter(i => i.status === 'open').length} open · {issues.length} total
          </p>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input type="search" placeholder="Search issues, shops…" value={query} onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>

        <div className="flex gap-2 flex-wrap">
          {(['all','open','in_progress','resolved'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${statusFilter === s ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200'}`}>
              {s === 'all' ? 'All' : issueStatusLabel[s]}
            </button>
          ))}
          <div className="w-px bg-stone-200 mx-1" />
          {(['critical','high','medium','low'] as const).map(s => (
            <button key={s} onClick={() => setSeverityFilter(severityFilter === s ? 'all' : s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${severityFilter === s ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <CheckCircle size={32} className="mx-auto mb-3 text-green-400" />
            <p className="text-sm">No issues match your filters</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(issue => (
              <button key={issue.id} onClick={() => setSelected(issue)}
                className="w-full bg-white rounded-2xl border border-stone-100 px-4 py-4 text-left hover:border-stone-200 transition">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-stone-800">{issue.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${severityColor[issue.severity]}`}>
                        {issue.severity}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${issueStatusColor[issue.status]}`}>
                        {issueStatusLabel[issue.status]}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-1">
                      {(issue.shops as unknown as { name: string } | undefined)?.name} ·{' '}
                      {(issue.equipment as unknown as { name: string } | undefined)?.name} ·{' '}
                      {new Date(issue.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Issue detail */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center">
          <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h2 className="font-bold text-stone-900 truncate pr-4">{selected.title}</h2>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl text-stone-400 hover:bg-stone-100">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              <div className="flex gap-2 flex-wrap">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${severityColor[selected.severity]}`}>
                  {selected.severity}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${issueStatusColor[selected.status]}`}>
                  {issueStatusLabel[selected.status]}
                </span>
              </div>

              <div className="text-sm space-y-2">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Shop & Equipment</p>
                <p className="text-stone-700">
                  {(selected.shops as unknown as { name: string } | undefined)?.name} ·{' '}
                  {(selected.equipment as unknown as { name: string; brand: string; model: string } | undefined)?.name}
                </p>
              </div>

              {selected.description && (
                <div>
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-stone-600 bg-stone-50 rounded-xl px-3 py-2.5 leading-relaxed">{selected.description}</p>
                </div>
              )}

              <div className="text-xs text-stone-400 flex items-center gap-1">
                <Clock size={12} />
                Reported {new Date(selected.created_at).toLocaleString()} by {selected.reporter_name || 'Partner'}
              </div>

              {selected.resolution_notes && (
                <div>
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">Resolution notes</p>
                  <p className="text-sm text-stone-600 bg-green-50 rounded-xl px-3 py-2.5">{selected.resolution_notes}</p>
                </div>
              )}

              {/* Status actions */}
              {selected.status !== 'resolved' && selected.status !== 'closed' && (
                <div className="space-y-3 pt-2 border-t border-stone-100">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                      Resolution notes (optional)
                    </label>
                    <textarea value={resolution} onChange={e => setResolution(e.target.value)} rows={2}
                      placeholder="What was done to resolve this?"
                      className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={resolve} disabled={saving}
                      className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition disabled:opacity-50">
                      {saving ? 'Saving…' : 'Mark resolved'}
                    </button>
                    {selected.status === 'open' && (
                      <button
                        onClick={() => updateIssue(selected.id, { status: 'in_progress' })}
                        disabled={saving}
                        className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-50">
                        Mark in progress
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
