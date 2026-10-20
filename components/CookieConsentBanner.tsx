'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DEFAULT_COOKIE_TITLE, DEFAULT_COOKIE_TEXT } from '@/lib/legalDefaults';

interface CookieConsentBannerProps {
  enabled?: boolean;
  title?: string | null;
  text?: string | null;
}

export default function CookieConsentBanner({
  enabled = true,
  title,
  text,
}: CookieConsentBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    try {
      const consent = localStorage.getItem('cookie_consent');
      if (!consent) {
        // Small delay so it transitions in smoothly
        const timer = setTimeout(() => setVisible(true), 1000);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore
    }
  }, [enabled]);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem('cookie_consent', 'accepted');
      localStorage.setItem('cookie_consent_date', new Date().toISOString());
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const handleEssentialOnly = () => {
    try {
      localStorage.setItem('cookie_consent', 'essential');
      localStorage.setItem('cookie_consent_date', new Date().toISOString());
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!enabled || !visible) return null;

  return (
    <aside
      aria-label="Pemberitahuan Cookie"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-white rounded-2xl p-5 md:p-6 shadow-2xl border border-gray-200/80 backdrop-blur-md space-y-4">
        <div className="flex items-start space-x-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0 border border-amber-100">
            🍪
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-gray-900 leading-tight">
              {title || DEFAULT_COOKIE_TITLE}
            </h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              {text || DEFAULT_COOKIE_TEXT}{' '}
              <Link href="/privacy" className="text-indigo-600 font-medium underline hover:text-indigo-700">
                Kebijakan Privasi
              </Link>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleEssentialOnly}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            Hanya yang Penting
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            style={{ backgroundColor: 'var(--brand-primary, #4F46E5)' }}
            className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 transition shadow-xs"
          >
            Setujui & Lanjutkan
          </button>
        </div>
      </div>
    </aside>
  );
}

