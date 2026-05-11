import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Equipment } from '../types';
import { GoMark } from '../components/Icons';

// Minimal QR code generator using a public API so no npm dependency needed
function QRImg({ url, size = 200 }: { url: string; size?: number }) {
  // Use the QR Server API — free, reliable, no key needed
  const src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=${size}x${size}&format=png&margin=1`;
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt="QR Code"
      style={{ imageRendering: 'pixelated' }}
      crossOrigin="anonymous"
    />
  );
}

export default function QRPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [eq, setEq] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('equipment')
      .select('id, name, brand, model, serial_number, shops:shop_id(name, city)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setEq(data as Equipment);
        setLoading(false);
        // Auto-print after a short delay for the QR to load
        setTimeout(() => window.print(), 800);
      });
  }, [id]);

  const url = `${window.location.origin}/equipment/${id}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!eq) return <div className="p-8 text-center text-stone-500">Equipment not found</div>;

  const shop = eq.shops as unknown as { name: string; city: string } | null;

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          .print-card {
            width: 85mm;
            padding: 8mm;
            border: 1px solid #d4c5a9;
            border-radius: 4mm;
            page-break-inside: avoid;
            font-family: system-ui, sans-serif;
          }
        }
        @media screen {
          body { background: #f5f5f4; }
        }
      `}</style>

      {/* Screen preview */}
      <div className="no-print min-h-screen bg-stone-100 flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-sm text-stone-500">Print preview — printing will start automatically</p>
        <button
          onClick={() => window.print()}
          className="px-6 py-2.5 bg-stone-900 text-white text-sm font-semibold rounded-xl"
        >
          Print now
        </button>
      </div>

      {/* The print card */}
      <div className="print-card" style={{ background: 'white', margin: '10mm auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #e7e5e4', paddingBottom: '10px' }}>
          <div style={{ width: 28, height: 28, background: '#2C1810', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
              <path d="M20 8C13.373 8 8 13.373 8 20C8 26.627 13.373 32 20 32C23.8 32 27.2 30.18 29.4 27.36L24.8 24.52C23.6 25.92 21.9 26.8 20 26.8C16.24 26.8 13.2 23.76 13.2 20C13.2 16.24 16.24 13.2 20 13.2C22.4 13.2 24.52 14.4 25.84 16.24H20V21H32V20C32 13.373 26.627 8 20 8Z" fill="#C8A97D"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#1c1917', margin: 0 }}>Gobena Service</p>
            {shop && <p style={{ fontSize: 9, color: '#78716c', margin: 0 }}>{shop.name}</p>}
          </div>
        </div>

        {/* QR Code */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <QRImg url={url} size={160} />
        </div>

        {/* Machine info */}
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1c1917', margin: '0 0 2px 0' }}>{eq.name}</p>
          <p style={{ fontSize: 10, color: '#78716c', margin: 0 }}>{eq.brand} {eq.model}</p>
          {eq.serial_number && (
            <p style={{ fontSize: 9, color: '#a8a29e', margin: '2px 0 0 0' }}>SN: {eq.serial_number}</p>
          )}
        </div>

        {/* CTA */}
        <div style={{ background: '#1c1917', borderRadius: 6, padding: '8px 12px', textAlign: 'center' }}>
          <p style={{ fontSize: 10, color: '#d6d3d1', margin: '0 0 2px 0', fontWeight: 600 }}>
            Scan to report an issue
          </p>
          <p style={{ fontSize: 8, color: '#78716c', margin: 0, wordBreak: 'break-all' }}>{url}</p>
        </div>
      </div>
    </>
  );
}
