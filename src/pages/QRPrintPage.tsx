import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEquipmentById } from '../lib/queries';
import type { Equipment } from '../types';
import QRCode from '../components/QRCode';
import { Printer, ArrowLeft } from 'lucide-react';


export default function QRPrintPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading,   setLoading]   = useState(true);

  // The URL a QR scan will open
  const qrUrl = `${window.location.origin}/equipment/${id}`;

  useEffect(() => {
    if (!id) return;
    getEquipmentById(id).then(eq => {
      setEquipment(eq);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <svg className="w-8 h-8 animate-spin text-brew-400" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-roast-400">Equipment not found.</p>
        <button onClick={() => navigate(-1)} className="btn-secondary">Go Back</button>
      </div>
    );
  }

  return (
    <>
      {/* Screen controls — hidden when printing */}
      <div className="print:hidden flex items-center justify-between px-6 py-4 border-b border-cream-200 bg-white">
        <button
          onClick={() => navigate(`/equipment/${id}`)}
          className="flex items-center gap-1.5 text-sm text-roast-500 hover:text-bark"
        >
          <ArrowLeft size={14} /> Back to equipment
        </button>
        <button
          onClick={() => window.print()}
          className="btn-primary"
        >
          <Printer size={14} /> Print Label
        </button>
      </div>

      {/* Preview area */}
      <div className="print:p-0 p-8 bg-foam min-h-screen flex items-center justify-center print:bg-white print:block">

        {/* The printable label card */}
        <div
          id="qr-label"
          className="
            bg-white rounded-2xl shadow-warm border border-cream-200
            p-8 flex flex-col items-center gap-4 w-72
            print:shadow-none print:border-0 print:rounded-none print:w-full print:p-6
          "
        >
          {/* Gobena branding */}
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="Gobena Coffee" className="w-7 h-7 rounded-md object-cover" />
            <span className="font-display text-sm font-semibold text-bark tracking-tight">
              Gobena Service
            </span>
          </div>

          {/* QR Code */}
          <div className="p-3 rounded-xl border-2 border-cream-200 bg-foam">
            <QRCode value={qrUrl} size={180} />
          </div>

          {/* Equipment info */}
          <div className="text-center space-y-1">
            <p className="font-display font-semibold text-bark text-lg leading-tight">
              {equipment.name}
            </p>
            {equipment.model && (
              <p className="text-xs text-roast-400 font-mono">{equipment.model}</p>
            )}
            <p className="text-xs text-roast-400">{equipment.category}</p>
            {equipment.serial_number && (
              <p className="text-xs font-mono text-roast-500 mt-1">
                S/N: {equipment.serial_number}
              </p>
            )}
          </div>

          {/* CTA */}
          <div className="text-center pt-1 border-t border-cream-100 w-full">
            <p className="text-xs text-roast-500 font-medium">Scan to report an issue</p>
            <p className="text-xs text-roast-300 mt-0.5 break-all font-mono">{qrUrl}</p>
          </div>
        </div>

        {/* Print instructions — screen only */}
        <div className="print:hidden mt-6 text-center">
          <p className="text-sm text-roast-400">
            Print this label and stick it on the machine.
          </p>
          <p className="text-xs text-roast-300 mt-1">
            Scanning the QR code lands directly on this equipment's page.
          </p>
        </div>
      </div>
    </>
  );
}
