'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface Props {
  storeDomain?: string;
  storeName?: string;
}

declare global {
  interface Window {
    posthog?: any;
    Sentry?: any;
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Master Third-Party Telemetry & Analytics Bridge.
 *
 * Connects ALL duplicated stores to a SINGLE master Sentry, PostHog, or GA4 project.
 * Automatically injects the tenant's `store_domain` and `store_name` as persistent
 * tags/super-properties so you can filter, compare, and monitor all client stores
 * from a single centralized 3rd-party dashboard.
 */
export default function MasterThirdPartyTracker({ storeDomain, storeName }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthogInitialized = useRef(false);
  const sentryInitialized = useRef(false);

  const domain = storeDomain || (typeof window !== 'undefined' ? window.location.host : 'unknown-store');
  const name = storeName || domain;

  // 1. PostHog Master Initialization & Route Tracking
  useEffect(() => {
    const posthogKey =
      process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ||
      process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

    if (!posthogKey || typeof window === 'undefined') return;

    if (!posthogInitialized.current) {
      posthogInitialized.current = true;

      // Official PostHog lightweight inline snippet
      (function (t: any, b: any) {
        if (!b.__SV) {
          var a, f, i, e;
          window.posthog = b;
          b._i = [];
          b.init = function (i: any, s: any, a: any) {
            function g(t: any, e: any) {
              var n = e.split('.');
              2 == n.length && ((t = t[n[0]]), (e = n[1]));
              t[e] = function () {
                t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
              };
            }
            var p = b;
            for (
              'undefined' !== typeof a ? (p = b[a] = []) : (a = 'posthog'),
                p.people = p.people || [],
                p.toString = function (t: any) {
                  var e = 'posthog';
                  'posthog' !== a && (e += '.' + a);
                  t || (e += ' (stub)');
                  return e;
                },
                p.people.toString = function () {
                  return p.toString(1) + '.people (stub)';
                },
                i =
                  'capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId'.split(
                    ' '
                  ),
                e = 0;
              e < i.length;
              e++
            )
              g(p, i[e]);
            b._i.push([i, s, a]);
          };
          b.__SV = 1;
          a = t.createElement('script');
          a.type = 'text/javascript';
          a.async = !0;
          a.src = `${posthogHost}/static/array.js`;
          f = t.getElementsByTagName('script')[0];
          if (f && f.parentNode) {
            f.parentNode.insertBefore(a, f);
          } else {
            (t.head || t.body || t.documentElement).appendChild(a);
          }
        }
      })(document, window.posthog || []);

      window.posthog.init(posthogKey, {
        api_host: posthogHost,
        autocapture: false, // Clean manual capture
        capture_pageview: false, // Handled manually below for Next.js App Router
        loaded: (ph: any) => {
          // Register tenant super-properties so EVERY event carries the store domain
          ph.register({
            store_domain: domain,
            store_name: name,
          });
        },
      });
    }

    // Capture Pageviews on App Router route changes
    if (window.posthog && typeof window.posthog.capture === 'function') {
      const fullUrl = window.location.href;
      window.posthog.capture('$pageview', {
        $current_url: fullUrl,
        store_domain: domain,
        store_name: name,
      });
    }
  }, [pathname, searchParams, domain, name]);

  // 2. Sentry Master Initialization
  useEffect(() => {
    const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!sentryDsn || typeof window === 'undefined') return;

    if (!sentryInitialized.current) {
      sentryInitialized.current = true;

      // Load Sentry Browser SDK bundle dynamically
      const script = document.createElement('script');
      script.src = 'https://browser.sentry-cdn.com/7.100.1/bundle.tracing.replay.min.js';
      script.crossOrigin = 'anonymous';
      script.async = true;
      script.onload = () => {
        if (window.Sentry) {
          window.Sentry.init({
            dsn: sentryDsn,
            environment: process.env.NODE_ENV || 'production',
            initialScope: {
              tags: {
                store_domain: domain,
                store_name: name,
              },
            },
          });
        }
      };
      document.head.appendChild(script);
    }
  }, [domain, name]);

  // 3. Master Google Analytics 4 (if configured across all tenants)
  useEffect(() => {
    const masterGaId = process.env.NEXT_PUBLIC_MASTER_GA4_ID;
    if (!masterGaId || typeof window === 'undefined') return;

    // Load gtag script if not yet present
    const scriptId = `master-ga4-${masterGaId}`;
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${masterGaId}`;
      script.async = true;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        window.dataLayer?.push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', masterGaId, {
        store_domain: domain,
        store_name: name,
      });
    } else if (window.gtag) {
      // Send pageview on route change
      window.gtag('event', 'page_view', {
        page_path: pathname,
        store_domain: domain,
      });
    }
  }, [pathname, domain, name]);

  return null;
}
