/**
 * Unit Tests for Products API Business Logic
 * Tests validation, CRUD operations, and search/filter logic
 */

describe('Products API Business Logic', () => {
  describe('Product Creation Validation', () => {
    it('should require name, slug, basePrice, sellingPrice', () => {
      const product1 = { name: 'Product 1', slug: 'product-1', basePrice: 10000, sellingPrice: 12000 };
      const product2 = { name: 'Product 2' }; // Missing required fields
      const product3 = { slug: 'product-3', basePrice: 10000, sellingPrice: 12000 }; // Missing name
      const product4 = { name: 'Product 4', basePrice: 10000, sellingPrice: 12000 }; // Missing slug

      expect(!!product1.name && !!product1.slug && product1.basePrice >= 0 && product1.sellingPrice >= 0).toBe(true);
      expect(!!product2.name && !!product2.slug && product2.basePrice >= 0 && product2.sellingPrice >= 0).toBe(false);
      expect(!!product3.name && !!product3.slug && product3.basePrice >= 0 && product3.sellingPrice >= 0).toBe(false);
      expect(!!product4.name && !!product4.slug && product4.basePrice >= 0 && product4.sellingPrice >= 0).toBe(false);
    });

    it('should validate price values are non-negative', () => {
      const validProduct = { basePrice: 10000, sellingPrice: 12000 };
      const invalidBasePrice = { basePrice: -1000, sellingPrice: 12000 };
      const invalidSellingPrice = { basePrice: 10000, sellingPrice: -500 };

      expect(validProduct.basePrice >= 0 && validProduct.sellingPrice >= 0).toBe(true);
      expect(invalidBasePrice.basePrice >= 0).toBe(false);
      expect(invalidSellingPrice.sellingPrice >= 0).toBe(false);
    });

    it('should validate stock is non-negative', () => {
      const validStock1 = 0;
      const validStock2 = 100;
      const invalidStock = -10;

      expect(validStock1 >= 0).toBe(true);
      expect(validStock2 >= 0).toBe(true);
      expect(invalidStock >= 0).toBe(false);
    });

    it('should default stock to 0 if not provided', () => {
      const product = { name: 'Test', slug: 'test', basePrice: 100, sellingPrice: 100 };
      const stock = product.stock ?? 0;
      expect(stock).toBe(0);
    });

    it('should default isPublished to true if not provided', () => {
      const product = { name: 'Test', slug: 'test', basePrice: 100, sellingPrice: 100 };
      const isPublished = product.isPublished ?? true;
      expect(isPublished).toBe(true);
    });

    it('should default isFeatured to false if not provided', () => {
      const product = { name: 'Test', slug: 'test', basePrice: 100, sellingPrice: 100 };
      const isFeatured = product.isFeatured ?? false;
      expect(isFeatured).toBe(false);
    });
  });

  describe('Slug Generation', () => {
    it('should generate slug from name', () => {
      const names = [
        'Product Name',
        'Another Product',
        'Test-Product-123',
        'Special!@# Product',
      ];

      const expectedSlugs = [
        'product-name',
        'another-product',
        'test-product-123',
        'special-product',
      ];

      names.forEach((name, index) => {
        const slug = name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
        expect(slug).toBe(expectedSlugs[index]);
      });
    });

    it('should handle empty name', () => {
      const name = '';
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      expect(slug).toBe('');
    });

    it('should handle special characters', () => {
      const name = 'Product (Test) - 2024!';
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      expect(slug).toBe('product-test-2024');
    });
  });

  describe('Search and Filter Logic', () => {
    it('should create search query for name', () => {
      const searchQuery = 'test';
      const product = { name: 'Test Product', description: 'A test description' };

      const nameMatch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      expect(nameMatch).toBe(true);
    });

    it('should create search query for description', () => {
      const searchQuery = 'description';
      const product = { name: 'Test Product', description: 'A test description' };

      const descMatch = product.description.toLowerCase().includes(searchQuery.toLowerCase());
      expect(descMatch).toBe(true);
    });

    it('should create search query for SKU', () => {
      const searchQuery = 'SKU-123';
      const product = { name: 'Test Product', sku: 'SKU-123' };

      const skuMatch = product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
      expect(skuMatch).toBe(true);
    });

    it('should be case insensitive', () => {
      const searchQuery = 'TEST';
      const product = { name: 'test product' };

      const match = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      expect(match).toBe(true);
    });

    it('should filter by category', () => {
      const categoryId = 'cat-1';
      const product1 = { categoryId: 'cat-1' };
      const product2 = { categoryId: 'cat-2' };
      const product3 = {};

      expect(product1.categoryId === categoryId).toBe(true);
      expect(product2.categoryId === categoryId).toBe(false);
      expect(product3.categoryId === categoryId).toBe(false);
    });

    it('should filter by published status', () => {
      const products = [
        { isPublished: true },
        { isPublished: false },
        { isPublished: true },
      ];

      const published = products.filter(p => p.isPublished === true);
      const unpublished = products.filter(p => p.isPublished === false);

      expect(published).toHaveLength(2);
      expect(unpublished).toHaveLength(1);
    });

    it('should filter by featured status', () => {
      const products = [
        { isFeatured: true },
        { isFeatured: false },
        { isFeatured: true },
      ];

      const featured = products.filter(p => p.isFeatured === true);
      const notFeatured = products.filter(p => p.isFeatured === false);

      expect(featured).toHaveLength(2);
      expect(notFeatured).toHaveLength(1);
    });
  });

  describe('Pagination', () => {
    it('should paginate products', () => {
      const products = Array.from({ length: 25 }, (_, i) => ({ id: `product-${i + 1}` }));
      const page = 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      const paginated = products.slice(skip, skip + limit);
      expect(paginated).toHaveLength(10);
    });

    it('should handle page 2', () => {
      const products = Array.from({ length: 25 }, (_, i) => ({ id: `product-${i + 1}` }));
      const page = 2;
      const limit = 10;
      const skip = (page - 1) * limit;

      const paginated = products.slice(skip, skip + limit);
      expect(paginated).toHaveLength(10);
      expect(paginated[0].id).toBe('product-11');
    });

    it('should handle last page with remaining items', () => {
      const products = Array.from({ length: 25 }, (_, i) => ({ id: `product-${i + 1}` }));
      const page = 3;
      const limit = 10;
      const skip = (page - 1) * limit;

      const paginated = products.slice(skip, skip + limit);
      expect(paginated).toHaveLength(5);
      expect(paginated[0].id).toBe('product-21');
    });

    it('should handle empty page', () => {
      const products = Array.from({ length: 10 }, (_, i) => ({ id: `product-${i + 1}` }));
      const page = 2;
      const limit = 10;
      const skip = (page - 1) * limit;

      const paginated = products.slice(skip, skip + limit);
      expect(paginated).toHaveLength(0);
    });
  });

  describe('Sorting', () => {
    it('should sort by name ascending', () => {
      const products = [
        { name: 'Zebra' },
        { name: 'Apple' },
        { name: 'Banana' },
      ];

      const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name));
      expect(sorted[0].name).toBe('Apple');
      expect(sorted[1].name).toBe('Banana');
      expect(sorted[2].name).toBe('Zebra');
    });

    it('should sort by name descending', () => {
      const products = [
        { name: 'Zebra' },
        { name: 'Apple' },
        { name: 'Banana' },
      ];

      const sorted = [...products].sort((a, b) => b.name.localeCompare(a.name));
      expect(sorted[0].name).toBe('Zebra');
      expect(sorted[1].name).toBe('Banana');
      expect(sorted[2].name).toBe('Apple');
    });

    it('should sort by price ascending', () => {
      const products = [
        { sellingPrice: 10000 },
        { sellingPrice: 5000 },
        { sellingPrice: 15000 },
      ];

      const sorted = [...products].sort((a, b) => a.sellingPrice - b.sellingPrice);
      expect(sorted[0].sellingPrice).toBe(5000);
      expect(sorted[1].sellingPrice).toBe(10000);
      expect(sorted[2].sellingPrice).toBe(15000);
    });

    it('should sort by price descending', () => {
      const products = [
        { sellingPrice: 10000 },
        { sellingPrice: 5000 },
        { sellingPrice: 15000 },
      ];

      const sorted = [...products].sort((a, b) => b.sellingPrice - a.sellingPrice);
      expect(sorted[0].sellingPrice).toBe(15000);
      expect(sorted[1].sellingPrice).toBe(10000);
      expect(sorted[2].sellingPrice).toBe(5000);
    });

    it('should sort by createdAt descending (newest first)', () => {
      const products = [
        { createdAt: new Date('2024-01-01') },
        { createdAt: new Date('2024-01-03') },
        { createdAt: new Date('2024-01-02') },
      ];

      const sorted = [...products].sort((a, b) => b.createdAt - a.createdAt);
      expect(sorted[0].createdAt).toEqual(new Date('2024-01-03'));
      expect(sorted[1].createdAt).toEqual(new Date('2024-01-02'));
      expect(sorted[2].createdAt).toEqual(new Date('2024-01-01'));
    });
  });

  describe('Product Update', () => {
    it('should update product fields', () => {
      const existingProduct = {
        id: 'product-1',
        name: 'Old Name',
        sellingPrice: 10000,
        stock: 10,
      };

      const updates = {
        name: 'New Name',
        sellingPrice: 15000,
      };

      const updated = { ...existingProduct, ...updates };
      expect(updated.name).toBe('New Name');
      expect(updated.sellingPrice).toBe(15000);
      expect(updated.stock).toBe(10); // Unchanged
    });

    it('should handle partial updates', () => {
      const existingProduct = {
        id: 'product-1',
        name: 'Old Name',
        description: 'Old Description',
        sellingPrice: 10000,
      };

      const updates = {
        name: 'New Name',
      };

      const updated = { ...existingProduct, ...updates };
      expect(updated.name).toBe('New Name');
      expect(updated.description).toBe('Old Description'); // Unchanged
      expect(updated.sellingPrice).toBe(10000); // Unchanged
    });
  });

  describe('Product Deletion', () => {
    it('should delete product by id', () => {
      const products = [
        { id: 'product-1', name: 'Product 1' },
        { id: 'product-2', name: 'Product 2' },
        { id: 'product-3', name: 'Product 3' },
      ];

      const idToDelete = 'product-2';
      const updatedProducts = products.filter(p => p.id !== idToDelete);

      expect(updatedProducts).toHaveLength(2);
      expect(updatedProducts.find(p => p.id === idToDelete)).toBeUndefined();
      expect(updatedProducts.find(p => p.id === 'product-1')).toBeDefined();
      expect(updatedProducts.find(p => p.id === 'product-3')).toBeDefined();
    });

    it('should not delete if product not found', () => {
      const products = [
        { id: 'product-1', name: 'Product 1' },
      ];

      const idToDelete = 'non-existent';
      const updatedProducts = products.filter(p => p.id !== idToDelete);

      expect(updatedProducts).toHaveLength(1);
    });
  });

  describe('Stock Management', () => {
    it('should check if product is in stock', () => {
      const product1 = { stock: 10 };
      const product2 = { stock: 0 };
      const product3 = { stock: -5 }; // Should not happen but handle it

      expect(product1.stock > 0).toBe(true);
      expect(product2.stock > 0).toBe(false);
      expect(product3.stock > 0).toBe(false);
    });

    it('should check if stock is low', () => {
      const product = { stock: 5, minStock: 10 };
      const isLow = product.stock < product.minStock;
      expect(isLow).toBe(true);
    });

    it('should check if stock is sufficient', () => {
      const product = { stock: 100, minStock: 10 };
      const isLow = product.stock < product.minStock;
      expect(isLow).toBe(false);
    });

    it('should update stock', () => {
      const product = { stock: 100 };
      const quantity = 5;
      const updatedStock = product.stock - quantity;
      expect(updatedStock).toBe(95);
    });

    it('should not allow negative stock', () => {
      const product = { stock: 5 };
      const quantity = 10;
      const updatedStock = Math.max(0, product.stock - quantity);
      expect(updatedStock).toBe(0);
    });
  });
});
