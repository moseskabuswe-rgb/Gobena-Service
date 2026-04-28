import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEquipmentById, getMaintenanceLogs } from '../lib/queries';
import type { Equipment, MaintenanceLog } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import GuidedIssueForm from '../components/GuidedIssueForm';
import ServiceRequestForm from '../components/ServiceRequestForm';
import QRCode from '../components/QRCode';
import { useAuth } from '../lib/AuthContext';
import {
  ArrowLeft, Calendar, Hash, Tag, Wrench,
  AlertCircle, CheckCircle, Zap,
  ClipboardList, PenLine, QrCode, Printer,
} from 'lucide-react';

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const LOG_TYPE_CONFIG: Record<MaintenanceLog['log_type'], {
  label: string; color: string; icon: React.ElementType;
}> = {
  maintenance: { label: 'Maintenance', color: 'bg-brew-100 text-brew-700 border-brew-200',         icon: Wrench       },
  repair:      { label: 'Repair',      color: 'bg-red-50 text-red-600 border-red-200',             icon: AlertCircle  },
  inspection:  { label: 'Inspection',  color: 'bg-blue-50 text-blue-600 border-blue-200',          icon: CheckCircle  },
  install:     { label: 'Install',     color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Zap          },
};

// Skeleton shown instantly while data loads — barista sees something right away
function Skeleton() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="w-16 h-4 bg-cream-200 rounded-full animate-pulse"/>
      <div className="card space-y-4">
        <div className="w-20 h-3 bg-cream-200 rounded-full animate-pulse"/>
        <div className="w-48 h-6 bg-cream-200 rounded-full animate-pulse"/>
        <div className="w-32 h-4 bg-cream-200 rounded-full animate-pulse"/>
        <div className="w-24 h-6 bg-cream-200 rounded-xl animate-pulse"/>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-14 bg-cream-200 rounded-2xl animate-pulse"/>
        <div className="h-14 bg-cream-200 rounded-2xl animate-pulse"/>
      </div>
    </main>
  );
}

