import type { EquipmentStatus, RequestStatus, RequestPriority } from '../types';

interface EquipmentStatusBadgeProps {
  status: EquipmentStatus;
}

export function StatusBadge({ status }: EquipmentStatusBadgeProps) {
  const map: Record<EquipmentStatus, { label: string; classes: string; dot: string }> = {
    good:             { label: 'Good',            classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
    needs_attention:  { label: 'Needs Attention', classes: 'bg-amber-50 text-amber-700 border border-amber-200',   dot: 'bg-amber-500'   },
    urgent:           { label: 'Urgent',           classes: 'bg-red-50 text-red-700 border border-red-200',         dot: 'bg-red-500'     },
  };
  const { label, classes, dot } = map[status];
  return (
    <span className={`badge ${classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

interface RequestStatusBadgeProps {
  status: RequestStatus;
}

export function RequestStatusBadge({ status }: RequestStatusBadgeProps) {
  const map: Record<RequestStatus, { label: string; classes: string }> = {
    open:        { label: 'Open',        classes: 'bg-blue-50 text-blue-700 border border-blue-200'       },
    in_progress: { label: 'In Progress', classes: 'bg-amber-50 text-amber-700 border border-amber-200'   },
    resolved:    { label: 'Resolved',    classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    closed:      { label: 'Closed',      classes: 'bg-gray-100 text-gray-500 border border-gray-200'      },
  };
  const { label, classes } = map[status];
  return <span className={`badge ${classes}`}>{label}</span>;
}

interface PriorityBadgeProps {
  priority: RequestPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const map: Record<RequestPriority, { label: string; classes: string }> = {
    low:    { label: 'Low',    classes: 'bg-gray-100 text-gray-500 border border-gray-200'     },
    normal: { label: 'Normal', classes: 'bg-brew-50 text-brew-700 border border-brew-200'      },
    high:   { label: 'High',   classes: 'bg-orange-50 text-orange-700 border border-orange-200' },
    urgent: { label: 'Urgent', classes: 'bg-red-50 text-red-700 border border-red-200'         },
  };
  const { label, classes } = map[priority];
  return <span className={`badge ${classes}`}>{label}</span>;
}
