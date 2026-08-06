import '@/styles/globals.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/renderer/App';

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Remove the pre-React boot splash once React has painted its first frame.
requestAnimationFrame(() => {
  document.getElementById('boot-splash')?.remove();
});
