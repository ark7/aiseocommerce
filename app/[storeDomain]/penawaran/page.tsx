'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import StoreHeader from '@/components/StoreHeader';
import AddToCartButton from '@/components/AddToCartButton';
import SaleCountdown from '@/components/SaleCountdown';
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

/**
 * "Penawaran Menarik" — everything here is bounded by a clock or a quota,
 * which is why it gets its own page instead of being scattered through the
 * catalogue.
 */
export default function OffersPage() {
  const pathname = usePathname();
  const storeDomain = pathname.split('/')[1];

  const [products, setProducts] = useState<OfferProduct[]>([]);
  const [vouchers, setVouchers] = useState<OfferVoucher[]>([]);
  const [claimed, setClaimed] = useState<Record<string, string>>({});
  /**
   * Codes are cached so a reload does not hide what was already claimed. The
   * flag stops the write-back effect from saving the empty initial state over
   * the stored codes before the read below has happened.
   */
  const [claimsLoaded, setClaimsLoaded] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authHeaders = useCallback((): Record<string, string> | null => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : null;
  }, []);

  useEffect(() => {
    // Reset first: another store's codes are not this store's.
    setClaimsLoaded(false);
    setClaimed({});

    try {
      const stored = localStorage.getItem(`claimedVouchers_${storeDomain}`);
      if (stored) setClaimed(JSON.parse(stored));
    } catch {
      // A corrupt cache only means the codes show up again after the next claim.
    } finally {
      setClaimsLoaded(true);
    }
  }, [storeDomain]);

  useEffect(() => {
    if (!claimsLoaded) return;
    localStorage.setItem(`claimedVouchers_${storeDomain}`, JSON.stringify(claimed));
  }, [claimed, claimsLoaded, storeDomain]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const storeResponse = await fetch(`/api/stores/${storeDomain}`);
        if (!storeResponse.ok) return;

        const storeData = await storeResponse.json();
        if (cancelled) return;

        // 48 rows rather than a page at a time: the "is it on sale" decision
        // runs through `lib/pricing`, which needs the rows themselves, and
        // re-implementing it as a SQL filter is how the two drift apart.
        const productsResponse = await fetch(
          `/api/products?storeId=${storeData.store.id}&isPublished=true&limit=48`
        );
        const productsData = productsResponse.ok ? await productsResponse.json() : { products: [] };

        const vouchersResponse = await fetch(`/api/vouchers?storeId=${storeData.store.id}`);
        const vouchersData = vouchersResponse.ok ? await vouchersResponse.json() : { vouchers: [] };

        if (cancelled) return;
        setProducts(productsData.products ?? []);
        setVouchers(vouchersData.vouchers ?? []);
      } catch {
        if (!cancelled) setClaimError('Gagal memuat penawaran');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [storeDomain]);

  const claimVoucher = async (voucherId: string) => {
    const headers = authHeaders();
    if (!headers) {
      // A claim binds the voucher to a person, so there has to be one.
      setClaimError('Masuk dulu untuk mengklaim voucher');
      return;
    }

    setClaimingId(voucherId);
    setClaimError(null);

    try {
      const response = await fetch('/api/vouchers/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ voucherId }),
      });
      const data = await response.json();

      if (!response.ok) {
        setClaimError(data.error || 'Gagal mengklaim voucher');
        return;
      }

      // Functional updater, not `{ ...claimed }`: claiming two vouchers in
      // quick succession would otherwise have the second call read the state
      // from before the first one landed and drop that first code. Storage is
      // written by the effect above, so this stays a pure state update.
      setClaimed((previous) => ({ ...previous, [voucherId]: data.claim.code as string }));
    } catch {
      setClaimError('Gagal mengklaim voucher');
    } finally {
      setClaimingId(null);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard access is a convenience; the code is on screen either way.
    }
  };

  const now = new Date();
  const onSale = products.filter((product) => isSaleActive(product, now));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StoreHeader storeDomain={storeDomain} />
        <main className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-500">
          Memuat penawaran...
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <StoreHeader storeDomain={storeDomain} />

      <main className="max-w-7xl mx-auto px-4 py-8">
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
                  <h3 className="font-semibold text-gray-900">{voucherHeadline(voucher)}</h3>
                  <p className="text-sm text-gray-600 mt-1">{voucher.name}</p>
                  {voucher.description && (
                    <p className="text-xs text-gray-500 mt-2">{voucher.description}</p>
                  )}

                  <div className="mt-3 space-y-1 text-xs text-gray-500">
                    {voucher.minPurchase != null && (
                      <div>Min. belanja {formatIDR(voucher.minPurchase)}</div>
                    )}
                    {voucher.remaining != null && <div>Sisa kuota: {voucher.remaining}</div>}
                    <div>
                      <SaleCountdown endsAt={voucher.endsAt} />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t mt-auto">
                    {claimed[voucher.id] ? (
                      <div className="flex items-center justify-between gap-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <span className="font-mono font-semibold text-green-800">
                          {claimed[voucher.id]}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyCode(claimed[voucher.id])}
                          className="text-sm text-green-700 hover:underline shrink-0"
                        >
                          Salin
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => claimVoucher(voucher.id)}
                        disabled={claimingId === voucher.id}
                        className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
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

        {/* Sale products */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Sedang Harga Coret</h2>
          {onSale.length === 0 ? (
            <p className="text-gray-500 bg-white border rounded-lg px-4 py-8 text-center">
              Tidak ada produk yang sedang diskon.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {onSale.map((product) => {
                const price = resolveUnitPrice(product, now);
                const remaining = saleRemaining(product);
                // Stated as a whole percent: that is how a shopper reads the
                // gap between the two prices.
                const percentOff = Math.round(
                  ((product.sellingPrice - price) / product.sellingPrice) * 100
                );

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-lg shadow border overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
                  >
                    <Link href={`/${storeDomain}/product/${product.slug}`} className="block">
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
    </div>
  );
}
