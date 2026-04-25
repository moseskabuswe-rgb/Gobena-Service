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
      <div className="flex items-center justify-center min-h-screen bg-foam">
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
      {/*
        Print styles injected as a <style> tag so they work even when Tailwind's
        print: variants aren't compiled. This is the most reliable approach.
      */}
      <style>{`
        @media print {
          body { margin: 0; padding: 0; background: white; }

          /* Hide everything except the label */
          .no-print { display: none !important; }

          /* The label itself prints at actual size */
          .print-label {
            width: 3.5in;
            box-shadow: none !important;
            border: 1px solid #ccc !important;
            border-radius: 0 !important;
            margin: 0 auto;
            page-break-inside: avoid;
          }

          /* Force white background on the label body */
          .print-label-body {
            background: white !important;
          }
        }
      `}</style>

      {/* Screen toolbar — hidden when printing */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-cream-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <button
          onClick={() => navigate(`/equipment/${id}`)}
          className="flex items-center gap-1.5 text-sm text-roast-500 hover:text-bark transition-colors"
        >
          <ArrowLeft size={14} /> Back to equipment
        </button>

        <div className="flex items-center gap-3">
          <p className="text-xs text-roast-400 hidden sm:block">
            The QR code is an image — it will print correctly in all browsers
          </p>
          <button
            onClick={() => window.print()}
            className="btn-primary"
          >
            <Printer size={14} /> Print Label
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="no-print min-h-screen bg-foam flex flex-col items-center justify-center py-10 px-4">
        <p className="text-sm text-roast-400 mb-6 text-center">
          Preview below — click "Print Label" to print, or use <kbd className="bg-cream-200 text-roast-600 px-1.5 py-0.5 rounded text-xs">⌘P</kbd>
        </p>
        <LabelCard equipment={equipment} qrUrl={qrUrl} />
        <p className="text-xs text-roast-300 mt-4 text-center max-w-xs">
          Print on Avery 5160 or any label sheet. Laminate for best durability. Stick to the machine with the serial number visible nearby.
        </p>
      </div>

      {/* The actual printable label — always in DOM, shown only during print */}
      <div className="hidden print:block print:p-4">
        <LabelCard equipment={equipment} qrUrl={qrUrl} />
      </div>
    </>
  );
}

/** Shared label component — used in preview and in print */
function LabelCard({ equipment, qrUrl }: { equipment: Equipment; qrUrl: string }) {
  return (
    <div
      className="print-label bg-white rounded-2xl shadow-warm border border-cream-200 p-6 flex flex-col items-center gap-4 w-72"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      {/* Gobena branding */}
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: '#7d4e22' }}
        >
          G
        </div>
        <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, fontSize: 13, color: '#2c1a0e', letterSpacing: '-0.02em' }}>
          Gobena Service
        </span>
      </div>

      {/*
        QR code — rendered as <img> not <canvas> so it prints in ALL browsers.
        Size 200 = sharp enough at 3in label width.
      */}
      <div
        className="p-3 rounded-xl"
        style={{ border: '2px solid #faeddb', backgroundColor: '#f9f4ee' }}
      >
        <QRCode value={qrUrl} size={200} />
      </div>

      {/* Equipment info */}
      <div className="text-center space-y-1 w-full">
        <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, fontSize: 16, color: '#2c1a0e', lineHeight: 1.2 }}>
          {equipment.name}
        </p>
        {equipment.model && (
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#a67b50' }}>
            {equipment.model}
          </p>
        )}
        <p style={{ fontSize: 11, color: '#a67b50' }}>{equipment.category}</p>
        {equipment.serial_number && (
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#8b5e35', marginTop: 4 }}>
            S/N: {equipment.serial_number}
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="w-full pt-3 text-center" style={{ borderTop: '1px solid #faeddb' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#8b5e35' }}>
          Scan to report an issue
        </p>
        <p style={{ fontSize: 9, color: '#bc9b74', marginTop: 2, wordBreak: 'break-all', fontFamily: "'DM Mono', monospace" }}>
          {qrUrl}
        </p>
      </div>
    </div>
  );
}
