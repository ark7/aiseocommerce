'use client';

import React from 'react';

export interface ProductMarketplaceLinksProps {
  shopeeUrl?: string | null;
  tokopediaUrl?: string | null;
  tiktokShopUrl?: string | null;
  blibliUrl?: string | null;
  customMarketplaceName?: string | null;
  customMarketplaceUrl?: string | null;
  productName?: string;
  className?: string;
}

export default function ProductMarketplaceLinks({
  shopeeUrl,
  tokopediaUrl,
  tiktokShopUrl,
  blibliUrl,
  customMarketplaceName,
  customMarketplaceUrl,
  productName,
  className = '',
}: ProductMarketplaceLinksProps) {
  const links: Array<{
    id: string;
    name: string;
    url: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    icon: React.ReactNode;
    badgeText?: string;
  }> = [];

  if (shopeeUrl && shopeeUrl.trim()) {
    links.push({
      id: 'shopee',
      name: 'Shopee',
      url: shopeeUrl.trim(),
      bgClass: 'bg-[#EE4D2D] hover:bg-[#d73211] active:bg-[#c22b0e]',
      textClass: 'text-white',
      borderClass: 'border-transparent',
      badgeText: 'Official Store',
      icon: (
        <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
          <path d="M19.5 7.5h-2.25V6a5.25 5.25 0 00-10.5 0v1.5H4.5A1.5 1.5 0 003 9v11.25A2.25 2.25 0 005.25 22.5h13.5A2.25 2.25 0 0021 20.25V9a1.5 1.5 0 00-1.5-1.5zm-10.5-1.5a3.75 3.75 0 017.5 0v1.5h-7.5V6zm9.75 14.25a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V9h15v11.25z" />
          <path d="M12 11.25c-1.5 0-2.25.75-2.25 1.5 0 1.5 3 1.5 3 3 0 .75-.75 1.5-2.25 1.5-1.125 0-1.875-.5-2.25-1.125l-.75.75c.563.75 1.5 1.5 3 1.5 2.25 0 3-1.125 3-2.25 0-1.875-3-1.875-3-3.375 0-.375.375-.75 1.5-.75.75 0 1.5.375 1.875.75l.75-.75c-.563-.75-1.5-1.125-2.625-1.125z" />
        </svg>
      ),
    });
  }

  if (tokopediaUrl && tokopediaUrl.trim()) {
    links.push({
      id: 'tokopedia',
      name: 'Tokopedia',
      url: tokopediaUrl.trim(),
      bgClass: 'bg-[#03AC0E] hover:bg-[#028f0b] active:bg-[#027809]',
      textClass: 'text-white',
      borderClass: 'border-transparent',
      badgeText: 'Official Store',
      icon: (
        <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
          <path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm7 17H5V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h6v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z" />
        </svg>
      ),
    });
  }

  if (tiktokShopUrl && tiktokShopUrl.trim()) {
    links.push({
      id: 'tiktok',
      name: 'TikTok Shop',
      url: tiktokShopUrl.trim(),
      bgClass: 'bg-slate-950 hover:bg-slate-900 active:bg-black dark:bg-slate-800 dark:hover:bg-slate-700',
      textClass: 'text-white',
      borderClass: 'border-slate-800 dark:border-slate-700',
      badgeText: 'Official Shop',
      icon: (
        <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 00-1-.08A6.34 6.34 0 003 15.66a6.34 6.34 0 0010.82 4.47 6.27 6.27 0 001.95-4.52V8.06a8.28 8.28 0 005-1.57l-1.18-.8z" />
        </svg>
      ),
    });
  }

  if (blibliUrl && blibliUrl.trim()) {
    links.push({
      id: 'blibli',
      name: 'Blibli',
      url: blibliUrl.trim(),
      bgClass: 'bg-[#0095DA] hover:bg-[#007ebb] active:bg-[#006ca1]',
      textClass: 'text-white',
      borderClass: 'border-transparent',
      badgeText: 'Official Store',
      icon: (
        <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
          <path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5C3.9 6 3 6.9 3 8v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm0 10c-1.66 0-3-1.34-3-3H7c0 2.76 2.24 5 5 5s5-2.24 5-5h-2c0 1.66-1.34 3-3 3z" />
        </svg>
      ),
    });
  }

  if (customMarketplaceUrl && customMarketplaceUrl.trim()) {
    const customName = customMarketplaceName?.trim() || 'Marketplace';
    links.push({
      id: 'custom',
      name: customName,
      url: customMarketplaceUrl.trim(),
      bgClass: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 dark:bg-indigo-700 dark:hover:bg-indigo-600',
      textClass: 'text-white',
      borderClass: 'border-transparent',
      badgeText: 'Partner Resmi',
      icon: (
        <svg className="w-4 h-4 fill-none stroke-current stroke-2 shrink-0" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      ),
    });
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <div className={`mt-6 pt-5 border-t border-gray-200 dark:border-slate-800 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
          <span>🛍️</span>
          <span>Beli Lewat Marketplace Resmi</span>
        </h3>
        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Terjamin Asli
        </span>
      </div>

      <p className="text-xs text-gray-500 dark:text-slate-400 mb-3 leading-relaxed">
        Ingin menggunakan voucher diskon atau gratis ongkir marketplace Anda? Kunjungi produk ini di kanal resmi kami:
      </p>

      <div className={`grid gap-2.5 ${links.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`Beli ${productName || 'produk'} di ${link.name}`}
            className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs shadow-xs transition-all duration-200 transform hover:-translate-y-0.5 border ${link.bgClass} ${link.textClass} ${link.borderClass}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1 rounded-md bg-white/20 group-hover:bg-white/30 transition-colors">
                {link.icon}
              </span>
              <div className="min-w-0">
                <div className="font-semibold truncate">Beli di {link.name}</div>
                {link.badgeText && (
                  <div className="text-[10px] opacity-80 font-normal leading-tight">
                    {link.badgeText}
                  </div>
                )}
              </div>
            </div>
            <svg
              className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}

