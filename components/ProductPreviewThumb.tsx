'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export interface ProductPreviewThumbProps {
  imageUrl?: string | null;
  alt: string;
  categoryName?: string | null;
  primaryColor?: string;
}

function getCategoryVisualHint(categoryName?: string | null, alt?: string): { icon: string; label: string } {
  const haystack = `${categoryName || ''} ${alt || ''}`.toLowerCase();
  if (/sepatu|sneaker|sandal|footwear|lari/.test(haystack)) {
    return { icon: '👟', label: categoryName || 'Footwear' };
  }
  if (/batik|kaos|baju|kemeja|gamis|chino|fashion|pakaian/.test(haystack)) {
    return { icon: '👕', label: categoryName || 'Fashion' };
  }
  if (/elektronik|gadget|audio|laptop|hp|smart|tws/.test(haystack)) {
    return { icon: '🎧', label: categoryName || 'Elektronik' };
  }
  if (/kopi|teh|madu|kuliner|sambal|makan|minum/.test(haystack)) {
    return { icon: '☕', label: categoryName || 'Kuliner' };
  }
  if (/cetak|id card|pvc|kartu|merchandise|print/.test(haystack)) {
    return { icon: '🪪', label: categoryName || 'Percetakan' };
  }
  if (/dapur|rumah|piring|wajan|vacuum|blender/.test(haystack)) {
    return { icon: '🏡', label: categoryName || 'Rumah Tangga' };
  }
  return { icon: '🛍️', label: categoryName || 'Produk Pilihan' };
}

/**
 * Renders the product preview thumbnail in Featured Products.
 * Uses `unoptimized` so static/CDN images bypass `/_next/image` bottlenecks in Alpine Docker,
 * and falls back cleanly to a styled visual preview card when no uploaded photo exists or fails to load.
 */
export default function ProductPreviewThumb({
  imageUrl,
  alt,
  categoryName,
  primaryColor = '#4F46E5',
}: ProductPreviewThumbProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  if (imageUrl && !imgError) {
    return (
      <Image
        src={imageUrl}
        alt={alt}
        fill
        unoptimized
        sizes="(max-width: 768px) 50vw, 25vw"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        onError={() => setImgError(true)}
      />
    );
  }

  const visual = getCategoryVisualHint(categoryName, alt);

  return (
    <div
      data-testid="product-visual-fallback"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}14 0%, #f8fafc 55%, ${primaryColor}20 100%)`,
      }}
      className="relative flex h-full w-full flex-col items-center justify-center p-4 text-center select-none"
    >
      <div
        aria-hidden="true"
        style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xs border border-white/80 mb-2.5 transition-transform duration-300 group-hover:scale-105"
      >
        {visual.icon}
      </div>
      <span
        style={{ color: primaryColor, borderColor: `${primaryColor}30` }}
        className="inline-flex items-center rounded-full border bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide"
      >
        {visual.label}
      </span>
      <p className="mt-1.5 text-[11px] font-medium text-gray-600 line-clamp-2 max-w-[160px]">
        {alt}
      </p>
    </div>
  );
}
