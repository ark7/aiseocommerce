import { POST, PATCH } from '@/app/api/products/route';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import React from 'react';
import ProductMarketplaceLinks from '@/components/ProductMarketplaceLinks';

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

const ADMIN = { id: 'user-admin', storeId: 'store-1', email: 'admin@toko.id', role: 'ADMIN' };

function createFormDataRequest(fields: Record<string, string>, method: 'POST' | 'PATCH') {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  return new Request('http://localhost/api/products', {
    method,
    headers: { Authorization: 'Bearer token-123' },
    body: form,
  });
}

describe('Product Marketplace Links (Shopee, Tokopedia, TikTok Shop, Blibli, Custom)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API Route POST /api/products — Marketplace Links Ingestion', () => {
    it('successfully parses and saves marketplace links on product creation', async () => {
      (verifyToken as jest.Mock).mockResolvedValue(ADMIN);
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.product.create as jest.Mock).mockResolvedValue({
        id: 'prod-new-1',
        slug: 'sepatu-sneakers',
        shopeeUrl: 'https://shopee.co.id/product/123/456',
        tokopediaUrl: 'https://tokopedia.com/toko/sepatu',
        tiktokShopUrl: 'https://shop.tiktok.com/view/product/789',
        blibliUrl: 'https://www.blibli.com/p/sepatu/ps--001',
        customMarketplaceName: 'Lazada',
        customMarketplaceUrl: 'https://lazada.co.id/products/sepatu.html',
        images: [],
      });

      const response = await POST(
        createFormDataRequest(
          {
            name: 'Sepatu Sneakers Pria',
            slug: 'sepatu-sneakers',
            basePrice: '150000',
            sellingPrice: '200000',
            shopeeUrl: 'https://shopee.co.id/product/123/456',
            tokopediaUrl: 'https://tokopedia.com/toko/sepatu',
            tiktokShopUrl: 'https://shop.tiktok.com/view/product/789',
            blibliUrl: 'https://www.blibli.com/p/sepatu/ps--001',
            customMarketplaceName: 'Lazada',
            customMarketplaceUrl: 'https://lazada.co.id/products/sepatu.html',
          },
          'POST'
        )
      );

      expect(response.status).toBe(200);
      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shopeeUrl: 'https://shopee.co.id/product/123/456',
            tokopediaUrl: 'https://tokopedia.com/toko/sepatu',
            tiktokShopUrl: 'https://shop.tiktok.com/view/product/789',
            blibliUrl: 'https://www.blibli.com/p/sepatu/ps--001',
            customMarketplaceName: 'Lazada',
            customMarketplaceUrl: 'https://lazada.co.id/products/sepatu.html',
          }),
        })
      );
    });

    it('coerces empty string marketplace links to null to keep database clean', async () => {
      (verifyToken as jest.Mock).mockResolvedValue(ADMIN);
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.product.create as jest.Mock).mockResolvedValue({
        id: 'prod-new-2',
        slug: 'kaos-polos',
        images: [],
      });

      const response = await POST(
        createFormDataRequest(
          {
            name: 'Kaos Polos Katun',
            slug: 'kaos-polos',
            basePrice: '50000',
            sellingPrice: '75000',
            shopeeUrl: '',
            tokopediaUrl: '',
            tiktokShopUrl: '',
            blibliUrl: '',
            customMarketplaceName: '',
            customMarketplaceUrl: '',
          },
          'POST'
        )
      );

      expect(response.status).toBe(200);
      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shopeeUrl: null,
            tokopediaUrl: null,
            tiktokShopUrl: null,
            blibliUrl: null,
            customMarketplaceName: null,
            customMarketplaceUrl: null,
          }),
        })
      );
    });
  });

  describe('API Route PATCH /api/products — Marketplace Links Update', () => {
    it('updates marketplace URLs when modified by store admin', async () => {
      (verifyToken as jest.Mock).mockResolvedValue(ADMIN);
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({
        id: 'prod-100',
        storeId: 'store-1',
        slug: 'tas-ransel',
        images: [],
      });
      (prisma.product.update as jest.Mock).mockResolvedValue({
        id: 'prod-100',
        shopeeUrl: 'https://shopee.co.id/new-link',
        tokopediaUrl: 'https://tokopedia.com/new-link',
        images: [],
      });

      const response = await PATCH(
        createFormDataRequest(
          {
            id: 'prod-100',
            shopeeUrl: 'https://shopee.co.id/new-link',
            tokopediaUrl: 'https://tokopedia.com/new-link',
          },
          'PATCH'
        )
      );

      expect(response.status).toBe(200);
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-100', storeId: 'store-1' },
          data: expect.objectContaining({
            shopeeUrl: 'https://shopee.co.id/new-link',
            tokopediaUrl: 'https://tokopedia.com/new-link',
          }),
        })
      );
    });
  });

  describe('Storefront Component: ProductMarketplaceLinks', () => {
    it('returns null when no marketplace URLs are provided', () => {
      const rendered = ProductMarketplaceLinks({});
      expect(rendered).toBeNull();
    });

    it('returns null when all provided marketplace URLs are whitespace or empty', () => {
      const rendered = ProductMarketplaceLinks({
        shopeeUrl: '   ',
        tokopediaUrl: '',
        tiktokShopUrl: null,
        blibliUrl: undefined,
      });
      expect(rendered).toBeNull();
    });

    it('renders a valid React element with configured marketplace buttons', () => {
      const element = ProductMarketplaceLinks({
        shopeeUrl: 'https://shopee.co.id/item-123',
        tokopediaUrl: 'https://tokopedia.com/item-123',
        tiktokShopUrl: 'https://shop.tiktok.com/item-123',
        blibliUrl: 'https://blibli.com/p/item-123',
        customMarketplaceName: 'Zalora',
        customMarketplaceUrl: 'https://zalora.co.id/item-123',
        productName: 'Sepatu Keren',
      });

      expect(element).not.toBeNull();
      expect(React.isValidElement(element)).toBe(true);

      // Verify the component tree structure
      const props = element?.props;
      expect(props.className).toContain('border-t');
    });
  });
});
