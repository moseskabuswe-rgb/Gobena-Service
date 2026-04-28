import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libs into separate chunks so the main app
          // bundle is smaller — critical for QR scan load time
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase':      ['@supabase/supabase-js'],
          'qrcode':        ['qrcode'],
          'lucide':        ['lucide-react'],
        },
      },
    },
    // Raise warning threshold — we know about the size, splitting handles it
    chunkSizeWarningLimit: 600,
  },
});
