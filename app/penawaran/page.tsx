'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';
import AddToCartButton from '@/components/AddToCartButton';
import { SaleCountdown } from '@/components/SaleCountdown';
import { isSaleActive, resolveUnitPrice, saleRemaining } from '@/lib/pricing';

interface OfferProduct {
  id: string;
  name: string;
  slug: string;
  sellingPrice: number;
  discountPrice: number | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  saleQuota: number | null;
  saleSold: number;
  stock: number;
  images?: { url: string }[];
}

interface OfferVoucher {
  id: string;
  name: string;
  description: string | null;
  type: 'FIXED' | 'PERCENT';
  value: number;
  maxDiscount: number | null;
  minPurchase: number | null;
  endsAt: string | null;
  remaining: number | null;
}

function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

function voucherHeadline(voucher: OfferVoucher): string {
  const worth =
    voucher.type === 'PERCENT'
      ? `Diskon ${voucher.value}%`
      : `Potongan ${formatIDR(voucher.value)}`;

  return voucher.maxDiscount ? `${worth} (maks ${formatIDR(voucher.maxDiscount)})` : worth;
}

export default function OffersPage() {
  const [storeDomain, setStoreDomain] = useState<string>('');
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<OfferProduct[]>([]);
  const [vouchers, setVouchers] = useState<OfferVoucher[]>([]);
  const [claimed, setClaimed] = useState<Record<string, string>>({});
  const [claimsLoaded, setClaimsLoaded] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authHeaders = useCallback((): Record<string, string> | null => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : null;
  }, []);

  useEffect(() => {
    setClaimsLoaded(false);
    setClaimed({});

    try {
      const stored = localStorage.getItem('claimedVouchers');
      if (stored) setClaimed(JSON.parse(stored));
    } catch {
      // Ignore corrupt cache
    } finally {
      setClaimsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!claimsLoaded) return;
    localStorage.setItem('claimedVouchers', JSON.stringify(claimed));
  }, [claimed, claimsLoaded]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const storeResponse = await fetch('/api/stores/current');
        if (!storeResponse.ok) return;

        const storeData = await storeResponse.json();
        const resolvedStore = storeData.store;
        if (!resolvedStore || cancelled) return;

        setStore(resolvedStore);
        setStoreDomain(resolvedStore.domain);

        const [productRes, voucherRes] = await Promise.all([
          fetch(`/api/products?storeId=${resolvedStore.id}&isPublished=true`),
          fetch(`/api/vouchers?storeId=${resolvedStore.id}`),
        ]);

        if (cancelled) return;

        if (productRes.ok) {
          const body = await productRes.json();
          setProducts(body.products || []);
        }

        if (voucherRes.ok) {
          const body = await voucherRes.json();
          setVouchers(body.vouchers || []);
        }
      } catch {
        // Fall back gracefully
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClaim = async (voucher: OfferVoucher) => {
    setClaimError(null);
    setClaimingId(voucher.id);

    try {
      const headers = authHeaders();
      if (!headers) {
        window.location.href = `/login?from=${encodeURIComponent('/penawaran')}`;
        return;
      }

      const response = await fetch('/api/vouchers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ voucherId: voucher.id }),
      });

      const body = await response.json();
      if (!response.ok) {
        setClaimError(body.error || 'Gagal mengklaim voucher');
        return;
      }

      setClaimed((prev) => ({
        ...prev,
        [voucher.id]: body.claim.code,
      }));
    } catch {
      setClaimError('Gagal mengklaim voucher. Coba lagi sebentar.');
    } finally {
      setClaimingId(null);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard fallback
    }
  };

  const now = new Date();
  const onSale = products.filter((product) => isSaleActive(product, now));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <StoreHeader
          storeDomain={storeDomain}
          storeName={store?.name}
          storeLogo={store?.logo}
          storeAddress={store?.address}
        />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-16 text-center text-gray-500 w-full">
          Memuat penawaran...
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StoreHeader
        storeDomain={storeDomain}
        storeName={store?.name}
        storeLogo={store?.logo}
        storeAddress={store?.address}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        <header className="mb-10">
          <span className="inline-block bg-orange-100 text-orange-800 text-xs font-bold tracking-wide px-3 py-1 rounded-full">
            BERBATAS WAKTU
          </span>
          <h1 className="text-3xl font-bold text-gray-900 mt-3">Penawaran Menarik</h1>
          <p className="text-gray-600 mt-2">
            Harga coret dan voucher yang kuotanya terbatas. Begitu habis atau lewat waktunya,
            penawaran hilang dari halaman ini.
          </p>
        </header>

        {claimError && (
          <div className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{claimError}</div>
        )}

        {/* Vouchers */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Voucher Diskon</h2>
          {vouchers.length === 0 ? (
            <p className="text-gray-500 bg-white border rounded-lg px-4 py-8 text-center">
              Belum ada voucher yang bisa diklaim saat ini.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vouchers.map((voucher) => (
                <article
                  key={voucher.id}
                  className="bg-white border-l-4 border-indigo-500 rounded-lg shadow-sm p-5 flex flex-col"
                >
                  <span className="text-xs font-semibold text-indigo-600 tracking-wider">
                    {voucher.type === 'PERCENT' ? 'VOUCHER PERSEN' : 'POTONGAN HARGA'}
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 mt-1">{voucherHeadline(voucher)}</h3>
                  <p className="text-sm font-medium text-gray-700 mt-1">{voucher.name}</p>
                  {voucher.description && (
                    <p className="text-xs text-gray-500 mt-1">{voucher.description}</p>
                  )}

                  <div className="mt-4 pt-3 border-t text-xs text-gray-500 space-y-1">
                    {voucher.minPurchase && voucher.minPurchase > 0 && (
                      <p>Min. belanja: {formatIDR(voucher.minPurchase)}</p>
                    )}
                    {voucher.remaining != null && (
                      <p>Sisa kuota: {voucher.remaining}</p>
                    )}
                    {voucher.endsAt && (
                      <div className="flex items-center gap-1 text-orange-600 font-medium">
                        <span>Berakhir:</span>
                        <SaleCountdown endsAt={voucher.endsAt} />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-2">
                    {claimed[voucher.id] ? (
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-100 text-indigo-700 font-mono text-sm px-3 py-2 rounded text-center border">
                          {claimed[voucher.id]}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyCode(claimed[voucher.id])}
                          className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
                        >
                          Salin
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleClaim(voucher)}
                        disabled={claimingId === voucher.id}
                        className="w-full bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                      >
                        {claimingId === voucher.id ? 'Mengklaim...' : 'Klaim Voucher'}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Flash Sale / Sale Products */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Produk Promo (Harga Coret)</h2>
          {onSale.length === 0 ? (
            <p className="text-gray-500 bg-white border rounded-lg px-4 py-8 text-center">
              Belum ada produk dengan harga coret saat ini.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {onSale.map((product) => {
                const price = resolveUnitPrice(product, now);
                const remaining = saleRemaining(product);
                const percentOff = Math.round(
                  ((product.sellingPrice - price) / product.sellingPrice) * 100
                );

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-lg shadow border overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
                  >
                    <Link href={`/product/${product.slug}`} className="block">
                      <div className="relative">
                        {product.images?.[0] ? (
                          <Image
                            src={product.images[0].url}
                            alt={product.name}
                            width={300}
                            height={200}
                            className="w-full h-48 object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-48 bg-gray-100" />
                        )}
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                          -{percentOff}%
                        </span>
                      </div>

                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-lg font-bold text-red-600">{formatIDR(price)}</span>
                          <span className="text-sm text-gray-400 line-through">
                            {formatIDR(product.sellingPrice)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <SaleCountdown endsAt={product.saleEndsAt} />
                          {remaining != null && (
                            <span className="text-xs text-gray-500">Sisa {remaining}</span>
                          )}
                        </div>
                      </div>
                    </Link>

                    <div className="p-4 border-t mt-auto">
                      <AddToCartButton
                        productId={product.id}
                        price={price}
                        name={product.name}
                        stock={product.stock}
                        storeDomain={storeDomain}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <StoreFooter />
    </div>
  );
}

