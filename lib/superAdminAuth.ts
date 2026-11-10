import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
  extractRequestHost,
  isAllowedSuperAdminHost,
  isControlPlaneEnabled,
} from './superAdminGuard';

export { extractRequestHost, isAllowedSuperAdminHost, isControlPlaneEnabled };

export interface SuperAdminPayload {
  role: 'SUPER_ADMIN_OWNER';
  email: string;
  type: 'super_admin_control_plane';
}

function getSuperAdminSecret(): string {
  const secret =
    process.env.SUPER_ADMIN_JWT_SECRET ||
    (process.env.JWT_SECRET ? `${process.env.JWT_SECRET}::super-admin-owner` : null);

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SUPER_ADMIN_JWT_SECRET or JWT_SECRET is required in production');
    }
    return 'dev-super-admin-owner-secret-key-only';
  }
  return secret;
}

/**
 * Resolves the single Owner / Super-Admin credentials.
 * Only THIS account can log in to the Control Plane and duplicate websites.
 */
export function getOwnerCredentials(): {
  email: string;
  password?: string;
  passwordHash?: string;
} {
  const email = (process.env.SUPER_ADMIN_EMAIL || 'owner@master-control.local').trim().toLowerCase();
  const passwordHash = process.env.SUPER_ADMIN_PASSWORD_HASH || undefined;
  const password = process.env.SUPER_ADMIN_PASSWORD || 'MasterOwner#2026!';

  return { email, password, passwordHash };
}

/**
 * Verifies the owner's email and password against the configured single Super-Admin account.
 */
export async function verifyOwnerCredentials(
  inputEmail: string,
  inputPassword: string,
  request?: Request
): Promise<boolean> {
  if (!isControlPlaneEnabled(request)) return false;

  const owner = getOwnerCredentials();
  const normalizedInputEmail = inputEmail.trim().toLowerCase();

  if (normalizedInputEmail !== owner.email) {
    return false;
  }

  if (owner.passwordHash) {
    return bcrypt.compare(inputPassword, owner.passwordHash);
  }

  return Boolean(owner.password && inputPassword === owner.password);
}

/**
 * Generates a signed JWT strictly for the Super-Admin Owner.
 */
export function generateSuperAdminToken(email: string): string {
  const payload: SuperAdminPayload = {
    role: 'SUPER_ADMIN_OWNER',
    email: email.trim().toLowerCase(),
    type: 'super_admin_control_plane',
  };

  return jwt.sign(payload, getSuperAdminSecret(), {
    algorithm: 'HS256',
    expiresIn: '12h',
  });
}

/**
 * Verifies a Super-Admin JWT and guarantees it is NOT a regular store admin token.
 */
export function verifySuperAdminToken(token: string, request?: Request): SuperAdminPayload | null {
  if (!isControlPlaneEnabled(request)) return null;

  try {
    const decoded = jwt.verify(token, getSuperAdminSecret(), {
      algorithms: ['HS256'],
    }) as Partial<SuperAdminPayload>;

    if (
      decoded.role !== 'SUPER_ADMIN_OWNER' ||
      decoded.type !== 'super_admin_control_plane' ||
      !decoded.email
    ) {
      return null;
    }

    const owner = getOwnerCredentials();
    if (decoded.email.toLowerCase() !== owner.email) {
      return null;
    }

    return {
      role: 'SUPER_ADMIN_OWNER',
      email: decoded.email,
      type: 'super_admin_control_plane',
    };
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies the Super-Admin Owner from a Request (Authorization header or cookie).
 */
export function requireSuperAdminOwner(request: Request): SuperAdminPayload | null {
  if (!isControlPlaneEnabled(request)) return null;

  let token: string | null = null;
  const authHeader = request.headers.get('authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/(?:^|;\s*)super_admin_token=([^;]+)/);
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }

  if (!token) return null;
  return verifySuperAdminToken(token, request);
}

