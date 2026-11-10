'use client';

import { useEffect } from 'react';

/**
 * Root Layout Global Error Boundary.
 * Catches errors occurring within the RootLayout itself.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Fatal Root Layout error:', error);

    try {
      const payload = {
        storeDomain: typeof window !== 'undefined' ? window.location.host : '',
        source: 'CLIENT_FRONTEND',
        severity: 'CRITICAL',
        message: `Fatal Layout Error: ${error.message || 'Unknown'}`,
        stack: error.stack || null,
        path: typeof window !== 'undefined' ? window.location.pathname : '',
        context: { digest: error.digest },
      };

      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/telemetry/errors', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      } else {
        fetch('/api/telemetry/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Ignore
    }
  }, [error]);

  return (
    <html lang="id">
      <body className="bg-gray-50 text-gray-900 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            !
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Terjadi Gangguan Sistem</h1>
          <p className="text-sm text-gray-600 mb-6">
            Aplikasi mengalami kendala teknis. Tim teknis kami telah menerima laporan error ini secara otomatis.
          </p>
          <button
            onClick={() => reset()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            Muat Ulang Halaman
          </button>
        </div>
      </body>
    </html>
  );
}

