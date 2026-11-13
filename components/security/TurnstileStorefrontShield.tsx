'use client';

import { useEffect, useRef, useState } from 'react';

export interface TurnstileStorefrontShieldProps {
  siteKey?: string | null;
  initiallyVerified?: boolean;
  storeDomain?: string | null;
  context?: 'listing' | 'product-detail' | 'public-global' | 'auth';
  contextLabel?: string;
  compact?: boolean;
  onVerifiedChange?: (verified: boolean) => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: 'light' | 'dark' | 'auto';
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
        }
      ) => string;
      reset?: (widgetId?: string) => void;
      remove?: (widgetId?: string) => void;
    };
  }
}

const SESSION_STORAGE_KEY = 'cf_turnstile_verified';
const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/**
 * Lightweight Cloudflare Turnstile guard for catalog listing (/products)
 * and product detail (/product/[slug]) pages. Once verified in a session,
 * stores an HttpOnly server cookie via /api/security/turnstile-verify so
 * legitimate shoppers are never interrupted again across pages.
 */
export default function TurnstileStorefrontShield({
  siteKey,
  initiallyVerified = false,
  storeDomain,
  context = 'listing',
  contextLabel,
  compact = false,
  onVerifiedChange,
}: TurnstileStorefrontShieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifiedRef = useRef(onVerifiedChange);
  onVerifiedRef.current = onVerifiedChange;

  const [verified, setVerified] = useState<boolean>(() => !siteKey || Boolean(initiallyVerified));
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      typeof navigator !== 'undefined' &&
      /googlebot|bingbot|duckduckbot|applebot|lighthouse|chrome-lighthouse|pagespeed/i.test(
        navigator.userAgent
      )
    ) {
      return;
    }

    if (!siteKey) {
      setVerified(true);
      onVerifiedRef.current?.(true);
      return;
    }

    let hasSessionPass = Boolean(initiallyVerified);
    try {
      if (sessionStorage.getItem(SESSION_STORAGE_KEY) === '1') {
        hasSessionPass = true;
      }
    } catch {
      // ignore storage errors
    }

    if (hasSessionPass) {
      setVerified(true);
      onVerifiedRef.current?.(true);
      return;
    }

    let cancelled = false;

    const verifyTokenWithServer = async (token: string) => {
      if (cancelled) return;
      setVerifying(true);
      setError(null);
      try {
        const res = await fetch('/api/security/turnstile-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, storeDomain }),
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && data?.verified) {
          try {
            sessionStorage.setItem(SESSION_STORAGE_KEY, '1');
          } catch {
            // ignore
          }
          setVerified(true);
          onVerifiedRef.current?.(true);
        } else if (!cancelled) {
          setError(data?.error || 'Verifikasi keamanan gagal. Silakan coba lagi.');
          if (widgetIdRef.current && window.turnstile?.reset) {
            window.turnstile.reset(widgetIdRef.current);
          }
        }
      } catch {
        if (!cancelled) {
          setError('Gagal menghubungi server verifikasi keamanan. Silakan coba lagi.');
        }
      } finally {
        if (!cancelled) setVerifying(false);
      }
    };

    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile?.render) return;
      if (widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'auto',
        callback: (token: string) => {
          void verifyTokenWithServer(token);
        },
        'error-callback': () => {
          if (!cancelled) {
            setError('Pemeriksaan keamanan Cloudflare gagal dimuat. Muat ulang atau coba lagi.');
          }
        },
        'expired-callback': () => {
          if (!cancelled) {
            setVerified(false);
            onVerifiedRef.current?.(false);
          }
        },
      });
    };

    if (window.turnstile?.render) {
      renderWidget();
    } else {
      let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      const handleLoad = () => renderWidget();
      if (!script) {
        script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.addEventListener('load', handleLoad);
        document.head.appendChild(script);
      } else {
        script.addEventListener('load', handleLoad);
      }

      return () => {
        cancelled = true;
        script?.removeEventListener('load', handleLoad);
        if (widgetIdRef.current && window.turnstile?.remove) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // ignore
          }
          widgetIdRef.current = null;
        }
      };
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, initiallyVerified, storeDomain]);

  if (!siteKey) return null;

  if (verified) {
    return (
      <div
        data-testid="turnstile-verified-badge"
        className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1"
      >
        <span aria-hidden="true">🛡️</span>
        <span>Koneksi Aman • Terlindungi Cloudflare Turnstile</span>
      </div>
    );
  }

  return (
    <div
      data-testid={`turnstile-shield-${context}`}
      className={`rounded-xl border border-slate-200 bg-white/95 shadow-xs space-y-2 ${
        compact ? 'p-2.5' : 'p-3'
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
        <span className="font-medium flex items-center gap-1.5">
          <span aria-hidden="true">🛡️</span>
          <span>
            {contextLabel
              ? `Verifikasi cepat anti-bot untuk ${contextLabel}`
              : context === 'product-detail'
                ? 'Verifikasi cepat anti-bot sebelum menambah ke keranjang'
                : 'Verifikasi cepat anti-bot Cloudflare Turnstile'}
          </span>
        </span>
        {verifying && (
          <span className="text-indigo-600 font-medium">Memverifikasi...</span>
        )}
      </div>
      <div ref={containerRef} className="min-h-[65px] flex items-center" />
      {error && (
        <p role="alert" className="text-xs text-red-600 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
