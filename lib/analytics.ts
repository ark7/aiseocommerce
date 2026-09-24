import { z } from 'zod';

/**
 * Analytics identifiers a store can attach to its storefront.
 *
 * Google Tag covers GA4/GTM; the rest are the platforms that actually matter for
 * Indonesian storefronts — TikTok Shop traffic and Meta ads dominate here.
 * Everything is optional: an unset id simply emits no tag.
 */
export const AnalyticsConfigSchema = z
  .object({
    googleTagId: z
      .string()
      .regex(/^(G|GT|GTM|AW)-[A-Z0-9]{4,20}$/i, 'Must look like G-XXXX, GT-XXXX, GTM-XXXX or AW-XXXX')
      .optional(),
    /** Google Ads conversion id, e.g. AW-123456789. */
    googleAdsConversionId: z
      .string()
      .regex(/^AW-\d{9,12}$/, 'Must look like AW-123456789')
      .optional(),
    /** Conversion label for a completed purchase (AW-XXX/<label>). */
    googleAdsPurchaseLabel: z.string().regex(/^[A-Za-z0-9_-]{4,40}$/).optional(),
    /** Conversion label for add-to-cart. */
    googleAdsAddToCartLabel: z.string().regex(/^[A-Za-z0-9_-]{4,40}$/).optional(),
    tiktokPixelId: z.string().regex(/^[A-Z0-9]{8,32}$/i).optional(),
    facebookPixelId: z.string().regex(/^\d{5,20}$/).optional(),
    instagramAccountId: z.string().regex(/^[A-Za-z0-9._]{1,60}$/).optional(),
    youtubeChannelId: z.string().regex(/^UC[A-Za-z0-9_-]{20,24}$/).optional(),
  })
  .strict();

export type AnalyticsConfig = z.infer<typeof AnalyticsConfigSchema>;

/** Never throw on stored data — one bad row must not take the storefront down. */
export function parseAnalyticsConfig(value: unknown): AnalyticsConfig {
  if (!value || typeof value !== 'object') return {};
  const parsed = AnalyticsConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

export interface AnalyticsTag {
  id: string;
  /** Inline script body. Only schema-matched ids are interpolated, via JSON.stringify. */
  script: string;
}

/**
 * Build the inline snippets for a store's configured ids. The social pixels use
 * each platform's official loader snippet, with the id injected as a JSON string.
 */
export function buildAnalyticsTags(config: AnalyticsConfig): AnalyticsTag[] {
  const tags: AnalyticsTag[] = [];

  if (config.googleTagId) {
    const id = JSON.stringify(config.googleTagId);
    tags.push({
      id: `google-tag-${config.googleTagId}`,
      script: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${id});`,
    });
  }

  if (config.tiktokPixelId) {
    const id = JSON.stringify(config.tiktokPixelId);
    tags.push({
      id: `tiktok-pixel-${config.tiktokPixelId}`,
      script: `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load(${id});ttq.page()}(window,document,'ttq');`,
    });
  }

  if (config.facebookPixelId) {
    const id = JSON.stringify(config.facebookPixelId);
    tags.push({
      id: `facebook-pixel-${config.facebookPixelId}`,
      script: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${id});fbq('track','PageView');`,
    });
  }

  if (config.instagramAccountId || config.youtubeChannelId) {
    tags.push({
      id: 'social-profile-links',
      script: `window.__storeSocialLinks=${JSON.stringify({
        instagram: config.instagramAccountId ?? null,
        youtube: config.youtubeChannelId ?? null,
      })};`,
    });
  }

  return tags;
}
