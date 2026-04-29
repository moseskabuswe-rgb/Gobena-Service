import { useState } from 'react';
import { CheckCircle, Circle, ChevronDown, ChevronUp, AlertTriangle } from '../components/Icons';

interface ChecklistItem {
  id: string;
  label: string;
  note?: string;
  critical?: boolean;
}

interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItem[];
}

const OPENING_CHECKLIST: ChecklistSection[] = [
  {
    id: 'espresso-machine',
    title: 'Espresso Machine',
    items: [
      { id: 'em-1', label: 'Turn on machine and allow full warm-up (30+ min before service)', critical: true },
      { id: 'em-2', label: 'Check boiler pressure gauge (should read 1.0–1.2 bar)' },
      { id: 'em-3', label: 'Flush each group head for 5 seconds' },
      { id: 'em-4', label: 'Check extraction pressure (should read 8.5–9.5 bar during pull)', critical: true },
      { id: 'em-5', label: 'Pull test shots and check yield/time (aim for 18–20g in, 36–40g out, 25–30 sec)' },
      { id: 'em-6', label: 'Wipe and purge steam wands' },
      { id: 'em-7', label: 'Check portafilter baskets are clean and dry' },
      { id: 'em-8', label: 'Inspect drip tray — empty if needed' },
    ],
  },
  {
    id: 'grinder',
    title: 'Grinder',
    items: [
      { id: 'gr-1', label: 'Check grind consistency with test dose', critical: true },
      { id: 'gr-2', label: 'Verify grind setting hasn\'t drifted overnight (temperature affects burrs)' },
      { id: 'gr-3', label: 'Check hopper is sufficiently full' },
      { id: 'gr-4', label: 'Wipe grind chamber and chute of old grounds' },
    ],
  },
  {
    id: 'water',
    title: 'Water & Filter',
    items: [
      { id: 'wt-1', label: 'Check water softener/filter — note any change in flow or taste' },
      { id: 'wt-2', label: 'Check water tank level (if applicable)' },
      { id: 'wt-3', label: 'Inspect water lines for visible leaks under bar', critical: true },
    ],
  },
  {
    id: 'bar',
    title: 'Bar & Refrigeration',
    items: [
      { id: 'br-1', label: 'Check milk fridge temp (below 4°C / 40°F)', critical: true },
      { id: 'br-2', label: 'Wipe down all equipment surfaces' },
      { id: 'br-3', label: 'Stock milk, syrups, and supplies' },
      { id: 'br-4', label: 'Check blind filter and backflush if needed' },
    ],
  },
];

const CLOSING_CHECKLIST: ChecklistSection[] = [
  {
    id: 'espresso-close',
    title: 'Espresso Machine',
    items: [
      { id: 'ec-1', label: 'Backflush each group head with blind filter and cleaner', critical: true },
      { id: 'ec-2', label: 'Remove and soak portafilter baskets in cleaning solution' },
      { id: 'ec-3', label: 'Flush groups with clean water after backflush' },
      { id: 'ec-4', label: 'Clean steam wands with damp cloth — purge completely', critical: true },
      { id: 'ec-5', label: 'Empty and clean drip tray' },
      { id: 'ec-6', label: 'Wipe down machine exterior' },
      { id: 'ec-7', label: 'Turn off machine (or set to overnight mode if applicable)' },
    ],
  },
  {
    id: 'grinder-close',
    title: 'Grinder',
    items: [
      { id: 'gc-1', label: 'Empty hopper if slow day (stale beans affect quality)' },
      { id: 'gc-2', label: 'Brush out grind chute and chamber' },
      { id: 'gc-3', label: 'Wipe exterior clean' },
    ],
  },
  {
    id: 'bar-close',
    title: 'Bar & Refrigeration',
    items: [
      { id: 'bc-1', label: 'Label and date all opened milk — discard if expired' },
      { id: 'bc-2', label: 'Wipe down bar surfaces and equipment' },
      { id: 'bc-3', label: 'Empty knock box and rinse' },
      { id: 'bc-4', label: 'Check fridge temp one last time', critical: true },
      { id: 'bc-5', label: 'Restock supplies for morning opening' },
    ],
  },
];

const WEEKLY_TASKS = [
  { id: 'w-1', label: 'Deep clean group heads — remove and soak shower screens', critical: true },
  { id: 'w-2', label: 'Check and record TDS reading from water filter' },
  { id: 'w-3', label: 'Inspect all gaskets and seals for wear' },
  { id: 'w-4', label: 'Clean grinder burrs with grinder cleaner tablets' },
  { id: 'w-5', label: 'Descale steam wands if scale visible' },
  { id: 'w-6', label: 'Calibrate grind against shot parameters', critical: true },
  { id: 'w-7', label: 'Check refrigeration coils for dust buildup' },
];

