'use client';

import { useEffect, useRef } from 'react';

export interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  theme?: 'light' | 'dark' | 'auto';
  callback?: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
}

export interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset?: (widgetId?: string) => void;
  remove?: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script';
export const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/**
 * Loads Cloudflare Turnstile explicit script once and invokes `onReady` when available.
 * Returns a cleanup callback that detaches any pending load listener.
 */
export function ensureTurnstileScript(onReady: () => void): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  if (window.turnstile?.render) {
    onReady();
    return () => {};
  }

  let script = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
  const handleLoad = () => onReady();

  if (!script) {
    script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', handleLoad);
    document.head.appendChild(script);
  } else {
    script.addEventListener('load', handleLoad);
  }

  return () => {
    script?.removeEventListener('load', handleLoad);
  };
}

export interface TurnstileWidgetProps {
  siteKey: string;
  action: string;
  resetSignal?: number;
  onToken: (token: string) => void;
  onError?: () => void;
}

/**
 * Explicit-mode Cloudflare Turnstile widget wrapper for React SPA forms.
 * Retains widget ID for deterministic single-use token resets and clean unmounts.
 */
export default function TurnstileWidget({
  siteKey,
  action,
  resetSignal = 0,
  onToken,
  onError,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  onTokenRef.current = onToken;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!siteKey) return;

    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile?.render) return;
      if (widgetIdRef.current) return;

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action,
        theme: 'auto',
        callback: (token: string) => {
          onTokenRef.current(token);
        },
        'expired-callback': () => {
          onTokenRef.current('');
        },
        'error-callback': () => {
          onTokenRef.current('');
          onErrorRef.current?.();
        },
      });
    };

    const detachScript = ensureTurnstileScript(renderWidget);

    return () => {
      cancelled = true;
      detachScript();
      if (widgetIdRef.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore unmount cleanup race
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, action]);

  useEffect(() => {
    if (resetSignal <= 0) return;
    onTokenRef.current('');
    if (widgetIdRef.current && window.turnstile?.reset) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        // ignore reset error
      }
    }
  }, [resetSignal]);

  return (
    <div className="turnstile-container my-3 flex justify-center">
      <div ref={containerRef} data-testid={`turnstile-widget-${action}`} className="min-h-[65px]" />
    </div>
  );
}
