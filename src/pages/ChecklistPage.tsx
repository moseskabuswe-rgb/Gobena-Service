import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import type { ChecklistItem, ChecklistCompletion, ChecklistType } from '../types';
import { CheckCircle, Circle, ClipboardList, Clock } from '../components/Icons';

// ─── Checklist definitions ────────────────────────────────────────────────────
const CHECKLISTS: Record<ChecklistType, { label: string; items: Omit<ChecklistItem, 'completed' | 'completed_at'>[] }> = {
  opening: {
    label: 'Opening',
    items: [
      { id: 'o1', label: 'Flush espresso machine group heads (20 sec each)' },
      { id: 'o2', label: 'Check water reservoir / filter levels' },
      { id: 'o3', label: 'Prime steam wands — purge and wipe' },
      { id: 'o4', label: 'Check grinder settings, dose a test shot' },
      { id: 'o5', label: 'Inspect milk fridge temp (1–4°C)' },
      { id: 'o6', label: 'Check drip trays, empty if needed' },
      { id: 'o7', label: 'Clean and sanitize counters and portafilters' },
      { id: 'o8', label: 'Test all equipment before opening — log any issues' },
    ],
  },
  closing: {
    label: 'Closing',
    items: [
      { id: 'c1', label: 'Backflush espresso machine (blind basket + cleaner)' },
      { id: 'c2', label: 'Remove and soak portafilters in cleaning solution' },
      { id: 'c3', label: 'Clean group head seals and shower screens' },
      { id: 'c4', label: 'Purge, rinse, and dry steam wands' },
      { id: 'c5', label: 'Empty and clean grinder hopper if needed' },
      { id: 'c6', label: 'Wash all milk pitchers, tampers, and tools' },
      { id: 'c7', label: 'Empty and sanitize drip trays' },
      { id: 'c8', label: 'Wipe down all machine exteriors' },
      { id: 'c9', label: 'Turn off equipment in correct order' },
      { id: 'c10', label: 'Record any issues noticed during shift' },
    ],
  },
  weekly: {
    label: 'Weekly',
    items: [
      { id: 'w1', label: 'Deep clean grinder — remove burrs, brush internals' },
      { id: 'w2', label: 'Clean water softener / check filter status' },
      { id: 'w3', label: 'Descale steam boilers if indicator shows' },
      { id: 'w4', label: 'Inspect all group head gaskets for wear' },
      { id: 'w5', label: 'Check all machine feet / stability' },
      { id: 'w6', label: 'Calibrate grinder — pull and taste test shots' },
      { id: 'w7', label: 'Clean refrigerator coils (brew milk fridge)' },
      { id: 'w8', label: 'Review open issues — follow up with Gobena if unresolved' },
    ],
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChecklistPage() {
  const { profile, shop } = useAuth();
  const [tab, setTab]         = useState<ChecklistType>('opening');
  const [items, setItems]     = useState<ChecklistItem[]>([]);
  const [completionId, setCompletionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const initItems = useCallback((type: ChecklistType, existing?: ChecklistItem[]): ChecklistItem[] => {
    return CHECKLISTS[type].items.map(item => {
      const found = existing?.find(e => e.id === item.id);
      return found || { ...item, completed: false, completed_at: null };
    });
  }, []);

  const loadChecklist = useCallback(async (type: ChecklistType) => {
    if (!shop?.id || !profile?.id) return;
    setLoading(true);

    const { data } = await supabase
      .from('checklist_completions')
      .select('id, items')
      .eq('shop_id', shop.id)
      .eq('checklist_type', type)
      .eq('date', today)
      .maybeSingle();

    if (data) {
      setCompletionId(data.id);
      setItems(initItems(type, data.items as ChecklistItem[]));
    } else {
      setCompletionId(null);
      setItems(initItems(type));
    }
    setLoading(false);
  }, [shop?.id, profile?.id, today, initItems]);

  useEffect(() => {
    loadChecklist(tab);
  }, [tab, loadChecklist]);

  const toggleItem = async (itemId: string) => {
    const now = new Date().toISOString();
    const updated = items.map(item =>
      item.id === itemId
        ? { ...item, completed: !item.completed, completed_at: !item.completed ? now : null }
        : item
    );
    setItems(updated);
    setSaving(true);

    if (completionId) {
      // Update existing
      await supabase
        .from('checklist_completions')
        .update({ items: updated })
        .eq('id', completionId);
    } else {
      // Create new
      const { data } = await supabase
        .from('checklist_completions')
        .insert({
          shop_id: shop!.id,
          completed_by: profile!.id,
          checklist_type: tab,
          items: updated,
          date: today,
        })
        .select('id')
        .single();
      if (data) setCompletionId(data.id);
    }

    setLastSaved(new Date());
    setSaving(false);
  };

  const completed = items.filter(i => i.completed).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-stone-50 pb-24 md:pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Daily checklist</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
          {(Object.keys(CHECKLISTS) as ChecklistType[]).map(type => (
            <button
              key={type}
              onClick={() => setTab(type)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                tab === type
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500'
              }`}
            >
              {CHECKLISTS[type].label}
            </button>
          ))}
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl border border-stone-100 px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">{CHECKLISTS[tab].label} checklist</p>
              <p className="text-2xl font-bold text-stone-900 mt-0.5">{completed}/{total} <span className="text-sm font-normal text-stone-400">completed</span></p>
            </div>
            {pct === 100 && (
              <div className="flex items-center gap-1.5 text-green-600 bg-green-50 rounded-xl px-3 py-1.5">
                <CheckCircle size={16} />
                <span className="text-xs font-semibold">Done!</span>
              </div>
            )}
          </div>
          <div className="w-full bg-stone-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Checklist items */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-100 divide-y divide-stone-50">
            {items.map((item, i) => (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`w-full flex items-start gap-3.5 px-4 py-4 text-left hover:bg-stone-50 transition
                  ${i === 0 ? 'rounded-t-2xl' : ''} ${i === items.length - 1 ? 'rounded-b-2xl' : ''}`}
              >
                {item.completed
                  ? <CheckCircle size={20} className="text-green-500 shrink-0 mt-0.5" />
                  : <Circle size={20} className="text-stone-300 shrink-0 mt-0.5" />
                }
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${item.completed ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
                    {item.label}
                  </p>
                  {item.completed && item.completed_at && (
                    <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(item.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {lastSaved && (
          <p className="text-xs text-center text-stone-400">
            {saving ? 'Saving…' : `Saved ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        )}

      </div>
    </div>
  );
}
