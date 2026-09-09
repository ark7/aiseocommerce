/**
 * Unit Tests for Auth Functions
 * Tests for: generateToken, verifyToken, hashPassword, comparePassword
 */

const { 
  generateToken, 
  generateRefreshToken, 
  verifyToken, 
  hashPassword, 
  comparePassword
} = require('@/lib/auth');
const { SignJWT, jwtVerify } = require('jose');

// Save original env
const originalJwtSecret = process.env.JWT_SECRET;

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-change-in-production';
});

afterAll(() => {
  process.env.JWT_SECRET = originalJwtSecret;
});

describe('Auth Functions', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', async () => {
      const payload = {
        id: 'user-123',
        storeId: 'store-456',
        email: 'test@example.com',
        role: 'ADMIN',
      };

      const token = await generateToken(payload);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(100);
    });

    it('should include payload data in the token', async () => {
      const payload = {
        id: 'user-123',
        storeId: 'store-456',
        email: 'test@example.com',
        role: 'ADMIN',
      };

      const token = await generateToken(payload);
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload: decodedPayload } = await jwtVerify(token, secret);

      expect(decodedPayload.id).toBe(payload.id);
      expect(decodedPayload.storeId).toBe(payload.storeId);
      expect(decodedPayload.email).toBe(payload.email);
      expect(decodedPayload.role).toBe(payload.role);
    });

    it('should use HS256 algorithm', async () => {
      const payload = {
        id: 'user-1',
        storeId: 'store-1',
        email: 'admin@test.com',
        role: 'ADMIN',
      };

      const token = await generateToken(payload);
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload: decodedPayload, protectedHeader } = await jwtVerify(token, secret);

      expect(protectedHeader.alg).toBe('HS256');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token with type field', async () => {
      const payload = {
        id: 'user-123',
        storeId: 'store-456',
        email: 'test@example.com',
        role: 'ADMIN',
      };

      const token = await generateRefreshToken(payload);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload: decodedPayload } = await jwtVerify(token, secret);

      expect(decodedPayload.type).toBe('refresh');
    });

    it('should have longer expiration than access token', async () => {
      const payload = {
        id: 'user-1',
        storeId: 'store-1',
        email: 'test@test.com',
        role: 'ADMIN',
      };

      const accessToken = await generateToken(payload);
      const refreshToken = await generateRefreshToken(payload);

      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload: accessPayload } = await jwtVerify(accessToken, secret);
      const { payload: refreshPayload } = await jwtVerify(refreshToken, secret);

      // Refresh token should expire later (30d vs 7d)
      expect(refreshPayload.exp).toBeGreaterThan(accessPayload.exp);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const payload = {
        id: 'user-123',
        storeId: 'store-456',
        email: 'test@example.com',
        role: 'ADMIN',
      };

      const token = await generateToken(payload);
      const result = await verifyToken(token);

      expect(result).not.toBeNull();
      expect(result.id).toBe(payload.id);
      expect(result.email).toBe(payload.email);
    });

    it('should return null for invalid token', async () => {
      const invalidToken = 'invalid-token-string';
      const result = await verifyToken(invalidToken);

      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      // Create a token with very short expiration
      const payload = {
        id: 'user-1',
        storeId: 'store-1',
        email: 'test@test.com',
        role: 'ADMIN',
      };

      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const expiredToken = await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('0s') // Expires immediately
        .sign(secret);

      // Wait a bit to ensure token is expired
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await verifyToken(expiredToken);
      expect(result).toBeNull();
    });

    it('should return null for token with wrong secret', async () => {
      // Create a token manually with wrong secret
      const payload = {
        id: 'user-1',
        storeId: 'store-1',
        email: 'test@test.com',
        role: 'ADMIN',
      };

      const wrongSecret = 'wrong-secret-key';
      const secret = new TextEncoder().encode(wrongSecret);
      const token = await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(secret);

      const result = await verifyToken(token);
      expect(result).toBeNull();
    });
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'test-password-123';
      const hash = await hashPassword(password);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
    });

    it('should generate different hashes for different passwords', async () => {
      const password1 = 'password-1';
      const password2 = 'password-2';

      const hash1 = await hashPassword(password1);
      const hash2 = await hashPassword(password2);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for same password (salt)', async () => {
      const password = 'same-password';

      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // Due to salting, hashes should be different
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'test-password';
      const hash = await hashPassword(password);

      const result = await comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'test-password';
      const wrongPassword = 'wrong-password';
      const hash = await hashPassword(password);

      const result = await comparePassword(wrongPassword, hash);
      expect(result).toBe(false);
    });

    it('should return false for invalid hash format', async () => {
      const password = 'test-password';
      const invalidHash = 'invalid-hash';

      const result = await comparePassword(password, invalidHash);
      expect(result).toBe(false);
    });
  });
});
