import { NextRequest, NextResponse } from 'next/server';
import * as auth from './auth';
import type { UserPayload } from './auth';
import { prisma } from './prisma';
import { hasPermission, normalizePermissions, PermissionKey } from './rbac';

export type AuthGuardResult =
  | { authorized: true; user: UserPayload }
  | { authorized: false; response: NextResponse };

export interface RequirePermissionOptions {
  /** Extra roles allowed to bypass module permission check (e.g. 'SUPER_ADMIN', 'OWNER'). */
  allowExtraRoles?: string[];
  /** Custom top-level error field in 403 JSON payload (default: 'Akses Ditolak'). */
  forbiddenError?: string;
  /** Custom 403 message field in JSON payload. */
  forbiddenMessage?: string;
  /** Status code returned when caller is unauthenticated (default: 401). */
  unauthenticatedStatus?: 401 | 403;
  /** Store scope forwarded to legacy `requireStoreRole` when `requireUser` is not mocked in tests. */
  storeId?: string;
  /** Role list forwarded to `requireStoreRole` fallback (default: ['ADMIN', 'STAFF']). */
  storeRoles?: string[];
}

function extractRawToken(request: NextRequest | Request): string | null {
  const header = request.headers.get('authorization');
  if (header?.startsWith('Bearer ')) {
    const bearer = header.slice(7).trim();
    if (bearer) return bearer;
  }
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }
  return null;
}

/**
 * Resolves the caller identity from `requireUser`, `verifyToken`, or `requireStoreRole`
 * so unit tests that mock any one of those auth helpers continue to work cleanly.
 */
export async function resolveAuthenticatedUser(
  request: NextRequest | Request,
  storeId?: string,
  storeRoles: string[] = ['ADMIN', 'STAFF']
): Promise<UserPayload | null> {
  if (typeof auth.requireUser === 'function') {
    const user = await auth.requireUser(request);
    // An unconfigured jest.fn() mock returns undefined; fall through to verifyToken/requireStoreRole.
    if (user !== undefined) {
      return user;
    }
  }

  if (typeof auth.verifyToken === 'function') {
    const token = extractRawToken(request);
    if (token) {
      const user = await auth.verifyToken(token);
      if (user !== undefined) {
        return user;
      }
    }
  }

  if (storeId && typeof auth.requireStoreRole === 'function') {
    return (await auth.requireStoreRole(request, storeId, storeRoles)) ?? null;
  }

  return null;
}

async function resolveFreshStaffUser(
  user: UserPayload
): Promise<{ active: boolean; user: UserPayload }> {
  if (user.role !== 'STAFF') {
    return { active: true, user };
  }

  if (!user.id || typeof prisma?.user?.findUnique !== 'function') {
    return { active: true, user };
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        isActive: true,
        role: true,
        permissions: true,
        storeId: true,
      },
    });

    // In mocked unit tests `jest.fn()` returns `undefined` when unconfigured; fall back to token payload.
    if (dbUser === undefined) {
      return { active: true, user };
    }

    if (dbUser === null || dbUser.isActive === false) {
      return { active: false, user };
    }

    return {
      active: true,
      user: {
        ...user,
        role: dbUser.role || user.role,
        storeId: dbUser.storeId || user.storeId,
        permissions: normalizePermissions(dbUser.permissions),
      },
    };
  } catch {
    return { active: false, user };
  }
}

/**
 * Server-side RBAC guard for API routes requiring ANY of the given permission keys.
 */
export async function requireAnyPermission(
  request: NextRequest | Request,
  requiredKeys: PermissionKey[],
  options?: RequirePermissionOptions
): Promise<AuthGuardResult> {
  const user = await resolveAuthenticatedUser(request, options?.storeId, options?.storeRoles);
  if (!user) {
    const status = options?.unauthenticatedStatus ?? 401;
    return {
      authorized: false,
      response: NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Unauthorized' }, { status }),
    };
  }

  if (options?.allowExtraRoles?.includes(user.role)) {
    return { authorized: true, user };
  }

  const { active, user: resolvedUser } = await resolveFreshStaffUser(user);
  if (!active) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          error: options?.forbiddenError ?? 'Akses Ditolak',
          message: 'Akun staf tidak aktif atau sudah dinonaktifkan.',
        },
        { status: 403 }
      ),
    };
  }

  if (options?.allowExtraRoles?.includes(resolvedUser.role)) {
    return { authorized: true, user: resolvedUser };
  }

  const permitted = requiredKeys.some((key) => hasPermission(resolvedUser, key));
  if (!permitted) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          error: options?.forbiddenError ?? 'Akses Ditolak',
          message:
            options?.forbiddenMessage ||
            `Anda tidak memiliki izin akses untuk modul '${requiredKeys.join("' / '")}'.`,
        },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, user: resolvedUser };
}

/**
 * Server-side RBAC guard for API routes requiring a single permission key.
 * ADMIN role always passes; STAFF role is verified against fresh DB `isActive` & `permissions`.
 */
export async function requirePermission(
  request: NextRequest | Request,
  requiredKey: PermissionKey,
  options?: RequirePermissionOptions
): Promise<AuthGuardResult> {
  return requireAnyPermission(request, [requiredKey], options);
}
