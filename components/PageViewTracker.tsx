'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface Props {
  storeDomain?: string;
}

function getAnonymousSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let sid = window.localStorage.getItem('__sto_sid');
    if (!sid) {
      sid = 'sid_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      window.localStorage.setItem('__sto_sid', sid);
    }
    return sid;
  } catch {
    return 'anonymous';
  }
}

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

function getBrowserName(): string {
  if (typeof window === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('SamsungBrowser')) return 'Samsung Browser';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('Edge') || ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Other';
}

function emitBeacon(url: string, payload: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const data = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    const blob = new Blob([data], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
  } else {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data,
      keepalive: true,
    }).catch(() => {});
  }
}

export default function PageViewTracker({ storeDomain }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastRecordedPath = useRef<string | null>(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') {
      return;
    }

    const domain = storeDomain || (typeof window !== 'undefined' ? window.location.host : '');
    const currentQuery = searchParams?.toString();
    const fullPath = currentQuery ? `${pathname}?${currentQuery}` : pathname;

    if (lastRecordedPath.current === fullPath) return;
    lastRecordedPath.current = fullPath;

    const payload = {
      storeDomain: domain,
      path: fullPath,
      referrer: document.referrer || null,
      deviceType: getDeviceType(),
      browser: getBrowserName(),
      sessionId: getAnonymousSessionId(),
    };

    emitBeacon('/api/telemetry/pageview', payload);
  }, [pathname, searchParams, storeDomain]);

  useEffect(() => {
    const domain = storeDomain || (typeof window !== 'undefined' ? window.location.host : '');

    const errorHandler = (event: ErrorEvent) => {
      if (!event.message || event.message.includes('Script error.')) return;

      emitBeacon('/api/telemetry/errors', {
        storeDomain: domain,
        source: 'CLIENT_FRONTEND',
        severity: 'ERROR',
        message: event.message,
        stack: event.error?.stack || null,
        path: window.location.pathname,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
          ? reason
          : 'Unhandled Promise Rejection';

      emitBeacon('/api/telemetry/errors', {
        storeDomain: domain,
        source: 'CLIENT_FRONTEND',
        severity: 'WARN',
        message,
        stack: reason instanceof Error ? reason.stack : null,
        path: window.location.pathname,
      });
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, [storeDomain]);

  return null;
}

