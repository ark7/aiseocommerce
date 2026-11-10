import { POST } from '@/app/api/admin/ai/generate-image/route';
import {
  generateProductSalesImage,
  SALES_IMAGE_PRESETS,
} from '@/lib/aiService';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import sharp from 'sharp';

// Mock auth & prisma
jest.mock('@/lib/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    storeSettings: {
      findUnique: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
    productImage: {
      create: jest.fn(),
    },
  },
}));

describe('AI Product Sales Image Generator', () => {
  const mockStoreId = 'test-store-123';
  const mockAdminUser = {
    id: 'user-admin-1',
    email: 'admin@toko.com',
    role: 'ADMIN',
    storeId: mockStoreId,
  };

  let sampleProductBase64: string;

  beforeAll(async () => {
    // Create a tiny valid 100x100 PNG base64 for test reference
    const sampleBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 200, g: 100, b: 50, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    sampleProductBase64 = `data:image/png;base64,${sampleBuffer.toString('base64')}`;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue(mockAdminUser);
    (prisma.storeSettings.findUnique as jest.Mock).mockResolvedValue({
      aiProvider: 'GEMINI',
      aiApiKey: null,
      aiModel: null,
    });
  });

  describe('Core Service: generateProductSalesImage (lib/aiService.ts)', () => {
    it('throws descriptive validation error if reference image is missing or empty', async () => {
      await expect(
        generateProductSalesImage({
          storeId: mockStoreId,
          referenceImage: '',
          style: 'wooden-podium',
        })
      ).rejects.toThrow(/Foto referensi produk asli wajib disertakan/i);

      await expect(
        generateProductSalesImage({
          storeId: mockStoreId,
          referenceImage: '   ',
          style: 'wooden-podium',
        })
      ).rejects.toThrow(/Foto referensi produk asli wajib disertakan/i);
    });

    it('contains all 6 commercial sales style presets with full Indonesian metadata', () => {
      const presetIds = SALES_IMAGE_PRESETS.map((p) => p.id);
      expect(presetIds).toContain('studio-clean');
      expect(presetIds).toContain('wooden-podium');
      expect(presetIds).toContain('luxury-marble');
      expect(presetIds).toContain('nature-lifestyle');
      expect(presetIds).toContain('modern-pastel');
      expect(presetIds).toContain('cyber-neon');
      expect(presetIds).toContain('custom');

      SALES_IMAGE_PRESETS.forEach((preset) => {
        expect(preset.name).toBeTruthy();
        expect(preset.description).toBeTruthy();
        expect(preset.recommendedCategory).toBeTruthy();
        expect(preset.promptTemplate).toBeTruthy();
      });
    });

    it('generates commercial sales image adhering to 1:1 square aspect ratio', async () => {
      const result = await generateProductSalesImage({
        storeId: mockStoreId,
        referenceImage: sampleProductBase64,
        style: 'wooden-podium',
        aspectRatio: '1:1',
        productName: 'Serum Wajah Glow Organik',
      });

      expect(result.success).toBe(true);
      expect(result.imageUrl).toMatch(/^\/uploads\/products\/ai-sales-.*\.webp$/);
      expect(result.style).toBe('wooden-podium');
      expect(result.width).toBe(1080);
      expect(result.height).toBe(1080);
      expect(result.promptUsed).toContain('wooden podium');
    });

    it('generates commercial sales image adhering to 4:5 portrait aspect ratio', async () => {
      const result = await generateProductSalesImage({
        storeId: mockStoreId,
        referenceImage: sampleProductBase64,
        style: 'luxury-marble',
        aspectRatio: '4:5',
      });

      expect(result.success).toBe(true);
      expect(result.width).toBe(1080);
      expect(result.height).toBe(1350);
      expect(result.style).toBe('luxury-marble');
    });

    it('generates commercial sales image adhering to 16:9 landscape aspect ratio', async () => {
      const result = await generateProductSalesImage({
        storeId: mockStoreId,
        referenceImage: sampleProductBase64,
        style: 'cyber-neon',
        aspectRatio: '16:9',
      });

      expect(result.success).toBe(true);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(result.style).toBe('cyber-neon');
    });

    it('attaches generated image to product gallery when attachToProductId is supplied', async () => {
      (prisma.product.findFirst as jest.Mock).mockResolvedValue({
        id: 'prod-001',
        name: 'Serum Wajah Glow',
        storeId: mockStoreId,
        images: [],
      });
      (prisma.productImage.create as jest.Mock).mockResolvedValue({
        id: 'img-new-1',
        productId: 'prod-001',
      });

      const result = await generateProductSalesImage({
        storeId: mockStoreId,
        referenceImage: sampleProductBase64,
        style: 'studio-clean',
        attachToProductId: 'prod-001',
      });

      expect(result.success).toBe(true);
      expect(result.attachedToProduct).toBe(true);
      expect(prisma.productImage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: 'prod-001',
            isPrimary: true,
          }),
        })
      );
    });
  });

  describe('API Route: POST /api/admin/ai/generate-image', () => {
    it('returns 401 when caller is unauthenticated', async () => {
      (requireUser as jest.Mock).mockResolvedValue(null);

      const req = new Request('http://localhost/api/admin/ai/generate-image', {
        method: 'POST',
        body: JSON.stringify({ referenceImage: sampleProductBase64 }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 when caller is not admin or staff', async () => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'cust-1',
        role: 'CUSTOMER',
        storeId: mockStoreId,
      });

      const req = new Request('http://localhost/api/admin/ai/generate-image', {
        method: 'POST',
        body: JSON.stringify({ referenceImage: sampleProductBase64 }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it('returns 400 when referenceImage is omitted or blank', async () => {
      const req = new Request('http://localhost/api/admin/ai/generate-image', {
        method: 'POST',
        body: JSON.stringify({
          style: 'wooden-podium',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toMatch(/Foto referensi produk asli wajib disertakan/i);
    });

    it('returns 200 and image URL when valid referenceImage is supplied', async () => {
      const req = new Request('http://localhost/api/admin/ai/generate-image', {
        method: 'POST',
        body: JSON.stringify({
          referenceImage: sampleProductBase64,
          style: 'nature-lifestyle',
          aspectRatio: '1:1',
          productName: 'Madu Hutan Sumbawa',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.imageUrl).toMatch(/^\/uploads\/products\/ai-sales-.*\.webp$/);
      expect(data.style).toBe('nature-lifestyle');
    });
  });
});
