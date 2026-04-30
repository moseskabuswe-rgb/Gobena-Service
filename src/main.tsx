import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const root = createRoot(document.getElementById('root')!);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Hide the inline splash screen now that React has mounted
// Small timeout ensures the first frame has painted
setTimeout(() => {
  if (typeof window.__hideSplash === 'function') {
    window.__hideSplash();
  }
}, 50);

// TypeScript declaration for the global function
declare global {
  interface Window {
    __hideSplash: () => void;
  }
}
