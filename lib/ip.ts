/**
 * The client's address, as far as it can be trusted at all.
 *
 * `x-forwarded-for` is a list that each proxy appends to. The leftmost entry
 * is whatever the caller wrote in the header — a client can put any value
 * there — and the rightmost is the address your own edge actually accepted the
 * connection from. Reading the leftmost entry, as this used to, let any caller
 * choose their own rate-limit bucket simply by sending the header, which made
 * every per-IP limit in the app decorative.
 *
 * Deliberately the single implementation: `middleware.ts` used to carry its own
 * copy with the same bug, and two copies of a rule drift apart.
 */

/**
 * How many proxies sit between the internet and this app. Each one appends a
 * hop, so the address worth trusting is that many places from the right.
 *
 * Default 1: a single load balancer or platform edge in front. Raise it only
 * when you actually add another layer, and never below the real count — each
 * hop you fail to count is one more entry a client can forge.
 */
function trustedProxyHops(): number {
  const configured = Number(process.env.TRUSTED_PROXY_HOPS);
  return Number.isInteger(configured) && configured > 0 ? configured : 1;
}

/** Works with both a standard Request and a NextRequest. */
export function getIPAddress(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    const chain = forwardedFor
      .split(',')
      .map((hop) => hop.trim())
      .filter(Boolean);

    // Counted from the right, so a forged prefix cannot shift which entry is
    // read. Clamped for the case of fewer hops present than configured.
    const index = Math.max(0, chain.length - trustedProxyHops());
    if (chain[index]) return chain[index];
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP.trim();

  // No header at all: every such caller shares one bucket. That is the safe
  // direction to fail — a shared limit throttles legitimate traffic, whereas
  // a fresh bucket per request would throttle nothing.
  return 'unknown';
}
