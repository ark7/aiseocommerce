import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { getIPAddress, incrementLoginAttempts } from '@/middleware';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

export interface UserPayload {
  id: string;
  storeId: string;
  email: string;
  role: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    role: string;
    storeId: string;
    firstName?: string | null;
    lastName?: string | null;
  };
  token: string;
  refreshToken: string;
}

export async function generateToken(payload: UserPayload): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  const token = await new SignJWT({ ...payload } as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secret);
  return token;
}

export async function generateRefreshToken(payload: UserPayload): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  const token = await new SignJWT({ ...payload, type: 'refresh' } as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRES_IN)
    .sign(secret);
  return token;
}

export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as any as UserPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function registerUser(
  storeId: string,
  email: string,
  password: string,
  firstName?: string,
  lastName?: string,
  role: string = 'CUSTOMER'
): Promise<AuthResult | null> {
  try {
    const existingUser = await prisma.user.findFirst({
      where: { storeId, email },
    });
    if (existingUser) return null;
    
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { storeId, email, passwordHash, firstName, lastName, role: role as any },
    });
    
    const payload: UserPayload = {
      id: user.id,
      storeId: user.storeId,
      email: user.email,
      role: user.role,
    };
    
    return {
      user: { id: user.id, email: user.email, role: user.role, storeId: user.storeId, firstName: user.firstName, lastName: user.lastName },
      token: await generateToken(payload),
      refreshToken: await generateRefreshToken(payload),
    };
  } catch (error) {
    console.error('Registration error:', error);
    return null;
  }
}

export async function loginUser(
  storeId: string,
  email: string,
  password: string,
  request?: NextRequest
): Promise<AuthResult | null> {
  try {
    const user = await prisma.user.findFirst({ where: { storeId, email } });
    if (!user) {
      if (request) await incrementLoginAttempts(getIPAddress(request));
      return null;
    }
    if (!user.isActive) return null;
    
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      if (request) await incrementLoginAttempts(getIPAddress(request));
      return null;
    }
    
    const payload: UserPayload = {
      id: user.id,
      storeId: user.storeId,
      email: user.email,
      role: user.role,
    };
    
    return {
      user: { id: user.id, email: user.email, role: user.role, storeId: user.storeId, firstName: user.firstName, lastName: user.lastName },
      token: await generateToken(payload),
      refreshToken: await generateRefreshToken(payload),
    };
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<{ token: string; refreshToken: string } | null> {
  try {
    const payload = await verifyToken(refreshToken) as any;
    if (!payload || payload.type !== 'refresh') return null;
    
    const newToken = await generateToken({
      id: payload.id,
      storeId: payload.storeId,
      email: payload.email,
      role: payload.role,
    });
    
    const newRefreshToken = await generateRefreshToken({
      id: payload.id,
      storeId: payload.storeId,
      email: payload.email,
      role: payload.role,
    });
    
    return { token: newToken, refreshToken: newRefreshToken };
  } catch {
    return null;
  }
}

export async function logoutUser(token: string): Promise<void> {
  // In production, use Redis to blacklist token
  console.log('Token blacklisted:', token.substring(0, 8) + '...');
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, storeId: true, firstName: true, lastName: true, isActive: true },
  });
}