type ListType = 'opening' | 'closing' | 'weekly';

function Section({
  section,
  checked,
  onToggle,
}: {
  section: ChecklistSection;
  checked: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const total = section.items.length;
  const done  = section.items.filter(i => checked.has(i.id)).length;

  return (
    <div className="card p-0 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-cream-50/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
            done === total ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-roast-500'
          }`}>
            {done}/{total}
          </div>
          <span className="font-medium text-bark text-sm">{section.title}</span>
        </div>
        {open ? <ChevronUp size={15} className="text-roast-400"/> : <ChevronDown size={15} className="text-roast-400"/>}
      </button>

      {open && (
        <div className="divide-y divide-cream-100 border-t border-cream-100">
          {section.items.map(item => (
            <button
              key={item.id}
              onClick={() => onToggle(item.id)}
              className="flex items-start gap-3 px-4 py-3 w-full text-left hover:bg-cream-50/40 transition-colors"
            >
              {checked.has(item.id)
                ? <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5"/>
                : <Circle size={18} className="text-cream-300 shrink-0 mt-0.5"/>
              }
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${checked.has(item.id) ? 'text-roast-400 line-through' : 'text-bark'}`}>
                  {item.label}
                </p>
                {item.critical && !checked.has(item.id) && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 mt-0.5">
                    <AlertTriangle size={10}/> Critical
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChecklistPage() {
  const [activeList, setActiveList] = useState<ListType>('opening');
  const [checked,    setChecked]    = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const switchList = (list: ListType) => {
    setActiveList(list);
    setChecked(new Set()); // reset checks when switching list
  };

  const sections   = activeList === 'opening' ? OPENING_CHECKLIST : activeList === 'closing' ? CLOSING_CHECKLIST : [];
  const weeklyDone = WEEKLY_TASKS.filter(t => checked.has(t.id)).length;

  const totalItems = activeList === 'weekly'
    ? WEEKLY_TASKS.length
    : sections.reduce((acc, s) => acc + s.items.length, 0);
  const totalDone = activeList === 'weekly'
    ? weeklyDone
    : sections.reduce((acc, s) => acc + s.items.filter(i => checked.has(i.id)).length, 0);

  const allDone = totalDone === totalItems && totalItems > 0;

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="page-title">Daily Checklists</h1>
        <p className="page-subtitle">Keep your equipment running right — check off as you go</p>
      </div>

      {/* List selector */}
      <div className="flex gap-2">
        {(['opening','closing','weekly'] as ListType[]).map(list => (
          <button
            key={list}
            onClick={() => switchList(list)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors capitalize ${
              activeList === list
                ? 'bg-brew-700 text-cream-50'
                : 'bg-white text-roast-500 border border-cream-200 hover:border-brew-300'
            }`}
          >
            {list === 'opening' ? '☀️ Opening' : list === 'closing' ? '🌙 Closing' : '📅 Weekly'}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-roast-400">{totalDone} of {totalItems} complete</span>
          {allDone && <span className="text-xs font-medium text-emerald-600">✓ All done!</span>}
        </div>
        <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brew-600 rounded-full transition-all duration-300"
            style={{ width: totalItems ? `${(totalDone / totalItems) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Sections */}
      {activeList !== 'weekly' ? (
        <div className="space-y-3">
          {sections.map(section => (
            <Section key={section.id} section={section} checked={checked} onToggle={toggle}/>
          ))}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden divide-y divide-cream-100">
          {WEEKLY_TASKS.map(task => (
            <button
              key={task.id}
              onClick={() => toggle(task.id)}
              className="flex items-start gap-3 px-4 py-3.5 w-full text-left hover:bg-cream-50/40 transition-colors"
            >
              {checked.has(task.id)
                ? <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5"/>
                : <Circle size={18} className="text-cream-300 shrink-0 mt-0.5"/>
              }
              <div className="flex-1">
                <p className={`text-sm leading-snug ${checked.has(task.id) ? 'text-roast-400 line-through' : 'text-bark'}`}>
                  {task.label}
                </p>
                {task.critical && !checked.has(task.id) && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 mt-0.5">
                    <AlertTriangle size={10}/> Critical
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Reset button */}
      {totalDone > 0 && (
        <button
          onClick={() => setChecked(new Set())}
          className="text-xs text-roast-400 hover:text-roast-600 w-full text-center pt-1"
        >
          Reset checklist
        </button>
      )}

      <p className="text-xs text-center text-roast-300 pb-2">
        Checklists reset when you switch tabs or reload — keep this page open during your shift
      </p>
    </main>
  );
}
