import { Link } from 'react-router-dom';
import { Wrench, Calendar, ChevronRight } from 'lucide-react';
import type { Equipment } from '../types';
import { StatusBadge } from './StatusBadge';

function categoryIcon(cat: Equipment['category']) {
  const icons: Record<string, string> = {
    'Espresso Machine': '☕',
    'Grinder':          '⚙️',
    'Brewer':           '🫖',
    'Refrigeration':    '❄️',
    'Water System':     '💧',
    'Other':            '🔧',
  };
  return icons[cat] ?? '🔧';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

interface EquipmentCardProps {
  equipment: Equipment;
}

export default function EquipmentCard({ equipment }: EquipmentCardProps) {
  return (
    <Link
      to={`/equipment/${equipment.id}`}
      className="card hover:shadow-warm transition-shadow duration-200 block group"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: icon + info */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-cream-100 border border-cream-200 flex items-center justify-center text-xl shrink-0">
            {categoryIcon(equipment.category)}
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-medium text-bark text-base leading-tight group-hover:text-brew-700 transition-colors">
              {equipment.name}
            </h3>
            {equipment.model && (
              <p className="text-xs text-roast-400 mt-0.5 font-mono">{equipment.model}</p>
            )}
            <div className="mt-2">
              <StatusBadge status={equipment.status} />
            </div>
          </div>
        </div>

        {/* Right: arrow */}
        <ChevronRight size={16} className="text-roast-300 group-hover:text-brew-500 transition-colors mt-1 shrink-0" />
      </div>

      {/* Footer: dates */}
      <div className="mt-4 pt-3 border-t border-cream-100 flex gap-4">
        <div className="flex items-center gap-1.5 text-xs text-roast-400">
          <Calendar size={11} />
          <span>Installed {formatDate(equipment.install_date)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-roast-400">
          <Wrench size={11} />
          <span>Serviced {formatDate(equipment.last_service)}</span>
        </div>
      </div>
    </Link>
  );
}
