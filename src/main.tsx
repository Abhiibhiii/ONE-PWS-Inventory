import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/UI/ErrorBoundary.tsx';
import './index.css';

// Production logging for startup diagnostics
if (process.env.NODE_ENV === 'production') {
  console.log('🚀 ONE PWS: Production build starting...');
  console.log('📅 Build Date:', new Date().toISOString());
  console.log('🌐 App URL:', window.location.origin);
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('❌ Root element not found! The app cannot mount.');
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
  
  if (process.env.NODE_ENV === 'production') {
    console.log('✅ ONE PWS: React root mounted successfully.');
  }
}
