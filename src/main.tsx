import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { StoreProvider } from './state/store';
import './styles/global.css';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);

// Offline support in production builds only.
// Skipped inside an iframe (preview hosts) so a cached shell never goes stale there.
if ('serviceWorker' in navigator && import.meta.env.PROD && window.top === window.self && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline unavailable */ });
  });
}
