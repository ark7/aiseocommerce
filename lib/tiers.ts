/**
 * Authentication Tiers System
 *
 * Hierarchy: GUEST < CUSTOMER < STAFF < ADMIN
 */

export type Tier = 'GUEST' | 'CUSTOMER' | 'STAFF' | 'ADMIN';

const TIER_RANK: Record<Tier, number> = {
  GUEST: 0,
  CUSTOMER: 1,
  STAFF: 2,
  ADMIN: 3,
};

/**
 * Checks if the given role meets or exceeds the required tier.
 */
export function meetsTier(role: Tier, required: Tier): boolean {
  return TIER_RANK[role] >= TIER_RANK[required];
}

/**
 * Determines the minimum required tier for a given pathname.
 */
export function requiredTierFor(pathname: string): Tier {
  // Root, login, register, and auth APIs are open to all (including unauthenticated/guest)
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/api/auth')
  ) {
    return 'GUEST';
  }

  // Admin paths require STAFF or ADMIN
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin')
  ) {
    return 'STAFF';
  }

  // Cart and Order-related paths require CUSTOMER
  if (
    pathname.includes('/cart') ||
    pathname.includes('/orders') ||
    pathname.startsWith('/api/checkout') ||
    pathname === '/api/orders'
  ) {
    return 'CUSTOMER';
  }

  // Storefront paths (domain root, products, categories) are open to GUEST
  // Note: The transition from Landing (Root) to Detail is handled by GatedLink,
  // but the route itself is GUEST-accessible for crawler/SEO purposes.
  return 'GUEST';
}

/**
 * Helper to decide if a link should be gated (redirect to login) based on current role.
 */
export function gateFor(role: Tier, targetPath: string): { gated: boolean; redirectPath: string | null } {
  const isPublicAuthPath =
    targetPath === '/' ||
    targetPath.startsWith('/login') ||
    targetPath.startsWith('/register') ||
    targetPath.startsWith('/api/auth');

  if (isPublicAuthPath) {
    return { gated: false, redirectPath: null };
  }

  // GUEST cannot access internal store/product/category pages; must login/signup
  if (role === 'GUEST') {
    const sanitizedFrom = targetPath.startsWith('/') && !targetPath.startsWith('//')
      ? targetPath
      : '/';

    return {
      gated: true,
      redirectPath: `/login?from=${encodeURIComponent(sanitizedFrom)}`
    };
  }

  const required = requiredTierFor(targetPath);

  if (meetsTier(role, required)) {
    return { gated: false, redirectPath: null };
  }

  // Sanitize redirect path to prevent open redirects
  const sanitizedFrom = targetPath.startsWith('/') && !targetPath.startsWith('//')
    ? targetPath
    : '/';

  return {
    gated: true,
    redirectPath: `/login?from=${encodeURIComponent(sanitizedFrom)}`
  };
}
