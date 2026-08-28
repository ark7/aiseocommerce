interface SEOData {
  title: string;
  description: string;
  keywords: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

interface ProductData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  sellingPrice: number;
  category?: { name: string; slug: string } | null;
  images?: { url: string; altText?: string | null }[];
  store?: { name: string; domain: string };
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

function generateSEOFromProductData(product: ProductData): SEOData {
  const storeName = product.store?.name || '';
  const categoryName = product.category?.name || '';
  const price = formatCurrency(product.sellingPrice);

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

  return {
    title: truncate(title, 60),
    description: truncate(description, 160),
    keywords: truncate(keywords, 200),
    ogTitle: title,
    ogDescription: description,
    ogImage: product.images?.[0]?.url,
  };
}

async function generateSEOWithAI(product: ProductData): Promise<Partial<SEOData> | null> {
  try {
    const aiApiKey = process.env.AI_SEO_API_KEY;
    const aiApiUrl = process.env.AI_SEO_API_URL || 'https://api.openai.com/v1/chat/completions';
    if (!aiApiKey) return null;

    const prompt = `
      Buatkan SEO metadata yang optimal untuk produk e-commerce:
      Nama Produk: ${product.name}
      Deskripsi: ${product.description || 'Tidak ada deskripsi'}
      Kategori: ${product.category?.name || 'Tidak ada kategori'}
      Harga: ${formatCurrency(product.sellingPrice)}
      Nama Toko: ${product.store?.name || 'Toko'}
      
      Buatkan dalam format JSON:
      {
        "title": "...",
        "description": "...",
        "keywords": "..."
      }
      
      Gunakan bahasa Indonesia, fokus pada keyword untuk SEO.
    `;

    const response = await fetch(aiApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      }),
      next: { revalidate: 3600 },
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    try {
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      const jsonStr = content.substring(jsonStart, jsonEnd);
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

export async function generateProductSEO(product: ProductData): Promise<SEOData> {
  if (product.seoTitle && product.seoDescription && product.seoKeywords) {
    return {
      title: product.seoTitle,
      description: product.seoDescription,
      keywords: product.seoKeywords,
      ogTitle: product.seoTitle,
      ogDescription: product.seoDescription,
      ogImage: product.images?.[0]?.url,
    };
  }

  const baseData = generateSEOFromProductData(product);
  
  if (process.env.AI_SEO_API_KEY) {
    try {
      const aiData = await generateSEOWithAI(product);
      if (aiData) return { ...baseData, ...aiData };
    } catch {}
  }

  return baseData;
}

export function generateStoreSEO(store: { name: string; domain: string; defaultSeoTitle?: string | null; defaultSeoDescription?: string | null }): SEOData {
  const defaultTitle = store.defaultSeoTitle || `${store.name} - Toko Online Terpercaya`;
  const defaultDescription = store.defaultSeoDescription || 
    `Beli berbagai produk berkualitas di ${store.name}. Harga terbaik, pengiriman cepat.`;

  return {
    title: truncate(defaultTitle, 60),
    description: truncate(defaultDescription, 160),
    keywords: `${store.name}, toko online, belanja online, produk murah`,
    ogTitle: defaultTitle,
    ogDescription: defaultDescription,
  };
}

export function generateCategorySEO(categoryName: string, storeName: string, description?: string): SEOData {
  const title = `${categoryName} - ${storeName}`;
  const desc = description || `Temukan berbagai ${categoryName.toLowerCase()} berkualitas di ${storeName}.`;
  return {
    title: truncate(title, 60),
    description: truncate(desc, 160),
    keywords: `${categoryName}, ${storeName}, beli ${categoryName.toLowerCase()}`,
    ogTitle: title,
    ogDescription: desc,
  };
}

export function generateProductStructuredData(product: ProductData): string {
  const storeName = product.store?.name || '';
  const availability = product.store?.domain ? (product as any).stock > 0 ? 'InStock' : 'OutOfStock' : 'InStock';
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
  return JSON.stringify(structuredData);
}

export function generateBreadcrumbStructuredData(storeName: string, category?: string, productName?: string): string {
  const items: any[] = [
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
  return JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": items });
}

export default {
  generateProductSEO,
  generateStoreSEO,
  generateCategorySEO,
  generateProductStructuredData,
  generateBreadcrumbStructuredData,
};
