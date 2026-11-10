import { POST, PATCH } from '@/app/api/products/route';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    productImage: { delete: jest.fn() },
  },
}));

jest.mock('@/lib/auth', () => ({ verifyToken: jest.fn() }));

jest.mock('@/lib/revalidate', () => ({
  revalidateProduct: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/auditService', () => ({
  auditProductCreated: jest.fn().mockResolvedValue(undefined),
  auditProductUpdated: jest.fn().mockResolvedValue(undefined),
  auditProductDeleted: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

const ADMIN = { id: 'admin-1', storeId: 'store-1', email: 'admin@toko.com', role: 'ADMIN' };

function createFormRequest(fields: Record<string, string>, method: 'POST' | 'PATCH' = 'POST') {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));

  return new Request('http://localhost/api/products', {
    method,
    headers: { Authorization: 'Bearer test-token' },
    body: form,
  });
}

describe('POST /api/products - Digital Products & Events Support', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyToken as jest.Mock).mockResolvedValue(ADMIN);
  });

  it('creates a DIGITAL product with file url and fulfillment instructions', async () => {
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.product.create as jest.Mock).mockImplementation(async ({ data }) => ({
      id: 'prod-digital-1',
      ...data,
      images: [],
    }));

    const response = await POST(
      createFormRequest({
        name: 'E-Book Panduan SEO 2026',
        slug: 'ebook-panduan-seo-2026',
        basePrice: '50000',
        sellingPrice: '99000',
        productType: 'DIGITAL',
        digitalFileUrl: 'https://cdn.toko.com/ebooks/seo-2026.pdf',
        digitalInstructions: 'Buka tautan file PDF dan gunakan password yang dikirimkan.',
        isPublished: 'true',
      })
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storeId: 'store-1',
          name: 'E-Book Panduan SEO 2026',
          productType: 'DIGITAL',
          digitalFileUrl: 'https://cdn.toko.com/ebooks/seo-2026.pdf',
          digitalInstructions: 'Buka tautan file PDF dan gunakan password yang dikirimkan.',
          basePrice: 50000,
          sellingPrice: 99000,
        }),
      })
    );
  });

  it('creates an EVENT / SEMINAR product with dates, venue, quota, speakers and benefits', async () => {
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.product.create as jest.Mock).mockImplementation(async ({ data }) => ({
      id: 'prod-event-1',
      ...data,
      images: [],
    }));

    const startDate = '2026-11-20T09:00:00.000Z';
    const endDate = '2026-11-20T12:00:00.000Z';
    const speakers = [
      { name: 'dr. Andi Pratama', role: 'Health Expert' },
      { name: 'Bambang Sudibyo', role: 'Growth Specialist' },
    ];
    const benefits = ['E-Sertifikat 4 SKP', 'Rekaman Full HD', 'Grup Diskusi'];

    const response = await POST(
      createFormRequest({
        name: 'Webinar Transformasi AI 2026',
        slug: 'webinar-transformasi-ai-2026',
        basePrice: '0',
        sellingPrice: '149000',
        productType: 'EVENT',
        eventStartDate: startDate,
        eventEndDate: endDate,
        eventLocationType: 'ONLINE',
        eventVenueName: 'Zoom Cloud Meetings',
        eventLocationAddress: 'https://zoom.us/j/987654321',
        eventQuota: '250',
        eventSpeakers: JSON.stringify(speakers),
        eventBenefits: JSON.stringify(benefits),
        isPublished: 'true',
      })
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productType: 'EVENT',
          eventStartDate: new Date(startDate),
          eventEndDate: new Date(endDate),
          eventLocationType: 'ONLINE',
          eventVenueName: 'Zoom Cloud Meetings',
          eventLocationAddress: 'https://zoom.us/j/987654321',
          eventQuota: 250,
          eventSpeakers: speakers,
          eventBenefits: benefits,
        }),
      })
    );
  });

  it('defaults omitted productType to PHYSICAL for full backward compatibility', async () => {
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.product.create as jest.Mock).mockImplementation(async ({ data }) => ({
      id: 'prod-phys-1',
      ...data,
      images: [],
    }));

    const response = await POST(
      createFormRequest({
        name: 'Kemeja Batik Katun',
        slug: 'kemeja-batik-katun',
        basePrice: '80000',
        sellingPrice: '150000',
        stock: '25',
      })
    );

    expect(response.status).toBe(200);
    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Kemeja Batik Katun',
          productType: 'PHYSICAL',
          stock: 25,
        }),
      })
    );
  });

  it('updates an existing product with PATCH to DIGITAL details', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue({
      id: 'prod-existing',
      storeId: 'store-1',
      productType: 'PHYSICAL',
      images: [],
    });
    (prisma.product.update as jest.Mock).mockImplementation(async ({ data }) => ({
      id: 'prod-existing',
      ...data,
    }));

    const response = await PATCH(
      createFormRequest(
        {
          id: 'prod-existing',
          productType: 'DIGITAL',
          digitalFileUrl: 'https://storage.googleapis.com/drive/course.zip',
          digitalInstructions: 'Ekstrak file zip dan tonton video tutorial.',
        },
        'PATCH'
      )
    );

    expect(response.status).toBe(200);
    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'prod-existing' }),
        data: expect.objectContaining({
          productType: 'DIGITAL',
          digitalFileUrl: 'https://storage.googleapis.com/drive/course.zip',
          digitalInstructions: 'Ekstrak file zip dan tonton video tutorial.',
        }),
      })
    );
  });
});
