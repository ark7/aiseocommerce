'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import TurnstileStorefrontShield from '@/components/security/TurnstileStorefrontShield';

export interface GlobalPublicTurnstileGuardProps {
  siteKey?: string | null;
  initiallyVerified?: boolean;
  storeDomain?: string | null;
}

const INLINE_SHIELD_PATHS = new Set([
  '/products',
  '/login',
  '/register',
  '/forgot-password',
]);

/**
 * Global Cloudflare Turnstile protection for all publicly exposed pages.
 * Renders a lightweight non-blocking floating shield at bottom-left on public routes
 * that don't already render an inline shield, and auto-dismisses once verified
 * (persisting via the 2-hour HttpOnly `cf_turnstile_pass` cookie).
 */
export default function GlobalPublicTurnstileGuard({
  siteKey,
  initiallyVerified = false,
  storeDomain,
}: GlobalPublicTurnstileGuardProps) {
  const pathname = usePathname() || '/';
  const [verified, setVerified] = useState<boolean>(Boolean(initiallyVerified));
  const [dismissed, setDismissed] = useState<boolean>(Boolean(initiallyVerified));

  useEffect(() => {
    if (initiallyVerified) {
      setVerified(true);
      setDismissed(true);
    }
  }, [initiallyVerified]);

  useEffect(() => {
    if (!verified || dismissed) return;
    const timer = setTimeout(() => {
      setDismissed(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, [verified, dismissed]);

  if (!siteKey || dismissed) {
    return null;
  }

  const isInternalAdminRoute =
    pathname.startsWith('/admin') || pathname.startsWith('/super-admin');
  const hasDedicatedInlineShield =
    INLINE_SHIELD_PATHS.has(pathname) || pathname.startsWith('/product/');

  if (isInternalAdminRoute || hasDedicatedInlineShield) {
    return null;
  }

  return (
    <div
      data-testid="global-public-turnstile-guard"
      className="fixed bottom-4 left-4 z-40 max-w-sm shadow-lg rounded-xl"
    >
      <TurnstileStorefrontShield
        siteKey={siteKey}
        initiallyVerified={verified}
        storeDomain={storeDomain}
        context="public-global"
        contextLabel="seluruh halaman publik toko"
        compact
        onVerifiedChange={(isNowVerified) => {
          setVerified(isNowVerified);
        }}
      />
    </div>
  );
}
