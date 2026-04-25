import { useEffect, useState } from 'react';
import { Search, BookOpen, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { getTroubleshootEntries } from '../lib/queries';
import type { TroubleshootEntry } from '../types';

const CATEGORIES = [
  'All',
  'Espresso Machine',
  'Grinder',
  'Brewer',
  'Refrigeration',
  'Water System',
  'Other',
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function EntryCard({ entry }: { entry: TroubleshootEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="badge bg-brew-50 text-brew-700 border border-brew-200">
                {entry.issue_type}
              </span>
              <span className="badge bg-cream-100 text-roast-600 border border-cream-200">
                {entry.equipment_category}
              </span>
              {entry.equipment_model && (
                <span className="text-xs font-mono text-roast-400">{entry.equipment_model}</span>
              )}
            </div>
            <p className="text-sm font-medium text-bark mt-1 leading-snug">
              {entry.problem_description}
            </p>
            <p className="text-xs text-roast-400 mt-1">{formatDate(entry.created_at)}</p>
          </div>
          <div className="shrink-0 text-roast-400 mt-1">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-cream-100 space-y-4">
          {/* Resolution */}
          <div>
            <p className="text-xs font-medium text-roast-500 uppercase tracking-wide mb-1.5">
              How Gobena Fixed It
            </p>
            <p className="text-sm text-bark leading-relaxed whitespace-pre-line">
              {entry.resolution_steps}
            </p>
          </div>

          {/* Root cause */}
          {entry.root_cause && (
            <div>
              <p className="text-xs font-medium text-roast-500 uppercase tracking-wide mb-1.5">
                Root Cause
              </p>
              <p className="text-sm text-roast-700">{entry.root_cause}</p>
            </div>
          )}

          {/* Parts replaced */}
          {entry.parts_replaced && (
            <div>
              <p className="text-xs font-medium text-roast-500 uppercase tracking-wide mb-1.5">
                Parts Replaced
              </p>
              <p className="text-sm text-roast-700 font-mono">{entry.parts_replaced}</p>
            </div>
          )}

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag size={12} className="text-roast-400" />
              {entry.tags.map(tag => (
                <span key={tag} className="text-xs bg-cream-100 text-roast-500 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TroubleshootPage() {
  const [entries,  setEntries]  = useState<TroubleshootEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('All');

  const load = async () => {
    setLoading(true);
    const data = await getTroubleshootEntries({
      category: category === 'All' ? undefined : category,
      search:   search.trim() || undefined,
    });
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [category]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(load, 400);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="page-title">Troubleshoot Library</h1>
        <p className="page-subtitle">
          Common issues and how Gobena resolved them — search before submitting a new request
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-roast-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search issues, symptoms, resolutions…"
          className="form-input pl-9"
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
              category === cat
                ? 'bg-brew-700 text-cream-50'
                : 'bg-white text-roast-500 border border-cream-200 hover:border-brew-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="w-8 h-8 animate-spin text-brew-400" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
      ) : entries.length === 0 ? (
        <div className="card text-center py-12">
          <BookOpen size={36} className="mx-auto text-roast-300 mb-3" />
          {search || category !== 'All' ? (
            <>
              <p className="font-display text-base text-bark">No matches found</p>
              <p className="text-sm text-roast-400 mt-1">
                Try a different search term or category, or{' '}
                <button
                  onClick={() => { setSearch(''); setCategory('All'); }}
                  className="text-brew-600 hover:underline"
                >
                  clear filters
                </button>
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-base text-bark">Library is building</p>
              <p className="text-sm text-roast-400 mt-1">
                Resolved service requests will automatically appear here as Gobena closes tickets.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
          <p className="text-xs text-center text-roast-300 pt-1">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
      )}
    </main>
  );
}