export default function EquipmentDetailPage() {
  const { id }      = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate    = useNavigate();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [logs,      setLogs]      = useState<MaintenanceLog[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [showLog,   setShowLog]   = useState(false);
  const [showQR,    setShowQR]    = useState(false);

  const isAdmin      = profile?.role === 'admin';
  const equipmentUrl = `${window.location.origin}/equipment/${id}`;

  const loadData = async () => {
    if (!id) return;
    // Load equipment and logs in parallel — don't wait for auth
    // Auth context loads separately and profile arrives when ready
    const [eq, mainLogs] = await Promise.all([
      getEquipmentById(id),
      getMaintenanceLogs(id),
    ]);
    if (!eq) { setNotFound(true); setLoading(false); return; }
    setEquipment(eq);
    setLogs(mainLogs);
    setLoading(false);
  };

  // Start loading data immediately on mount — don't wait for auth
  useEffect(() => { loadData(); }, [id]);

  if (loading)   return <Skeleton/>;

  if (notFound) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="card text-center py-12">
          <p className="text-roast-400 mb-4">Equipment not found.</p>
          <button onClick={() => navigate(-1)} className="btn-secondary mx-auto">Go Back</button>
        </div>
      </main>
    );
  }

  if (!equipment) return null;

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-roast-400 hover:text-bark transition-colors"
      >
        <ArrowLeft size={14}/> Back
      </button>

      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-roast-400 uppercase tracking-wide mb-1">
              {equipment.category}
              {equipment.shops && ` · ${(equipment.shops as any).name}`}
            </p>
            <h1 className="font-display text-xl font-semibold text-bark">{equipment.name}</h1>
            {equipment.model && (
              <p className="text-sm text-roast-500 mt-0.5">{equipment.model}</p>
            )}
            <div className="mt-3">
              <StatusBadge status={equipment.status}/>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowQR(v => !v)}
              className={`p-2 rounded-xl border transition-colors shrink-0 ${
                showQR
                  ? 'bg-brew-700 text-cream-50 border-brew-700'
                  : 'bg-cream-50 text-roast-500 border-cream-200 hover:border-brew-300'
              }`}
              title="Show QR code"
            >
              <QrCode size={18}/>
            </button>
          )}
        </div>

        {/* QR panel */}
        {isAdmin && showQR && (
          <div className="mt-4 pt-4 border-t border-cream-100 flex flex-col sm:flex-row items-center gap-5">
            <div className="p-3 rounded-xl border border-cream-200 bg-foam shrink-0">
              <QRCode value={equipmentUrl} size={140}/>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-sm font-medium text-bark">QR Code for this machine</p>
              <p className="text-xs text-roast-400 mt-1">
                Print and stick on the equipment. Scanning opens this page.
              </p>
              <p className="text-xs font-mono text-roast-300 mt-2 break-all">{equipmentUrl}</p>
              <Link
                to={`/equipment/${id}/qr`}
                target="_blank"
                className="btn-secondary mt-3 inline-flex text-xs py-2"
              >
                <Printer size={13}/> Open Print View
              </Link>
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-cream-100">
          <div className="flex items-start gap-2">
            <Calendar size={14} className="text-roast-400 mt-0.5 shrink-0"/>
            <div>
              <p className="text-xs text-roast-400">Installed</p>
              <p className="text-sm font-medium text-bark">{formatDate(equipment.install_date)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Wrench size={14} className="text-roast-400 mt-0.5 shrink-0"/>
            <div>
              <p className="text-xs text-roast-400">Last Service</p>
              <p className="text-sm font-medium text-bark">{formatDate(equipment.last_service)}</p>
            </div>
          </div>
          {equipment.serial_number && (
            <div className="flex items-start gap-2">
              <Hash size={14} className="text-roast-400 mt-0.5 shrink-0"/>
              <div>
                <p className="text-xs text-roast-400">Serial No.</p>
                <p className="text-sm font-medium text-bark font-mono">{equipment.serial_number}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Tag size={14} className="text-roast-400 mt-0.5 shrink-0"/>
            <div>
              <p className="text-xs text-roast-400">Equipment ID</p>
              <p className="text-sm font-medium text-bark font-mono">{equipment.id.slice(0, 8)}…</p>
            </div>
          </div>
        </div>

        {equipment.notes && (
          <div className="mt-4 pt-4 border-t border-cream-100">
            <p className="text-xs text-roast-400 mb-1">Notes</p>
            <p className="text-sm text-roast-600">{equipment.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowIssue(true)}
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-brew-700 text-cream-50 font-medium text-sm hover:bg-brew-800 transition-colors shadow-sm active:scale-95"
        >
          <AlertCircle size={16}/> Log Issue
        </button>
        {isAdmin ? (
          <button
            onClick={() => setShowLog(true)}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-cream-100 text-roast-700 font-medium text-sm hover:bg-cream-200 transition-colors border border-cream-300 active:scale-95"
          >
            <PenLine size={16}/> Log Service Entry
          </button>
        ) : (
          <button
            onClick={() => setShowIssue(true)}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-cream-100 text-roast-700 font-medium text-sm hover:bg-cream-200 transition-colors border border-cream-300 active:scale-95"
          >
            <ClipboardList size={16}/> Request Service
          </button>
        )}
      </div>

      {/* Service history */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Service History</h2>
          <span className="text-xs text-roast-400">{logs.length} entries</span>
        </div>

        {logs.length === 0 ? (
          <div className="card text-center py-8 text-roast-400 text-sm">No service history yet.</div>
        ) : (
          <div className="relative">
            <div className="absolute left-[18px] top-4 bottom-4 w-px bg-cream-200"/>
            <div className="space-y-3">
              {logs.map(log => {
                const cfg  = LOG_TYPE_CONFIG[log.log_type];
                const Icon = cfg.icon;
                return (
                  <div key={log.id} className="flex gap-4">
                    <div className={`relative z-10 w-9 h-9 rounded-full border flex items-center justify-center shrink-0 bg-white ${cfg.color}`}>
                      <Icon size={14}/>
                    </div>
                    <div className="card flex-1 mb-0 py-3 px-4">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`badge border ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-xs text-roast-400">{formatDateTime(log.performed_at)}</span>
                      </div>
                      <p className="text-sm text-bark leading-snug">{log.description}</p>
                      <p className="text-xs text-roast-400 mt-1.5">by {log.performed_by}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Modals */}
      {showIssue && (
        <GuidedIssueForm
          equipment={equipment}
          onClose={() => setShowIssue(false)}
          onSuccess={() => { setShowIssue(false); loadData(); }}
        />
      )}
      {showLog && (
        <ServiceRequestForm
          equipment={equipment}
          onClose={() => setShowLog(false)}
          onSuccess={() => { setShowLog(false); loadData(); }}
        />
      )}
    </main>
  );
}
