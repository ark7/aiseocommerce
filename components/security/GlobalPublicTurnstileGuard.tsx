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

const SEO_OR_PREVIEW_BOT_REGEX =
  /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|applebot|twitterbot|facebookexternalhit|linkedinbot|whatsapp|telegrambot|discordbot|pinterest|lighthouse|chrome-lighthouse|pagespeed|gtmetrix|ptst/i;

const DEFERRED_ACTIVATION_EVENTS = [
  'scroll',
  'pointerdown',
  'mousemove',
  'touchstart',
  'keydown',
] as const;

export const TURNSTILE_DEFERRED_IDLE_MS = 3500;

export function isSearchEngineOrPreviewBot(userAgent?: string): boolean {
  if (!userAgent) return false;
  return SEO_OR_PREVIEW_BOT_REGEX.test(userAgent);
}

/**
 * Global Cloudflare Turnstile protection for all publicly exposed pages.
 * Defers script/widget mounting until after first impression (first user interaction or idle timer)
 * and skips rendering for SEO crawlers/link preview bots so Core Web Vitals (FCP/LCP/CLS) and
 * search indexing on the homepage remain completely unblocked.
 */
export default function GlobalPublicTurnstileGuard({
  siteKey,
  initiallyVerified = false,
  storeDomain,
}: GlobalPublicTurnstileGuardProps) {
  const pathname = usePathname() || '/';
  const [verified, setVerified] = useState<boolean>(Boolean(initiallyVerified));
  const [dismissed, setDismissed] = useState<boolean>(Boolean(initiallyVerified));
  const [readyToMount, setReadyToMount] = useState<boolean>(false);

  const isInternalAdminRoute =
    pathname.startsWith('/admin') || pathname.startsWith('/super-admin');
  const hasDedicatedInlineShield =
    INLINE_SHIELD_PATHS.has(pathname) || pathname.startsWith('/product/');

  useEffect(() => {
    if (initiallyVerified) {
      setVerified(true);
      setDismissed(true);
    }
  }, [initiallyVerified]);

  useEffect(() => {
    if (!siteKey || dismissed || isInternalAdminRoute || hasDedicatedInlineShield) {
      return;
    }

    if (typeof navigator !== 'undefined' && isSearchEngineOrPreviewBot(navigator.userAgent)) {
      return;
    }

    let cancelled = false;
    let activated = false;

    const activate = () => {
      if (cancelled || activated) return;
      activated = true;
      setReadyToMount(true);
    };

    for (const eventName of DEFERRED_ACTIVATION_EVENTS) {
      window.addEventListener(eventName, activate, { once: true, passive: true });
    }

    const idleTimer = setTimeout(activate, TURNSTILE_DEFERRED_IDLE_MS);

    return () => {
      cancelled = true;
      clearTimeout(idleTimer);
      for (const eventName of DEFERRED_ACTIVATION_EVENTS) {
        window.removeEventListener(eventName, activate);
      }
    };
  }, [siteKey, dismissed, isInternalAdminRoute, hasDedicatedInlineShield]);

  useEffect(() => {
    if (!verified || dismissed) return;
    const timer = setTimeout(() => {
      setDismissed(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, [verified, dismissed]);

  if (!siteKey || dismissed || !readyToMount) {
    return null;
  }

  if (isInternalAdminRoute || hasDedicatedInlineShield) {
    return null;
  }

  return (
    <div
      data-testid="global-public-turnstile-guard"
      role="complementary"
      aria-live="off"
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
