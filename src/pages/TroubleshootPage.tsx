import { useState } from 'react';
import { Search, ChevronDown, ChevronRight, Zap, AlertCircle, Info } from '../components/Icons';

const GUIDES = [
  {
    category: 'Espresso Machine',
    items: [
      {
        q: 'Machine not reaching pressure / weak shots',
        a: [
          'Check that the portafilter is fully locked in (slight resistance before locking means it\'s not seated)',
          'Grind finer — most pressure loss is due to too-coarse grind',
          'Check the group head seal/gasket — hold a portafilter without a basket and see if water sprays around the edges',
          'Inspect the pump: with no portafilter, the pump should sound strong. A weak pump sound = pump wear',
          'Descale if it\'s been more than 3 months — scale buildup blocks internal valves',
        ],
        urgent: false,
      },
      {
        q: 'Machine leaking water from group head',
        a: [
          'Remove the portafilter and check the group head gasket — if it looks cracked or flattened, it needs replacing',
          'Gasket replacements are standard maintenance (every 6–12 months) and can be ordered from Gobena',
          'If leaking from the bottom/side of the machine, turn it off immediately and log a critical issue',
        ],
        urgent: true,
      },
      {
        q: 'Shots pulling too fast (under 20 seconds)',
        a: [
          'Grind finer — this is the #1 fix for fast shots',
          'Use the correct dose: 18g for double, 14g for single',
          'Distribute grounds evenly before tamping',
          'Tamp with consistent 15–20kg pressure, level to the basket',
          'If shots are consistently fast despite adjusting, check basket for holes (hold it up to light)',
        ],
        urgent: false,
      },
      {
        q: 'Shots pulling too slow (over 35 seconds)',
        a: [
          'Grind coarser — try moving 1–2 clicks at a time',
          'Check dose — overfilling the basket creates excessive resistance',
          'Check for scale buildup: do a backflush and descale cycle',
          'If grinder is at coarsest setting and still slow, the portafilter basket may be clogged — soak in cleaning solution overnight',
        ],
        urgent: false,
      },
      {
        q: 'Machine shows error code / won\'t start',
        a: [
          'Note the exact error code or sequence of lights and include it in your issue report to Gobena',
          'Common fix: turn off, unplug for 30 seconds, plug back in',
          'Check that water tank is full and seated correctly',
          'If the machine was recently moved, check all water connections at the back',
          'Do NOT attempt to open the machine — log a service request',
        ],
        urgent: true,
      },
      {
        q: 'Steam wand not producing steam / weak steam',
        a: [
          'Check that steam switch/knob is fully turned on',
          'Allow 10–15 minutes for full boiler warmup on larger machines',
          'Purge the wand: with a dry cloth, open the steam valve for 3–5 seconds before using',
          'If tip is blocked, remove the tip and soak in hot water for 20 minutes',
          'Descale the boiler if steam has weakened gradually over time',
        ],
        urgent: false,
      },
    ],
  },
  {
    category: 'Grinder',
    items: [
      {
        q: 'Grinder making loud grinding/clicking noise',
        a: [
          'Stop immediately and check for small stones or hard objects that may have entered with the beans',
          'Empty the hopper completely, then restart slowly',
          'If noise continues, burrs may be damaged — log a service request',
          'Do not continue grinding if the noise is metallic — this will damage the burrs further',
        ],
        urgent: true,
      },
      {
        q: 'Grinder running but no grounds coming out',
        a: [
          'Check if hopper is empty',
          'Coffee may be bridging in the hopper — use a tamper to gently break up any clumps',
          'Check the grind chamber — it may be overfilled',
          'Clean the chute with a brush — compacted fine coffee can block flow',
        ],
        urgent: false,
      },
      {
        q: 'Inconsistent grind / uneven extraction',
        a: [
          'Check burr alignment — this requires Gobena service',
          'Replace burrs if you\'ve used more than 1,000kg of coffee through them',
          'Keep grinder hopper less than 2/3 full for consistent temperature',
          'Clean burrs weekly — coffee oils build up and change grind characteristics',
        ],
        urgent: false,
      },
    ],
  },
  {
    category: 'Water & Filtration',
    items: [
      {
        q: 'Water filter indicator showing change needed',
        a: [
          'Replace water filter immediately — running without filtration causes rapid scale buildup',
          'Contact Gobena to order a replacement — note your filter model',
          'After replacing, reset the filter counter per machine manual',
          'Run 2–3 liters of water through before brewing to flush the new filter',
        ],
        urgent: false,
      },
      {
        q: 'Coffee tastes strange / different from usual',
        a: [
          'Check water filter — a depleted filter is the #1 cause of flavor change',
          'Check coffee freshness — beans oxidize quickly after roast date',
          'Clean all equipment: group heads, steam wands, grinder burrs, and milk pitchers',
          'Check refrigerator temperature for milk — should be 1–4°C',
          'If taste change is sudden, check water source (local treatment changes affect taste)',
        ],
        urgent: false,
      },
    ],
  },
  {
    category: 'Milk Equipment',
    items: [
      {
        q: 'Can\'t achieve microfoam / milk not texturing',
        a: [
          'Purge the steam wand for 3–5 seconds before steaming',
          'Use fresh, cold milk (straight from fridge)',
          'Submerge the tip just below the surface and keep the pitcher angled',
          'Listen for a paper-tearing sound — that\'s correctly incorporated air',
          'If steam pressure is low, the machine may need descaling',
        ],
        urgent: false,
      },
      {
        q: 'Milk fridge temperature out of range',
        a: [
          'Safe milk temperature: 1–4°C. Above 5°C is a food safety concern',
          'Check that door seals are intact — run your hand around the edges',
          'Clean condenser coils (usually at back/bottom of fridge)',
          'If the fridge can\'t hold temperature, log as high severity and use backup cooling',
          'Do not serve milk stored above 5°C for more than 2 hours',
        ],
        urgent: true,
      },
    ],
  },
];

