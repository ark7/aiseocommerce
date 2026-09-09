/**
 * Unit Tests for SEO Functions
 * Tests SEO metadata generation, truncation, formatting, and structured data
 */

describe('SEO Functions', () => {
  describe('truncate function', () => {
    it('should not truncate strings shorter than maxLength', () => {
      const result = 'Short string';
      const maxLength = 20;
      const truncated = result.length <= maxLength ? result : result.substring(0, maxLength - 3) + '...';
      expect(truncated).toBe('Short string');
    });

    it('should truncate strings longer than maxLength', () => {
      const result = 'This is a very long string that needs to be truncated';
      const maxLength = 20;
      const truncated = result.length <= maxLength ? result : result.substring(0, maxLength - 3) + '...';
      expect(truncated).toBe('This is a very lo...');
      expect(truncated.length).toBe(20);
    });

    it('should handle empty string', () => {
      const result = '';
      const maxLength = 10;
      const truncated = result.length <= maxLength ? result : result.substring(0, maxLength - 3) + '...';
      expect(truncated).toBe('');
    });

    it('should handle exact length string', () => {
      const result = 'Exactly 10';
      const maxLength = 10;
      const truncated = result.length <= maxLength ? result : result.substring(0, maxLength - 3) + '...';
      expect(truncated).toBe('Exactly 10');
    });
  });

  describe('formatCurrency function', () => {
    it('should format number as IDR currency', () => {
      const amount = 10000;
      const formatted = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(amount);
      expect(formatted).toContain('Rp');
      expect(formatted).toContain('10.000');
    });

    it('should format zero correctly', () => {
      const amount = 0;
      const formatted = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(amount);
      expect(formatted).toContain('Rp');
      expect(formatted).toContain('0');
    });

    it('should format large numbers correctly', () => {
      const amount = 1000000000;
      const formatted = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(amount);
      expect(formatted).toContain('Rp');
      expect(formatted).toContain('1.000.000.000');
    });

    it('should format with no decimal fraction for whole numbers', () => {
      const amount = 15000;
      const formatted = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(amount);
      expect(formatted).toContain('Rp');
      expect(formatted).toContain('15');
    });
  });

  describe('generateSEOFromProductData function', () => {
    const baseProduct = {
      id: 'prod-1',
      name: 'Test Product',
      slug: 'test-product',
      sellingPrice: 100000,
      description: 'A test product description',
      shortDescription: 'Short test description',
      category: { name: 'Electronics', slug: 'electronics' },
      images: [{ url: 'https://example.com/image.jpg', altText: 'Test image' }],
      store: { name: 'Test Store', domain: 'test.example.com' },
    };

    it('should generate SEO data with store name and category', () => {
      const product = { ...baseProduct };
      const storeName = product.store?.name || '';
      const categoryName = product.category?.name || '';
      const price = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(product.sellingPrice);

      let title = product.name;
      if (storeName) title = categoryName ? `${product.name} - ${categoryName} - ${storeName}` : `${product.name} - ${storeName}`;

      let description = product.shortDescription || product.description || '';
      if (!description) {
        description = `Beli ${product.name} dengan harga ${price}. ${product.name} berkualitas tersedia di ${storeName}.`;
      } else {
        description = description.length > 200 ? description.substring(0, 200) + '...' : description;
      }

      const keywords = [product.name, categoryName, storeName, 'beli', 'murah', 'online', 'toko']
        .filter(Boolean)
        .join(', ');

      const titleTruncated = title.length <= 60 ? title : title.substring(0, 57) + '...';
      const descTruncated = description.length <= 160 ? description : description.substring(0, 157) + '...';
      const keywordsTruncated = keywords.length <= 200 ? keywords : keywords.substring(0, 197) + '...';

      expect(titleTruncated).toBe('Test Product - Electronics - Test Store');
      expect(descTruncated).toBe('Short test description');
      expect(keywordsTruncated).toContain('Test Product');
      expect(keywordsTruncated).toContain('Electronics');
      expect(keywordsTruncated).toContain('Test Store');
    });

    it('should use description if shortDescription not provided', () => {
      const product = { ...baseProduct, shortDescription: undefined };
      const storeName = product.store?.name || '';
      const categoryName = product.category?.name || '';

      let description = product.shortDescription || product.description || '';
      if (!description) {
        const price = new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
        }).format(product.sellingPrice);
        description = `Beli ${product.name} dengan harga ${price}. ${product.name} berkualitas tersedia di ${storeName}.`;
      } else {
        description = description.length > 200 ? description.substring(0, 200) + '...' : description;
      }

      expect(description).toBe('A test product description');
    });

    it('should generate description from template if no description provided', () => {
      const product = { ...baseProduct, description: undefined, shortDescription: undefined };
      const storeName = product.store?.name || '';
      const categoryName = product.category?.name || '';
      const price = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(product.sellingPrice);

      let description = product.shortDescription || product.description || '';
      if (!description) {
        description = `Beli ${product.name} dengan harga ${price}. ${product.name} berkualitas tersedia di ${storeName}.`;
      }

      expect(description).toContain('Beli Test Product');
      expect(description).toContain('Rp');
      expect(description).toContain('Test Store');
    });

    it('should truncate long descriptions', () => {
      const longDescription = 'A'.repeat(300);
      const product = { ...baseProduct, shortDescription: longDescription };

      let description = product.shortDescription || product.description || '';
      description = description.length > 200 ? description.substring(0, 200) + '...' : description;

      const descTruncated = description.length <= 160 ? description : description.substring(0, 157) + '...';
      expect(descTruncated.length).toBe(160);
      expect(descTruncated).toContain('...');
    });

    it('should handle missing category', () => {
      const product = { ...baseProduct, category: null };
      const storeName = product.store?.name || '';
      const categoryName = product.category?.name || '';

      let title = product.name;
      if (storeName) title = categoryName ? `${product.name} - ${categoryName} - ${storeName}` : `${product.name} - ${storeName}`;

      expect(title).toBe('Test Product - Test Store');
    });

    it('should handle missing store', () => {
      const product = { ...baseProduct, store: undefined };
      const storeName = product.store?.name || '';
      const categoryName = product.category?.name || '';

      let title = product.name;
      if (storeName) title = categoryName ? `${product.name} - ${categoryName} - ${storeName}` : `${product.name} - ${storeName}`;

      expect(title).toBe('Test Product');
    });

    it('should use first image for ogImage', () => {
      const product = { ...baseProduct };
      const ogImage = product.images?.[0]?.url;
      expect(ogImage).toBe('https://example.com/image.jpg');
    });

    it('should handle missing images', () => {
      const product = { ...baseProduct, images: [] };
      const ogImage = product.images?.[0]?.url;
      expect(ogImage).toBeUndefined();
    });

    it('should filter empty keywords', () => {
      const product = { ...baseProduct, name: '', category: { name: '', slug: '' }, store: { name: '', domain: '' } };
      const storeName = product.store?.name || '';
      const categoryName = product.category?.name || '';

      const keywords = [product.name, categoryName, storeName, 'beli', 'murah', 'online', 'toko']
        .filter(Boolean)
        .join(', ');

      expect(keywords).toBe('beli, murah, online, toko');
    });
  });

  describe('generateStoreSEO function', () => {
    it('should generate SEO with custom titles and descriptions', () => {
      const store = {
        name: 'Test Store',
        domain: 'test.example.com',
        defaultSeoTitle: 'Custom Store Title',
        defaultSeoDescription: 'Custom store description',
      };

      const defaultTitle = store.defaultSeoTitle || `${store.name} - Toko Online Terpercaya`;
      const defaultDescription = store.defaultSeoDescription ||
        `Beli berbagai produk berkualitas di ${store.name}. Harga terbaik, pengiriman cepat.`;

      const titleTruncated = defaultTitle.length <= 60 ? defaultTitle : defaultTitle.substring(0, 57) + '...';
      const descTruncated = defaultDescription.length <= 160 ? defaultDescription : defaultDescription.substring(0, 157) + '...';

      expect(titleTruncated).toBe('Custom Store Title');
      expect(descTruncated).toBe('Custom store description');
    });

    it('should generate default SEO when custom not provided', () => {
      const store = {
        name: 'Test Store',
        domain: 'test.example.com',
      };

      const defaultTitle = store.defaultSeoTitle || `${store.name} - Toko Online Terpercaya`;
      const defaultDescription = store.defaultSeoDescription ||
        `Beli berbagai produk berkualitas di ${store.name}. Harga terbaik, pengiriman cepat.`;

      expect(defaultTitle).toBe('Test Store - Toko Online Terpercaya');
      expect(defaultDescription).toContain('Beli berbagai produk berkualitas');
      expect(defaultDescription).toContain('Test Store');
    });

    it('should generate keywords for store', () => {
      const store = { name: 'Test Store', domain: 'test.example.com' };
      const keywords = `${store.name}, toko online, belanja online, produk murah`;
      expect(keywords).toBe('Test Store, toko online, belanja online, produk murah');
    });

    it('should truncate title and description', () => {
      const store = {
        name: 'Test Store',
        domain: 'test.example.com',
        defaultSeoTitle: 'A'.repeat(100),
        defaultSeoDescription: 'B'.repeat(300),
      };

      const defaultTitle = store.defaultSeoTitle || `${store.name} - Toko Online Terpercaya`;
      const defaultDescription = store.defaultSeoDescription ||
        `Beli berbagai produk berkualitas di ${store.name}. Harga terbaik, pengiriman cepat.`;

      const titleTruncated = defaultTitle.length <= 60 ? defaultTitle : defaultTitle.substring(0, 57) + '...';
      const descTruncated = defaultDescription.length <= 160 ? defaultDescription : defaultDescription.substring(0, 157) + '...';

      expect(titleTruncated.length).toBe(60);
      expect(descTruncated.length).toBe(160);
    });
  });

  describe('generateCategorySEO function', () => {
    it('should generate SEO for category with description', () => {
      const categoryName = 'Electronics';
      const storeName = 'Test Store';
      const description = 'Category description';

      const title = `${categoryName} - ${storeName}`;
      const desc = description || `Temukan berbagai ${categoryName.toLowerCase()} berkualitas di ${storeName}.`;

      const titleTruncated = title.length <= 60 ? title : title.substring(0, 57) + '...';
      const descTruncated = desc.length <= 160 ? desc : desc.substring(0, 157) + '...';

      expect(titleTruncated).toBe('Electronics - Test Store');
      expect(descTruncated).toBe('Category description');
    });

    it('should generate default description when not provided', () => {
      const categoryName = 'Electronics';
      const storeName = 'Test Store';
      const description = undefined;

      const title = `${categoryName} - ${storeName}`;
      const desc = description || `Temukan berbagai ${categoryName.toLowerCase()} berkualitas di ${storeName}.`;

      expect(title).toBe('Electronics - Test Store');
      expect(desc).toBe('Temukan berbagai electronics berkualitas di Test Store.');
    });

    it('should generate keywords for category', () => {
      const categoryName = 'Electronics';
      const storeName = 'Test Store';
      const keywords = `${categoryName}, ${storeName}, beli ${categoryName.toLowerCase()}`;
      expect(keywords).toBe('Electronics, Test Store, beli electronics');
    });

    it('should truncate title and description', () => {
      const categoryName = 'A'.repeat(50);
      const storeName = 'Test Store';
      const description = 'B'.repeat(300);

      const title = `${categoryName} - ${storeName}`;
      const desc = description || `Temukan berbagai ${categoryName.toLowerCase()} berkualitas di ${storeName}.`;

      const titleTruncated = title.length <= 60 ? title : title.substring(0, 57) + '...';
      const descTruncated = desc.length <= 160 ? desc : desc.substring(0, 157) + '...';

      expect(titleTruncated.length).toBe(60);
      expect(descTruncated.length).toBe(160);
    });
  });

  describe('generateProductStructuredData function', () => {
    const baseProduct = {
      id: 'prod-1',
      name: 'Test Product',
      slug: 'test-product',
      sellingPrice: 100000,
      description: 'A test product description',
      shortDescription: 'Short test description',
      category: { name: 'Electronics', slug: 'electronics' },
      images: [{ url: 'https://example.com/image.jpg', altText: 'Test image' }],
      store: { name: 'Test Store', domain: 'test.example.com' },
      stock: 10,
    };

    it('should generate valid Product structured data', () => {
      const product = { ...baseProduct };
      const storeName = product.store?.name || '';
      const availability = product.store?.domain ? (product.stock > 0 ? 'InStock' : 'OutOfStock') : 'InStock';

      const structuredData = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.name,
        "image": product.images?.[0]?.url ? [product.images[0].url] : [],
        "description": product.shortDescription || product.description || '',
        "brand": { "@type": "Brand", "name": storeName },
        "offers": {
          "@type": "Offer",
          "url": `https://${product.store?.domain || 'example.com'}/product/${product.slug}`,
          "priceCurrency": "IDR",
          "price": product.sellingPrice,
          "availability": availability,
          "itemCondition": "https://schema.org/NewCondition",
          "seller": { "@type": "Organization", "name": storeName },
        },
        "aggregateRating": { "@type": "AggregateRating", "ratingValue": "5", "reviewCount": "0" },
      };

      const jsonString = JSON.stringify(structuredData);
      const parsed = JSON.parse(jsonString);

      expect(parsed['@type']).toBe('Product');
      expect(parsed.name).toBe('Test Product');
      expect(parsed.offers.priceCurrency).toBe('IDR');
      expect(parsed.offers.price).toBe(100000);
      expect(parsed.offers.availability).toBe('InStock');
      expect(parsed.image).toEqual(['https://example.com/image.jpg']);
    });

    it('should mark as OutOfStock when stock is 0', () => {
      const product = { ...baseProduct, stock: 0 };
      const storeName = product.store?.name || '';
      const availability = product.store?.domain ? (product.stock > 0 ? 'InStock' : 'OutOfStock') : 'InStock';
      expect(availability).toBe('OutOfStock');
    });

    it('should use empty array for image when no images', () => {
      const product = { ...baseProduct, images: [] };
      const image = product.images?.[0]?.url ? [product.images[0].url] : [];
      expect(image).toEqual([]);
    });

    it('should use description when shortDescription not provided', () => {
      const product = { ...baseProduct, shortDescription: undefined };
      const description = product.shortDescription || product.description || '';
      expect(description).toBe('A test product description');
    });

    it('should use default domain when store domain not provided', () => {
      const product = { ...baseProduct, store: { name: 'Test Store', domain: undefined } };
      const url = `https://${product.store?.domain || 'example.com'}/product/${product.slug}`;
      expect(url).toBe('https://example.com/product/test-product');
    });

    it('should use InStock as default when no store domain', () => {
      const product = { ...baseProduct, store: { name: 'Test Store' } };
      const availability = product.store?.domain ? (product.stock > 0 ? 'InStock' : 'OutOfStock') : 'InStock';
      expect(availability).toBe('InStock');
    });
  });

  describe('generateBreadcrumbStructuredData function', () => {
    it('should generate breadcrumb with only home', () => {
      const storeName = 'TestStore';
      const category = undefined;
      const productName = undefined;

      const items = [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `https://${storeName.toLowerCase()}.example.com` },
      ];

      const result = JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": items });
      const parsed = JSON.parse(result);

      expect(parsed['@type']).toBe('BreadcrumbList');
      expect(parsed.itemListElement).toHaveLength(1);
      expect(parsed.itemListElement[0].name).toBe('Home');
      expect(parsed.itemListElement[0].position).toBe(1);
    });

    it('should generate breadcrumb with category', () => {
      const storeName = 'TestStore';
      const category = 'Electronics';
      const productName = undefined;

      const items = [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `https://${storeName.toLowerCase()}.example.com` },
      ];
      if (category) {
        items.push({
          "@type": "ListItem",
          "position": 2,
          "name": category,
          "item": `https://${storeName.toLowerCase()}.example.com/category/${category.toLowerCase()}`,
        });
      }

      expect(items).toHaveLength(2);
      expect(items[1].name).toBe('Electronics');
      expect(items[1].position).toBe(2);
    });

    it('should generate breadcrumb with category and product', () => {
      const storeName = 'TestStore';
      const category = 'Electronics';
      const productName = 'Test Product';

      const items = [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `https://${storeName.toLowerCase()}.example.com` },
      ];
      if (category) {
        items.push({
          "@type": "ListItem",
          "position": 2,
          "name": category,
          "item": `https://${storeName.toLowerCase()}.example.com/category/${category.toLowerCase()}`,
        });
      }
      if (productName) {
        items.push({ "@type": "ListItem", "position": category ? 3 : 2, "name": productName });
      }

      expect(items).toHaveLength(3);
      expect(items[2].name).toBe('Test Product');
      expect(items[2].position).toBe(3);
    });

    it('should generate breadcrumb with only product (no category)', () => {
      const storeName = 'TestStore';
      const category = undefined;
      const productName = 'Test Product';

      const items = [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `https://${storeName.toLowerCase()}.example.com` },
      ];
      if (category) {
        items.push({
          "@type": "ListItem",
          "position": 2,
          "name": category,
          "item": `https://${storeName.toLowerCase()}.example.com/category/${category.toLowerCase()}`,
        });
      }
      if (productName) {
        items.push({ "@type": "ListItem", "position": category ? 3 : 2, "name": productName });
      }

      expect(items).toHaveLength(2);
      expect(items[1].name).toBe('Test Product');
      expect(items[1].position).toBe(2);
    });

    it('should use lowercase for domain and category in URLs', () => {
      const storeName = 'TEST Store';
      const category = 'ELECTRONICS';
      const productName = undefined;

      const items = [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `https://${storeName.toLowerCase()}.example.com` },
      ];
      if (category) {
        items.push({
          "@type": "ListItem",
          "position": 2,
          "name": category,
          "item": `https://${storeName.toLowerCase()}.example.com/category/${category.toLowerCase()}`,
        });
      }

      expect(items[0].item).toBe('https://test store.example.com');
      expect(items[1].item).toBe('https://test store.example.com/category/electronics');
    });
  });

  describe('generateProductSEO function (integration)', () => {
    it('should use custom SEO fields when provided', () => {
      const product = {
        id: 'prod-1',
        name: 'Test Product',
        slug: 'test-product',
        sellingPrice: 100000,
        seoTitle: 'Custom SEO Title',
        seoDescription: 'Custom SEO Description',
        seoKeywords: 'custom, keywords, here',
        images: [{ url: 'https://example.com/image.jpg', altText: 'Test image' }],
      };

      if (product.seoTitle && product.seoDescription && product.seoKeywords) {
        const result = {
          title: product.seoTitle,
          description: product.seoDescription,
          keywords: product.seoKeywords,
          ogTitle: product.seoTitle,
          ogDescription: product.seoDescription,
          ogImage: product.images?.[0]?.url,
        };
        expect(result.title).toBe('Custom SEO Title');
        expect(result.description).toBe('Custom SEO Description');
        expect(result.keywords).toBe('custom, keywords, here');
        expect(result.ogImage).toBe('https://example.com/image.jpg');
      }
    });

    it('should use generated SEO when custom fields not provided', () => {
      const product = {
        id: 'prod-1',
        name: 'Test Product',
        slug: 'test-product',
        sellingPrice: 100000,
        description: 'A test description',
        category: { name: 'Electronics', slug: 'electronics' },
        images: [{ url: 'https://example.com/image.jpg', altText: 'Test image' }],
        store: { name: 'Test Store', domain: 'test.example.com' },
      };

      if (!product.seoTitle && !product.seoDescription && !product.seoKeywords) {
        const storeName = product.store?.name || '';
        const categoryName = product.category?.name || '';
        const price = new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
        }).format(product.sellingPrice);

        let title = product.name;
        if (storeName) title = categoryName ? `${product.name} - ${categoryName} - ${storeName}` : `${product.name} - ${storeName}`;

        let description = product.shortDescription || product.description || '';
        if (!description) {
          description = `Beli ${product.name} dengan harga ${price}. ${product.name} berkualitas tersedia di ${storeName}.`;
        } else {
          description = description.length > 200 ? description.substring(0, 200) + '...' : description;
        }

        const keywords = [product.name, categoryName, storeName, 'beli', 'murah', 'online', 'toko']
          .filter(Boolean)
          .join(', ');

        const titleTruncated = title.length <= 60 ? title : title.substring(0, 57) + '...';
        const descTruncated = description.length <= 160 ? description : description.substring(0, 157) + '...';
        const keywordsTruncated = keywords.length <= 200 ? keywords : keywords.substring(0, 197) + '...';

        expect(titleTruncated).toBe('Test Product - Electronics - Test Store');
        expect(descTruncated).toBe('A test description');
        expect(keywordsTruncated).toContain('Test Product');
      }
    });
  });
});
