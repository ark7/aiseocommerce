import { GET, POST } from '@/app/api/admin/landing-pages/route';
import { GET as GET_ONE, PUT, DELETE } from '@/app/api/admin/landing-pages/[id]/route';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { revalidateLandingPage } from '@/lib/revalidate';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    landingPage: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/lib/revalidate', () => ({
  revalidateLandingPage: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const ADMIN_USER = { id: 'admin-1', storeId: 'store-1', role: 'ADMIN' };
const STAFF_USER = { id: 'staff-1', storeId: 'store-1', role: 'STAFF' };
const CUSTOMER_USER = { id: 'cust-1', storeId: 'store-1', role: 'CUSTOMER' };

describe('Admin Landing Pages API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/landing-pages', () => {
    it('returns 403 when unauthenticated or customer', async () => {
      (requireUser as jest.Mock).mockResolvedValue(null);
      const res1 = await GET(new Request('http://localhost/api/admin/landing-pages'));
      expect(res1.status).toBe(403);

      (requireUser as jest.Mock).mockResolvedValue(CUSTOMER_USER);
      const res2 = await GET(new Request('http://localhost/api/admin/landing-pages'));
      expect(res2.status).toBe(403);
    });

    it('returns landing pages list for ADMIN or STAFF', async () => {
      (requireUser as jest.Mock).mockResolvedValue(STAFF_USER);
      (prisma.landingPage.findMany as jest.Mock).mockResolvedValue([
        { id: 'lp-1', title: 'Promo 1', slug: 'promo-1', sections: [] },
      ]);

      const res = await GET(new Request('http://localhost/api/admin/landing-pages'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.landingPages).toHaveLength(1);
      expect(prisma.landingPage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { storeId: 'store-1' },
        })
      );
    });
  });

  describe('POST /api/admin/landing-pages', () => {
    it('returns 400 when missing required title or invalid slug', async () => {
      (requireUser as jest.Mock).mockResolvedValue(ADMIN_USER);

      const res = await POST(
        new Request('http://localhost/api/admin/landing-pages', {
          method: 'POST',
          body: JSON.stringify({ title: '', slug: 'INVALID SLUG!' }),
        })
      );

      expect(res.status).toBe(400);
    });

    it('returns 400 when slug already exists in store', async () => {
      (requireUser as jest.Mock).mockResolvedValue(ADMIN_USER);
      (prisma.landingPage.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-id' });

      const res = await POST(
        new Request('http://localhost/api/admin/landing-pages', {
          method: 'POST',
          body: JSON.stringify({
            title: 'Promo Spesial',
            slug: 'promo-spesial',
            sections: [],
          }),
        })
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Slug already exists/);
    });

    it('creates landing page and triggers cache revalidation', async () => {
      (requireUser as jest.Mock).mockResolvedValue(ADMIN_USER);
      (prisma.landingPage.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.landingPage.create as jest.Mock).mockResolvedValue({
        id: 'lp-new',
        title: 'Promo Ramadhan',
        slug: 'promo-ramadhan',
        storeId: 'store-1',
        isPublished: true,
      });

      const res = await POST(
        new Request('http://localhost/api/admin/landing-pages', {
          method: 'POST',
          body: JSON.stringify({
            title: 'Promo Ramadhan',
            slug: 'promo-ramadhan',
            isPublished: true,
            sections: [],
          }),
        })
      );

      expect(res.status).toBe(201);
      expect(revalidateLandingPage).toHaveBeenCalledWith('store-1', 'promo-ramadhan');
    });
  });

  describe('GET /api/admin/landing-pages/[id]', () => {
    it('returns 404 when landing page not found', async () => {
      (requireUser as jest.Mock).mockResolvedValue(ADMIN_USER);
      (prisma.landingPage.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await GET_ONE(new Request('http://localhost/api/admin/landing-pages/lp-99'), {
        params: Promise.resolve({ id: 'lp-99' }),
      });

      expect(res.status).toBe(404);
    });

    it('returns landing page data', async () => {
      (requireUser as jest.Mock).mockResolvedValue(ADMIN_USER);
      (prisma.landingPage.findFirst as jest.Mock).mockResolvedValue({
        id: 'lp-1',
        title: 'Promo Flash Sale',
        slug: 'flash-sale',
      });

      const res = await GET_ONE(new Request('http://localhost/api/admin/landing-pages/lp-1'), {
        params: Promise.resolve({ id: 'lp-1' }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.landingPage.title).toBe('Promo Flash Sale');
    });
  });

  describe('PUT /api/admin/landing-pages/[id]', () => {
    it('updates landing page and purges old and new slug', async () => {
      (requireUser as jest.Mock).mockResolvedValue(ADMIN_USER);
      (prisma.landingPage.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'lp-1', storeId: 'store-1', slug: 'old-slug' }) // existing check
        .mockResolvedValueOnce(null); // uniqueness check
      (prisma.landingPage.update as jest.Mock).mockResolvedValue({
        id: 'lp-1',
        slug: 'new-slug',
        title: 'Updated Promo',
      });

      const res = await PUT(
        new Request('http://localhost/api/admin/landing-pages/lp-1', {
          method: 'PUT',
          body: JSON.stringify({
            title: 'Updated Promo',
            slug: 'new-slug',
          }),
        }),
        { params: Promise.resolve({ id: 'lp-1' }) }
      );

      expect(res.status).toBe(200);
      expect(revalidateLandingPage).toHaveBeenCalledWith('store-1', 'new-slug', 'old-slug');
    });
  });

  describe('DELETE /api/admin/landing-pages/[id]', () => {
    it('deletes landing page and purges cache', async () => {
      (requireUser as jest.Mock).mockResolvedValue(ADMIN_USER);
      (prisma.landingPage.findFirst as jest.Mock).mockResolvedValue({
        id: 'lp-1',
        storeId: 'store-1',
        slug: 'promo-deleted',
      });

      const res = await DELETE(
        new Request('http://localhost/api/admin/landing-pages/lp-1', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 'lp-1' }) }
      );

      expect(res.status).toBe(200);
      expect(prisma.landingPage.delete).toHaveBeenCalledWith({ where: { id: 'lp-1' } });
      expect(revalidateLandingPage).toHaveBeenCalledWith('store-1', 'promo-deleted');
    });
  });
});

