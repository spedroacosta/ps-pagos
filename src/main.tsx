import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global fetch interceptor to catch revoked session states instantly
try {
  const originalFetch = window.fetch;
  if (originalFetch) {
    Object.defineProperty(window, 'fetch', {
      value: async (...args: any[]) => {
        const response = await originalFetch(args[0] as RequestInfo | URL, args[1] as RequestInit | undefined);
        if (response.status === 401) {
          try {
            const clone = response.clone();
            const data = await clone.json();
            if (data && data.sessionRevoked) {
              alert("Su sesión ha sido cerrada de forma remota por el Administrador General.");
              sessionStorage.clear();
              localStorage.removeItem('tenantId');
              localStorage.removeItem('tenantAuth');
              localStorage.removeItem('tenantName');
              localStorage.removeItem('tenantLogoUrl');
              window.location.href = '/';
            }
          } catch (e) {
            // Ignore parsing errors for non-JSON 401s
          }
        }
        return response;
      },
      writable: true,
      configurable: true,
    });
  }
} catch (err) {
  console.warn("Global fetch interceptor could not be registered on window.fetch:", err);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
