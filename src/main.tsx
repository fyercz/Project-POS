import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import {installGlobalErrorHandlers} from './utils/errorLog';

// Tangkap error async/event-handler yang tidak akan pernah sampai ke ErrorBoundary React
// (boundary cuma menangkap error di alur render) - lihat catatan lengkap di errorLog.ts.
installGlobalErrorHandlers();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
