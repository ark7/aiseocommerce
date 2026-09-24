'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface StoreHeaderProps {
  storeDomain: string;
  storeName?: string | null;
  storeLogo?: string | null;
  storeAddress?: string | null;
}

/**
 * Storefront header shared by every page under /[storeDomain].
 *
 * The cart badge needs localStorage, so this is a client component. When the
 * caller already has the store loaded it can pass the name/logo/address in;
 * otherwise the header fetches them itself.
 */
export default function StoreHeader({
  storeDomain,
  storeName,
  storeLogo,
  storeAddress,
}: StoreHeaderProps) {
  const [name, setName] = useState<string | null>(storeName ?? null);
  const [logo, setLogo] = useState<string | null>(storeLogo ?? null);
  const [address, setAddress] = useState<string | null>(storeAddress ?? null);
  const [cartItemCount, setCartItemCount] = useState(0);

  const updateCartCount = useCallback(() => {
    try {
      const stored = localStorage.getItem(`cart_${storeDomain}`);
      if (!stored) {
        setCartItemCount(0);
        return;
      }
      const items = JSON.parse(stored);
      setCartItemCount(
        items.reduce((sum: number, item: { quantity?: number }) => sum + (item.quantity || 1), 0)
      );
    } catch {
      setCartItemCount(0);
    }
  }, [storeDomain]);

  useEffect(() => {
    updateCartCount();
    // The storefront fires a synthetic 'storage' event after adding to cart.
    window.addEventListener('storage', updateCartCount);
    return () => window.removeEventListener('storage', updateCartCount);
  }, [updateCartCount]);

  useEffect(() => {
    if (storeName !== undefined || !storeDomain) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/stores/${storeDomain}`);
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;
        setName(data.store?.name ?? null);
        setLogo(data.store?.logo ?? null);
        setAddress(data.store?.address ?? null);
      } catch {
        // Header still renders without the store details.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storeDomain, storeName]);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href={`/${storeDomain}`} className="flex items-center space-x-2">
            {logo ? (
              <Image
                src={logo}
                alt={name || 'Logo toko'}
                width={40}
                height={40}
                className="w-10 h-10 rounded"
                unoptimized
              />
            ) : (
              <div className="w-10 h-10 bg-indigo-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-lg">{name?.[0] || 'T'}</span>
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{name || 'Toko Online'}</h1>
              {address && <p className="text-sm text-gray-500 truncate max-w-md">{address}</p>}
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            <Link href={`/${storeDomain}`} className="text-gray-600 hover:text-indigo-600">Beranda</Link>
            <Link href={`/${storeDomain}/products`} className="text-gray-600 hover:text-indigo-600">Produk</Link>
            <Link href={`/${storeDomain}/categories`} className="text-gray-600 hover:text-indigo-600">Kategori</Link>
            <Link href={`/${storeDomain}/contact`} className="text-gray-600 hover:text-indigo-600">Kontak</Link>
            <Link href={`/${storeDomain}/orders`} className="text-gray-600 hover:text-indigo-600">Pesanan Saya</Link>
          </nav>

          <div className="flex items-center space-x-4">
            <Link
              href={`/${storeDomain}/cart`}
              className="relative p-2 rounded-full hover:bg-gray-100"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
