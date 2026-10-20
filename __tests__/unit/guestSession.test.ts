import { generateGuestToken, verifyGuestToken } from '@/lib/guestSession';
import jwt from 'jsonwebtoken';

describe('Guest Session Tokens', () => {
  it('generates a signed guest JWT with type guest and role GUEST', async () => {
    const token = await generateGuestToken('demo-store.local');
    expect(typeof token).toBe('string');

    const decoded = jwt.decode(token) as any;
    expect(decoded.type).toBe('guest');
    expect(decoded.role).toBe('GUEST');
    expect(decoded.storeId).toBe('demo-store.local');
    expect(decoded.sub).toBeTruthy();
  });

  it('verifies a valid guest token and returns payload', async () => {
    const token = await generateGuestToken('store-123');
    const verified = await verifyGuestToken(token);

    expect(verified).not.toBeNull();
    expect(verified?.type).toBe('guest');
    expect(verified?.role).toBe('GUEST');
    expect(verified?.storeId).toBe('store-123');
    expect(verified?.sub).toBeTruthy();
  });

  it('rejects an invalid or malformed token', async () => {
    expect(await verifyGuestToken('invalid-token')).toBeNull();
    expect(await verifyGuestToken('')).toBeNull();
  });

  it('rejects a token signed with the wrong secret', async () => {
    const forgedToken = jwt.sign(
      { type: 'guest', sub: 'hacker', storeId: 'store-1', role: 'GUEST' },
      'wrong-secret'
    );
    expect(await verifyGuestToken(forgedToken)).toBeNull();
  });

  it('rejects a user token that has type user instead of guest', async () => {
    const secret = process.env.GUEST_SESSION_SECRET || 'guest-secret-fallback-change-in-prod';
    const userToken = jwt.sign(
      { type: 'user', sub: 'user-1', storeId: 'store-1', role: 'CUSTOMER' },
      secret
    );
    expect(await verifyGuestToken(userToken)).toBeNull();
  });
});
