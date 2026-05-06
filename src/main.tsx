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

// Hide the inline splash screen once React has rendered
// Using requestAnimationFrame ensures we wait for actual paint
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    if (typeof (window as any).__appReady === 'function') {
      (window as any).__appReady();
    }
  });
});

// Mark fonts as loaded for CSS font-family swap
if (document.fonts) {
  document.fonts.ready.then(() => {
    document.documentElement.classList.add('fonts-loaded');
  });
}
