import { notFound } from 'next/navigation';
import Script from 'next/script';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { buildAnalyticsTags, parseAnalyticsConfig } from '@/lib/analytics';
import StoreTracking from '@/components/StoreTracking';

/**
 * Guards every storefront route.
 *
 * The store lookup has to happen on the server: a client component calling
 * notFound() only swaps the rendered UI, the response has already gone out as
 * HTTP 200. Checking here makes an unknown domain a real 404 for every page
 * under /[storeDomain], and renders that segment's not-found.tsx.
 */
export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { storeDomain: string };
}) {
  const store = await prisma.store.findUnique({
    where: { domain: params.storeDomain },
    select: { id: true },
  });

  if (!store) notFound();

  // Analytics is a decoration: a failed settings read renders the storefront
  // without tags instead of taking every page down with it.
  let analyticsConfig: unknown = null;
  try {
    const settings = await prisma.storeSettings.findUnique({
      where: { storeId: store.id },
      select: { analyticsConfig: true },
    });
    analyticsConfig = settings?.analyticsConfig ?? null;
  } catch (error) {
    logger.warn('Storefront analytics settings unavailable', { domain: params.storeDomain });
  }

  const analyticsTags = buildAnalyticsTags(parseAnalyticsConfig(analyticsConfig));
  const trackingConfig = parseAnalyticsConfig(analyticsConfig);

  return (
    <>
      {/* Store-owner configured tags: Google Tag plus the social pixels that
          matter for Indonesian storefronts (TikTok, Meta). */}
      {analyticsTags.map((tag) => (
        <Script
          key={tag.id}
          id={tag.id}
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: tag.script }}
        />
      ))}
      {/* Hands the same config to React so product and order pages can report
          conversions, and records which campaign landed this visitor. */}
      <StoreTracking config={trackingConfig} />
      {children}
    </>
  );
}
