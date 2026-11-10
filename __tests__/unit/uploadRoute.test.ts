import { POST } from '@/app/api/upload/route';
import { requireUser } from '@/lib/auth';
import { requireSuperAdminOwner } from '@/lib/superAdminAuth';
import { optimizeAndSaveImage, validateRawImage } from '@/lib/imageOptimizer';

jest.mock('@/lib/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/lib/superAdminAuth', () => ({
  requireSuperAdminOwner: jest.fn(),
}));

jest.mock('@/lib/imageOptimizer', () => {
  const original = jest.requireActual('@/lib/imageOptimizer');
  return {
    ...original,
    optimizeAndSaveImage: jest.fn(),
    validateRawImage: jest.fn(),
  };
});

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('POST /api/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated and not super-admin owner', async () => {
    (requireUser as jest.Mock).mockResolvedValue(null);
    (requireSuperAdminOwner as jest.Mock).mockReturnValue(false);

    const formData = new FormData();
    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Unauthorized');
  });

  it('returns 403 when user is CUSTOMER', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 'u1', role: 'CUSTOMER', storeId: 'store-1' });
    (requireSuperAdminOwner as jest.Mock).mockReturnValue(false);

    const formData = new FormData();
    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Forbidden');
  });

  it('returns 400 when file is missing from FormData', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 'u1', role: 'ADMIN', storeId: 'store-1' });
    (requireSuperAdminOwner as jest.Mock).mockReturnValue(false);

    const formData = new FormData();
    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('File gambar wajib disertakan');
  });

  it('returns 400 when validation fails', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 'u1', role: 'ADMIN', storeId: 'store-1' });
    (requireSuperAdminOwner as jest.Mock).mockReturnValue(false);
    (validateRawImage as jest.Mock).mockReturnValue({
      valid: false,
      error: 'File terlalu besar (maksimal 10MB).',
    });

    const fakeFile = new File(['fake content'], 'large.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', fakeFile);
    formData.append('type', 'product');

    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('File terlalu besar (maksimal 10MB).');
  });

  it('returns 200 with optimization metadata on successful upload by Store Admin', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 'u1', role: 'ADMIN', storeId: 'store-1' });
    (requireSuperAdminOwner as jest.Mock).mockReturnValue(false);
    (validateRawImage as jest.Mock).mockReturnValue({ valid: true });
    (optimizeAndSaveImage as jest.Mock).mockResolvedValue({
      url: '/uploads/logos/store-1/logo-123.webp',
      filename: 'logo-123.webp',
      originalSize: 500000,
      optimizedSize: 60000,
      savingsPercent: 88,
      width: 500,
      height: 500,
      format: 'webp',
    });

    const fakeFile = new File(['fake image bytes'], 'my-logo.png', { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', fakeFile);
    formData.append('type', 'logo');

    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.url).toBe('/uploads/logos/store-1/logo-123.webp');
    expect(body.savingsPercent).toBe(88);
    expect(optimizeAndSaveImage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'logo',
        storeId: 'store-1',
        originalFilename: 'my-logo.png',
      })
    );
  });

  it('returns 200 on successful upload by Super-Admin owner without store session', async () => {
    (requireUser as jest.Mock).mockResolvedValue(null);
    (requireSuperAdminOwner as jest.Mock).mockReturnValue(true);
    (validateRawImage as jest.Mock).mockReturnValue({ valid: true });
    (optimizeAndSaveImage as jest.Mock).mockResolvedValue({
      url: '/uploads/logos/tenant-logo.webp',
      filename: 'tenant-logo.webp',
      originalSize: 800000,
      optimizedSize: 90000,
      savingsPercent: 88.75,
      width: 500,
      height: 500,
      format: 'webp',
    });

    const fakeFile = new File(['fake bytes'], 'tenant.png', { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', fakeFile);
    formData.append('type', 'logo');

    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.url).toBe('/uploads/logos/tenant-logo.webp');
  });

  it('returns 500 when optimization throws an exception', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 'u1', role: 'ADMIN', storeId: 'store-1' });
    (requireSuperAdminOwner as jest.Mock).mockReturnValue(false);
    (validateRawImage as jest.Mock).mockReturnValue({ valid: true });
    (optimizeAndSaveImage as jest.Mock).mockRejectedValue(new Error('Sharp processing failed'));

    const fakeFile = new File(['fake bytes'], 'corrupt.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', fakeFile);

    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('Terjadi kesalahan saat memproses dan mengompresi gambar');
  });
});

