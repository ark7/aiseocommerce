import { z } from 'zod';

/**
 * Campaign attribution for paid traffic.
 *
 * Google Ads and Meta both report on the click id (`gclid` / `fbclid`), while
 * `utm_*` carries the campaign naming we control. First touch wins: the campaign
 * that brought someone in is what paid for the sale, even if they convert three
 * visits later.
 */

const MAX_LENGTH = 200;
const STORAGE_KEY = 'storefront:attribution';

const trimmed = z
  .string()
  .trim()
  .max(MAX_LENGTH)
  .optional()
  .transform((value) => (value === '' ? undefined : value));

export const AttributionSchema = z
  .object({
    source: trimmed,
    medium: trimmed,
    campaign: trimmed,
    term: trimmed,
    content: trimmed,
    gclid: trimmed,
    fbclid: trimmed,
    landingPage: trimmed,
    referrer: trimmed,
    capturedAt: z.string().datetime().optional(),
  })
  .strict();

export type Attribution = z.infer<typeof AttributionSchema>;

/** Fields that describe the incoming campaign; first non-empty value wins. */
const CAMPAIGN_FIELDS = ['source', 'medium', 'campaign', 'term', 'content'] as const;

/** Click ids belong to one click, so the newest one replaces the stored one. */
const CLICK_ID_FIELDS = ['gclid', 'fbclid'] as const;

/**
 * Read campaign data off a landing URL. Anything that fails validation is
 * dropped rather than stored — this feeds a JSON column and ad reports.
 */
export function parseAttribution(params: URLSearchParams, referrer?: string): Attribution {
  const candidate: Record<string, string> = {};

  const fromQuery: Record<string, keyof Attribution> = {
    utm_source: 'source',
    utm_medium: 'medium',
    utm_campaign: 'campaign',
    utm_term: 'term',
    utm_content: 'content',
    gclid: 'gclid',
    fbclid: 'fbclid',
  };

  for (const [queryKey, field] of Object.entries(fromQuery)) {
    const value = params.get(queryKey);
    if (value) candidate[field] = value;
  }

  if (referrer) candidate.referrer = referrer;

  const parsed = AttributionSchema.safeParse(candidate);
  return parsed.success ? parsed.data : {};
}

export function hasCampaign(attribution: Attribution): boolean {
  return (
    CAMPAIGN_FIELDS.some((field) => Boolean(attribution[field])) ||
    CLICK_ID_FIELDS.some((field) => Boolean(attribution[field]))
  );
}

/**
 * Combine what we already stored with what this visit carries.
 *
 * The campaign stays first-touch (an organic later visit must not overwrite the
 * ad that paid for the click), but a fresh click id always wins because it
 * belongs to the visit that is about to convert.
 */
export function mergeAttribution(existing: Attribution | null, incoming: Attribution): Attribution {
  if (!existing) return incoming;
  if (!hasCampaign(incoming)) return existing;

  const merged: Attribution = { ...existing };

  for (const field of CAMPAIGN_FIELDS) {
    if (!merged[field] && incoming[field]) merged[field] = incoming[field];
  }
  for (const field of CLICK_ID_FIELDS) {
    if (incoming[field]) merged[field] = incoming[field];
  }

  if (!merged.landingPage && incoming.landingPage) merged.landingPage = incoming.landingPage;
  if (!merged.referrer && incoming.referrer) merged.referrer = incoming.referrer;
  if (!merged.capturedAt && incoming.capturedAt) merged.capturedAt = incoming.capturedAt;

  return merged;
}

/** Drop empty values so the JSON column never stores an object full of gaps. */
export function compactAttribution(attribution: Attribution): Attribution {
  return Object.fromEntries(
    Object.entries(attribution).filter(([, value]) => value !== undefined && value !== '')
  ) as Attribution;
}

/* ------------------------------------------------------------------ */
/* Browser glue — thin wrappers over the pure helpers above.           */
/* ------------------------------------------------------------------ */

/** Read, merge and persist first-touch attribution. Safe to call on every page. */
export function captureAttribution(): Attribution {
  try {
    const params = new URLSearchParams(window.location.search);
    const incoming: Attribution = {
      ...parseAttribution(params, document.referrer || undefined),
      landingPage: window.location.pathname,
      capturedAt: new Date().toISOString(),
    };

    const stored = readStoredAttribution();
    const merged = compactAttribution(mergeAttribution(stored, incoming));

    if (hasCampaign(merged)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
    return merged;
  } catch {
    // Blocked storage or an odd referrer must never break the page.
    return {};
  }
}

export function readStoredAttribution(): Attribution | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = AttributionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
