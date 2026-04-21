import { useEffect, useRef, useState } from 'react';
import QRCodeLib from 'qrcode';

interface QRCodeProps {
  value: string;       // The URL to encode
  size?: number;       // Canvas size in px (default 200)
  className?: string;
}

export default function QRCode({ value, size = 200, className }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCodeLib.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: {
        dark:  '#2c1a0e',   // bark — Gobena dark brown
        light: '#fdf8f2',   // foam — warm off-white
      },
    }).catch(() => setError(true));
  }, [value, size]);

  if (error) return (
    <div
      className={`flex items-center justify-center bg-cream-100 rounded-xl text-xs text-roast-400 ${className}`}
      style={{ width: size, height: size }}
    >
      QR error
    </div>
  );

  return <canvas ref={canvasRef} className={`rounded-xl ${className}`} />;
}
