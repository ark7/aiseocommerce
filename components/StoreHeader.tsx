'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getCartCount, CART_UPDATED_EVENT } from '@/lib/cart';

interface StoreHeaderProps {
  storeDomain?: string;
  storeName?: string | null;
  storeLogo?: string | null;
  storeAddress?: string | null;
}

/**
 * Storefront header shared by every page under /[storeDomain].
 *
 * Displays live cart counter badge with instant real-time synchronization
 * across AddToCart, quantity updates, and checkout actions.
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
  const [badgeAnimate, setBadgeAnimate] = useState(false);
  const prevCountRef = useRef(0);
  const [user, setUser] = useState<{ id: string; email: string; role: string; firstName?: string; lastName?: string } | null>(null);

  useEffect(() => {
    if (storeName !== undefined) setName(storeName ?? null);
    if (storeLogo !== undefined) setLogo(storeLogo ?? null);
    if (storeAddress !== undefined) setAddress(storeAddress ?? null);
  }, [storeName, storeLogo, storeAddress]);

  const updateCartCount = useCallback(() => {
    try {
      const count = getCartCount(storeDomain);
      setCartItemCount(count);

      // Trigger subtle pulse animation when count increases
      if (count > prevCountRef.current && count > 0) {
        setBadgeAnimate(true);
        setTimeout(() => setBadgeAnimate(false), 700);
      }
      prevCountRef.current = count;
    } catch {
      setCartItemCount(0);
    }
  }, [storeDomain]);

  useEffect(() => {
    updateCartCount();

    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch {
      // ignore
    }

    // Listen to custom cart-updated event (same window) and storage event (multi-tab)
    window.addEventListener(CART_UPDATED_EVENT, updateCartCount);
    window.addEventListener('storage', updateCartCount);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, updateCartCount);
      window.removeEventListener('storage', updateCartCount);
    };
  }, [updateCartCount]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // ignore
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  useEffect(() => {
    if (storeName !== undefined) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/stores/${storeDomain || 'current'}`);
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
          <Link href="/" className="flex items-center space-x-2">
            {logo ? (
              <Image
                src={logo}
                alt={name || 'Logo toko'}
                width={40}
                height={40}
                className="w-10 h-10 rounded object-contain"
                unoptimized
              />
            ) : (
              <div
                style={{ backgroundColor: 'var(--brand-primary, #4F46E5)' }}
                className="w-10 h-10 rounded flex items-center justify-center shadow-xs"
              >
                <span className="text-white font-bold text-lg">{name?.[0] || 'T'}</span>
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{name || 'Toko Online'}</h1>
              {address && <p className="text-sm text-gray-500 truncate max-w-md">{address}</p>}
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-gray-600 hover:text-gray-900 font-medium">Beranda</Link>
            <Link href="/products" className="text-gray-600 hover:text-gray-900 font-medium">Produk</Link>
            <Link href="/categories" className="text-gray-600 hover:text-gray-900 font-medium">Kategori</Link>
            <Link href="/articles" className="text-gray-600 hover:text-gray-900 font-medium">Artikel</Link>
            <Link href="/penawaran" className="font-semibold text-orange-600 hover:text-orange-700">Penawaran</Link>
            <Link href="/orders" className="text-gray-600 hover:text-gray-900 font-medium">Pesanan Saya</Link>
          </nav>

          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Real-time Cart Icon with Dynamic Count Badge */}
            <Link
              href="/cart"
              className="relative p-2.5 rounded-full hover:bg-gray-100 transition-colors group"
              title="Keranjang Belanja"
            >
              <svg className="w-6 h-6 text-gray-600 group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cartItemCount > 0 && (
                <span
                  style={{ backgroundColor: 'var(--brand-primary, #4F46E5)' }}
                  className={`absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1.5 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-md transition-transform duration-300 ${
                    badgeAnimate ? 'scale-125 ring-2 ring-indigo-300' : 'scale-100'
                  }`}
                >
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center space-x-2 text-sm">
                {(user.role === 'ADMIN' || user.role === 'STAFF') && (
                  <Link
                    href="/admin"
                    className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800 transition shadow-xs"
                  >
                    🛠️ Panel Admin
                  </Link>
                )}
                <span className="text-gray-700 font-medium hidden sm:inline truncate max-w-[120px]">
                  {user.firstName || user.email.split('@')[0]}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-2.5 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded border border-red-200 transition"
                  title="Keluar dari akun"
                >
                  Keluar
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  style={{ backgroundColor: 'var(--brand-primary, #4F46E5)' }}
                  className="hidden sm:inline-block px-3 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 transition shadow-xs"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