export default function TroubleshootPage() {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState<string | null>(null);

  const filtered = GUIDES.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      !query ||
      item.q.toLowerCase().includes(query.toLowerCase()) ||
      item.a.some(a => a.toLowerCase().includes(query.toLowerCase()))
    ),
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="min-h-screen bg-stone-50 pb-24 md:pb-10">
      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-6 md:pt-8 space-y-5">

        <div>
          <h1 className="text-2xl font-bold text-stone-900">Troubleshoot</h1>
          <p className="text-sm text-stone-400 mt-0.5">Common issues and how to fix them</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            placeholder="Search issues…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-stone-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Tip */}
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5">
          <Info size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Try the steps in order before logging an issue. If a step fixes it, still log it — patterns help Gobena prevent recurring problems.
          </p>
        </div>

        {/* Guide sections */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <p className="text-sm">No guides match your search</p>
            <p className="text-xs mt-1 text-stone-300">Try different keywords, or log an issue if you can't find help</p>
          </div>
        ) : (
          filtered.map(cat => (
            <div key={cat.category}>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">{cat.category}</p>
              <div className="space-y-2">
                {cat.items.map(item => (
                  <div key={item.q} className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
                    <button
                      onClick={() => setOpen(open === item.q ? null : item.q)}
                      className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-stone-50 transition"
                    >
                      {item.urgent
                        ? <AlertCircle size={16} className="text-red-400 shrink-0" />
                        : <Zap size={16} className="text-amber-500 shrink-0" />
                      }
                      <p className="flex-1 text-sm font-medium text-stone-800">{item.q}</p>
                      {open === item.q
                        ? <ChevronDown size={16} className="text-stone-300 shrink-0" />
                        : <ChevronRight size={16} className="text-stone-300 shrink-0" />
                      }
                    </button>

                    {open === item.q && (
                      <div className="px-4 pb-4 border-t border-stone-50">
                        {item.urgent && (
                          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 mt-3 mb-3">
                            <AlertCircle size={13} />
                            This may be urgent — if steps don't help, log a critical issue immediately
                          </div>
                        )}
                        <ol className="space-y-2.5 mt-3">
                          {item.a.map((step, i) => (
                            <li key={i} className="flex gap-3">
                              <span className="shrink-0 w-5 h-5 rounded-full bg-stone-100 text-stone-500 text-xs font-bold flex items-center justify-center mt-0.5">
                                {i + 1}
                              </span>
                              <p className="text-sm text-stone-600 leading-relaxed">{step}</p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
