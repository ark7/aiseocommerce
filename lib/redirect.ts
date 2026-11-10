/**
 * Where to send someone back to after they sign in.
 *
 * `from` arrives in the URL, so it is attacker-controlled. Only a same-site
 * path is accepted: `//evil.com` is protocol-relative and would navigate off
 * the site, which is what an open redirect is for.
 *
 * Shared by the login and register pages — two copies of a redirect rule is
 * how one of them ends up without the check.
 */
export function safeRedirectPath(from: string | null): string | null {
  if (!from) return null;
  if (!from.startsWith('/') || from.startsWith('//')) return null;
  return from;
}

/** The safe `from` value for the current URL, or null. Client-side only. */
export function redirectPathFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return safeRedirectPath(new URLSearchParams(window.location.search).get('from'));
}

/**
 * Appends `from` to an auth link so the reason the visitor is here survives a
 * trip through the other page.
 */
export function withRedirectParam(path: string, from: string | null): string {
  const safe = safeRedirectPath(from);
  return safe ? `${path}?from=${encodeURIComponent(safe)}` : path;
}
