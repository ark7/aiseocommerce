import { POST } from '@/app/api/auth/login/route';
import { prisma } from '@/lib/prisma';
import { getActiveStore } from '@/lib/store';
import { loginUser } from '@/lib/auth';
import { isTurnstileRequired } from '@/lib/turnstile';
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    store: {
      findUnique: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/store', () => ({
  getActiveStore: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  loginUser: jest.fn(),
}));

jest.mock('@/lib/turnstile', () => ({
  isTurnstileRequired: jest.fn().mockReturnValue({ required: false }),
  verifyTurnstile: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/ip', () => ({
  getIPAddress: jest.fn().mockReturnValue('127.0.0.1'),
}));

describe('POST /api/auth/login - Multi-Tenant Resolution & Localhost Fallback', () => {
  const storeA = {
    id: 'store-tokodemoku',
    name: 'tokodemoku',
    domain: 'tokodemoyuhu.com',
    settings: { turnstileEnabled: false },
  };

  const demoStore = {
    id: 'demo-store-001',
    name: 'AI SEO Demo Store',
    domain: 'demo-store.local',
    settings: { turnstileEnabled: false },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('authenticates directly when user matches the active store', async () => {
    (prisma.store.findUnique as jest.Mock).mockResolvedValue(storeA);
    (loginUser as jest.Mock).mockResolvedValue({
      user: {
        id: 'user-a',
        email: 'owner@t.com',
        role: 'ADMIN',
        storeId: storeA.id,
      },
      token: 'token-a',
      refreshToken: 'refresh-a',
    });

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { host: 'localhost:3000', 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@t.com',
        password: 'password123',
        storeId: storeA.id,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user.email).toBe('owner@t.com');
    expect(body.user.storeId).toBe(storeA.id);
    expect(loginUser).toHaveBeenCalledWith(storeA.id, 'owner@t.com', 'password123', expect.anything());
  });

  it('seamlessly falls back to candidate user store on localhost when admin@demo-store.local is used', async () => {
    // When visiting localhost:3000, bodyStoreId is tokodemoku
    (prisma.store.findUnique as jest.Mock).mockImplementation(({ where }) => {
      if (where?.id === storeA.id) return Promise.resolve(storeA);
      return Promise.resolve(null);
    });

    // Attempting login on storeA fails (user does not belong to tokodemoku)
    (loginUser as jest.Mock).mockImplementation((storeId, email) => {
      if (storeId === storeA.id) return Promise.resolve(null);
      if (storeId === demoStore.id && email === 'admin@demo-store.local') {
        return Promise.resolve({
          user: {
            id: 'demo-admin-001',
            email: 'admin@demo-store.local',
            role: 'ADMIN',
            storeId: demoStore.id,
          },
          token: 'demo-token',
          refreshToken: 'demo-refresh',
        });
      }
      return Promise.resolve(null);
    });

    // Lookup across stores finds demo-admin-001 in demoStore
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'demo-admin-001',
        email: 'admin@demo-store.local',
        storeId: demoStore.id,
        isActive: true,
        store: demoStore,
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { host: 'localhost:3000', 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@demo-store.local',
        password: 'password',
        storeId: storeA.id, // initially bound to storeA on localhost
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user.email).toBe('admin@demo-store.local');
    expect(body.user.storeId).toBe(demoStore.id);
    // Verifies active_store_domain cookie is updated to demo-store.local
    const setCookieHeader = response.headers.get('set-cookie');
    expect(setCookieHeader).toContain('active_store_domain=demo-store.local');
  });

  it('preserves strict tenant isolation on non-localhost custom domains', async () => {
    (prisma.store.findUnique as jest.Mock).mockResolvedValue(storeA);
    // Fails on storeA
    (loginUser as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('https://tokodemoyuhu.com/api/auth/login', {
      method: 'POST',
      headers: { host: 'tokodemoyuhu.com', 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@demo-store.local',
        password: 'password',
        storeId: storeA.id,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Invalid email or password');
    // findMany across stores should NOT be called on production domain
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('rejects with 401 when password is wrong even on localhost', async () => {
    (prisma.store.findUnique as jest.Mock).mockResolvedValue(storeA);
    // All loginUser attempts fail
    (loginUser as jest.Mock).mockResolvedValue(null);

    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'demo-admin-001',
        email: 'admin@demo-store.local',
        storeId: demoStore.id,
        isActive: true,
        store: demoStore,
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { host: 'localhost:3000', 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@demo-store.local',
        password: 'wrongpassword',
        storeId: storeA.id,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Invalid email or password');
  });
});

