/**
 * Lightweight, zero-dependency Super-Admin host & feature guards.
 * Pure Edge & Node.js runtime compatible (no jsonwebtoken or bcrypt dependencies).
 */

/**
 * Extracts the hostname without port from a Request, Headers, or object with headers.
 */
export function extractRequestHost(
  target?: Request | Headers | { headers?: Headers | Record<string, string | string[] | undefined> } | null
): string {
  if (!target) return '';

  let hostHeader: string | null = null;

  if ('headers' in target && target.headers) {
    if (typeof (target.headers as Headers).get === 'function') {
      const h = target.headers as Headers;
      hostHeader = h.get('x-forwarded-host') || h.get('host');
    } else {
      const record = target.headers as Record<string, string | string[] | undefined>;
      const fwd = record['x-forwarded-host'];
      const hst = record['host'];
      const raw = Array.isArray(fwd) ? fwd[0] : fwd || (Array.isArray(hst) ? hst[0] : hst);
      hostHeader = raw || null;
    }
  } else if (typeof (target as Headers).get === 'function') {
    const h = target as Headers;
    hostHeader = h.get('x-forwarded-host') || h.get('host');
  }

  if (!hostHeader) {
    if ('url' in target && typeof (target as any).url === 'string' && (target as any).url) {
      try {
        const u = new URL((target as any).url);
        return u.hostname.replace(/^\[([^\]]+)\]$/, '$1').toLowerCase();
      } catch {
        return '';
      }
    }
    return '';
  }

  // Handle multiple hosts if proxied (e.g. "client.com, proxy.com")
  const primaryHost = hostHeader.split(',')[0].trim();
  // Strip port (e.g. "localhost:3000" -> "localhost", "[::1]:3000" -> "::1")
  const withoutPort = primaryHost
    .replace(/^\[([^\]]+)\](?::\d+)?$/, '$1')
    .split(':')[0]
    .trim()
    .toLowerCase();

  return withoutPort;
}

/**
 * Validates whether the given hostname is permitted to access the Super-Admin Control Plane.
 * Permitted hosts:
 * - Local loopback: localhost, 127.0.0.1, ::1, *.localhost, *.local
 * - Explicitly allowed master hosts defined in process.env.SUPER_ADMIN_ALLOWED_HOSTS (comma-separated)
 * Any external customer store domain (e.g. toko-klien.com) will be rejected.
 */
export function isAllowedSuperAdminHost(host: string): boolean {
  if (!host) return false;
  const normalized = host.toLowerCase().trim();

  // Local loopback and development domains
  if (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local')
  ) {
    return true;
  }

  // Check optional master control plane domains whitelist
  const allowedCustom = process.env.SUPER_ADMIN_ALLOWED_HOSTS;
  if (allowedCustom) {
    const allowedList = allowedCustom
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);

    if (allowedList.includes(normalized)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether the Super-Admin Control Plane is enabled on this deployment and request.
 * Customer deployments automatically receive ENABLE_SUPER_ADMIN_CONTROL_PLANE="false"
 * and/or are accessed via external hostnames, so that the duplication portal is
 * completely disabled (returns 404) on client stores.
 */
export function isControlPlaneEnabled(
  request?: Request | Headers | { headers?: Headers | Record<string, string | string[] | undefined> } | null
): boolean {
  const flag = process.env.ENABLE_SUPER_ADMIN_CONTROL_PLANE;
  if (flag && (flag.toLowerCase() === 'false' || flag === '0')) {
    return false;
  }

  if (request) {
    const host = extractRequestHost(request);
    if (host && !isAllowedSuperAdminHost(host)) {
      return false;
    }
  }

  return true;
}
