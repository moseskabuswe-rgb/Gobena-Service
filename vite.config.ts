import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // es2015 = maximum compatibility
    // Covers Chrome 49+, Safari 10+, Samsung Internet 5+, Firefox 45+
    // Any phone made in the last 8 years will run this
    target: ['es2015', 'chrome58', 'safari11', 'firefox57', 'edge18'],
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Split vendor chunks for better caching
        // Each chunk is cached separately — user only re-downloads what changed
        manualChunks: {
          'react-core':   ['react', 'react-dom'],
          'react-router': ['react-router-dom'],
          'supabase':     ['@supabase/supabase-js'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
