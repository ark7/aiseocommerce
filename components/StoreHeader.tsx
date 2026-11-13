'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { getCartCount, CART_UPDATED_EVENT } from '@/lib/cart';
import ThemeToggle from './ThemeToggle';

interface StoreHeaderProps {
  storeDomain?: string;
  storeName?: string | null;
  storeLogo?: string | null;
  storeAddress?: string | null;
}

interface NavItem {
  href: string;
  label: string;
  isPromo?: boolean;
  matchPrefixes?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Beranda' },
  { href: '/products', label: 'Produk', matchPrefixes: ['/products', '/product/'] },
  { href: '/categories', label: 'Kategori', matchPrefixes: ['/categories', '/category/'] },
  { href: '/articles', label: 'Artikel', matchPrefixes: ['/articles'] },
  { href: '/penawaran', label: 'Penawaran', isPromo: true, matchPrefixes: ['/penawaran'] },
  { href: '/orders', label: 'Pesanan Saya', matchPrefixes: ['/orders'] },
];

function isNavActive(pathname: string | null, item: NavItem): boolean {
  if (!pathname) return false;
  if (item.href === '/') return pathname === '/';
  if (pathname === item.href) return true;
  return Boolean(item.matchPrefixes?.some((prefix) => pathname.startsWith(prefix)));
}

/**
 * Storefront header shared across all public pages and customer routes.
 *
 * Keeps the top bar clean (store address is shown only in StoreFooter),
 * highlights active navigation routes, synchronizes the live cart badge,
 * and folds navigation + account links into a responsive mobile navlist.
 */
export default function StoreHeader({
  storeDomain,
  storeName,
  storeLogo,
}: StoreHeaderProps) {
  const pathname = usePathname();
  const [name, setName] = useState<string | null>(storeName ?? null);
  const [logo, setLogo] = useState<string | null>(storeLogo ?? null);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [badgeAnimate, setBadgeAnimate] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const prevCountRef = useRef(0);
  const [user, setUser] = useState<{
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
  } | null>(null);

  useEffect(() => {
    if (storeName !== undefined) setName(storeName ?? null);
    if (storeLogo !== undefined) setLogo(storeLogo ?? null);
  }, [storeName, storeLogo]);

  // Close mobile navlist automatically when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile navlist when user presses Escape
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

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
    setMobileMenuOpen(false);
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
      } catch {
        // Header still renders without the store details.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storeDomain, storeName]);

  const displayName = user?.firstName || user?.email?.split('@')[0];

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs border-b border-gray-100 dark:border-slate-800 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-3.5">
        <div className="flex justify-between items-center gap-3">
          {/* Brand Logo & Single-Line Title */}
          <Link href="/" className="flex items-center gap-2.5 min-w-0 shrink-0">
            {logo ? (
              <Image
                src={logo}
                alt={name || 'Logo toko'}
                width={38}
                height={38}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-contain bg-white dark:bg-slate-800 p-0.5 border border-gray-100 dark:border-slate-700 shadow-xs shrink-0"
                unoptimized
              />
            ) : (
              <div
                style={{ backgroundColor: 'var(--brand-primary, #4F46E5)' }}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shadow-xs shrink-0"
              >
                <span className="text-white font-bold text-base sm:text-lg">{name?.[0] || 'T'}</span>
              </div>
            )}
            <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white tracking-tight truncate max-w-[165px] sm:max-w-[220px] lg:max-w-[260px]">
              {name || 'Toko Online'}
            </h1>
          </Link>

          {/* Desktop Navigation Bar */}
          <nav aria-label="Menu Utama" className="hidden md:flex items-center gap-1 lg:gap-1.5">
            {NAV_ITEMS.map((item) => {
              const active = isNavActive(pathname, item);
              const baseClass =
                'px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors';
              const stateClass = item.isPromo
                ? active
                  ? 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-semibold'
                  : 'font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-50/70 dark:hover:bg-orange-950/40 hover:text-orange-700 dark:hover:text-orange-300'
                : active
                  ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white font-semibold'
                  : 'font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/60';

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`${baseClass} ${stateClass}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Utility Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <ThemeToggle />

            {/* Real-time Cart Icon with Dynamic Count Badge */}
            <Link
              href="/cart"
              className="relative p-2 sm:p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group"
              title="Keranjang Belanja"
              aria-label="Keranjang Belanja"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
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

            {/* Desktop Account / Auth Actions */}
            {user ? (
              <div className="hidden md:flex items-center gap-2 text-sm">
                {(user.role === 'ADMIN' || user.role === 'STAFF') && (
                  <Link
                    href="/admin"
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 dark:bg-slate-700 text-white hover:bg-gray-800 dark:hover:bg-slate-600 transition shadow-xs whitespace-nowrap"
                  >
                    🛠️ Panel Admin
                  </Link>
                )}
                <span className="text-gray-700 dark:text-gray-200 font-medium hidden lg:inline truncate max-w-[110px]">
                  {displayName}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-900/60 transition"
                  title="Keluar dari akun"
                >
                  Keluar
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  style={{ backgroundColor: 'var(--brand-primary, #4F46E5)' }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 transition shadow-xs"
                >
                  Daftar
                </Link>
              </div>
            )}

            {/* Mobile Navlist Toggle Button */}
            <button
              type="button"
              data-testid="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navlist"
              aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Responsive Mobile Navlist */}
        {mobileMenuOpen && (
          <nav
            id="mobile-navlist"
            data-testid="mobile-navlist"
            aria-label="Menu Navigasi Mobile"
            className="md:hidden mt-3 pt-3 border-t border-gray-100 dark:border-slate-800"
          >
            <ul role="list" className="flex flex-col space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = isNavActive(pathname, item);
                const mobileClass = item.isPromo
                  ? active
                    ? 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-semibold'
                    : 'text-orange-600 dark:text-orange-400 font-semibold hover:bg-orange-50/70 dark:hover:bg-orange-950/40'
                  : active
                    ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white font-semibold'
                    : 'text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-slate-800/70';

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${mobileClass}`}
                    >
                      <span>{item.label}</span>
                      {item.isPromo && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300 font-bold">
                          Promo
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
              {user ? (
                <div className="space-y-2">
                  <div className="px-3 text-xs text-gray-500 dark:text-gray-400">
                    Masuk sebagai <strong className="text-gray-800 dark:text-gray-200">{displayName}</strong>
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    {(user.role === 'ADMIN' || user.role === 'STAFF') && (
                      <Link
                        href="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex-1 text-center px-3 py-2 rounded-lg text-xs font-semibold bg-gray-900 dark:bg-slate-700 text-white hover:bg-gray-800 transition"
                      >
                        🛠️ Panel Admin
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex-1 text-center px-3 py-2 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    >
                      Keluar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition"
                  >
                    Masuk
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ backgroundColor: 'var(--brand-primary, #4F46E5)' }}
                    className="text-center px-3 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition shadow-xs"
                  >
                    Daftar
                  </Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
