import { useEffect, useState } from 'react';
import QRCodeLib from 'qrcode';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Renders a QR code as an <img> (data URL) instead of <canvas>.
 *
 * WHY: Canvas elements don't print reliably across browsers — Chrome, Safari,
 * and Firefox all handle canvas differently in print mode, and many skip it
 * entirely. An <img> with a data URL is guaranteed to print correctly because
 * the browser treats it exactly like any other image.
 */
export default function QRCode({ value, size = 200, className }: QRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error,   setError]   = useState(false);

  useEffect(() => {
    if (!value) return;
    QRCodeLib.toDataURL(value, {
      width:  size,
      margin: 2,
      color: {
        dark:  '#2c1a0e',  // bark — Gobena dark brown
        light: '#ffffff',  // pure white for print compatibility
      },
      errorCorrectionLevel: 'M',
    })
      .then(url => setDataUrl(url))
      .catch(() => setError(true));
  }, [value, size]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-cream-100 rounded-xl text-xs text-roast-400 ${className ?? ''}`}
        style={{ width: size, height: size }}
      >
        QR error
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        className={`bg-cream-100 rounded-xl animate-pulse ${className ?? ''}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <img
      src={dataUrl}
      alt="QR Code"
      width={size}
      height={size}
      className={`rounded-xl ${className ?? ''}`}
      style={{ imageRendering: 'pixelated' }}  // keeps QR crisp at any print scale
    />
  );
}
