'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from './ThemeToggle';

interface StoreFooterProps {
  storeDomain?: string;
  storeName?: string | null;
  storeLogo?: string | null;
  tagline?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  socialLinks?: Record<string, string> | null;
}

export default function StoreFooter({
  storeDomain,
  storeName,
  storeLogo,
  tagline,
  address,
  phone,
  email,
  socialLinks = {},
}: StoreFooterProps) {
  const [resolvedName, setResolvedName] = useState<string | null>(storeName ?? null);
  const [resolvedLogo, setResolvedLogo] = useState<string | null>(storeLogo ?? null);
  const [resolvedTagline, setResolvedTagline] = useState<string | null>(tagline ?? null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(address ?? null);
  const [resolvedPhone, setResolvedPhone] = useState<string | null>(phone ?? null);
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(email ?? null);
  const [resolvedSocialLinks, setResolvedSocialLinks] = useState<Record<string, string> | null>(
    socialLinks ?? {}
  );

  useEffect(() => {
    if (storeName !== undefined) setResolvedName(storeName ?? null);
    if (storeLogo !== undefined) setResolvedLogo(storeLogo ?? null);
    if (tagline !== undefined) setResolvedTagline(tagline ?? null);
    if (address !== undefined) setResolvedAddress(address ?? null);
    if (phone !== undefined) setResolvedPhone(phone ?? null);
    if (email !== undefined) setResolvedEmail(email ?? null);
    if (socialLinks !== undefined) setResolvedSocialLinks(socialLinks ?? {});
  }, [storeName, storeLogo, tagline, address, phone, email, socialLinks]);

  useEffect(() => {
    if (storeName !== undefined && address !== undefined) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/stores/${storeDomain || 'current'}`);
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled || !data?.store) return;

        setResolvedName((prev) => prev ?? data.store.name ?? null);
        setResolvedLogo((prev) => prev ?? data.store.logo ?? null);
        setResolvedAddress((prev) => prev ?? data.store.address ?? null);
        setResolvedPhone((prev) => prev ?? data.store.phone ?? null);
        setResolvedEmail((prev) => prev ?? data.store.email ?? null);
        if (data.store.settings?.tagline) {
          setResolvedTagline((prev) => prev ?? data.store.settings.tagline);
        }
        if (data.store.settings?.socialLinks) {
          setResolvedSocialLinks((prev) =>
            prev && Object.values(prev).some(Boolean) ? prev : data.store.settings.socialLinks
          );
        }
      } catch {
        // Footer still renders cleanly if fallback store fetch is unavailable.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storeDomain, storeName, address]);

  const name = resolvedName || 'Toko Online';
  const currentYear = new Date().getFullYear();

  // Clean WhatsApp number
  const waNumber = resolvedPhone ? resolvedPhone.replace(/[^0-9]/g, '') : '';
  const waFormatted = waNumber.startsWith('0') ? `62${waNumber.slice(1)}` : waNumber;

  return (
    <footer className="bg-gray-900 text-gray-300 mt-20 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Kolom 1: Profil Brand */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center space-x-2">
              {resolvedLogo ? (
                <Image
                  src={resolvedLogo}
                  alt={name}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded object-contain bg-white p-1"
                  unoptimized
                />
              ) : (
                <div className="w-10 h-10 bg-indigo-600 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{name[0] || 'T'}</span>
                </div>
              )}
              <span className="text-xl font-bold text-white tracking-tight">{name}</span>
            </Link>

            {resolvedTagline ? (
              <p className="text-sm text-gray-400 leading-relaxed">{resolvedTagline}</p>
            ) : (
              <p className="text-sm text-gray-400 leading-relaxed">
                Pusat belanja online terpercaya dengan pilihan produk berkualitas tinggi dan jaminan pelayanan terbaik.
              </p>
            )}

            {/* Media Sosial */}
            {resolvedSocialLinks && Object.values(resolvedSocialLinks).some(Boolean) && (
              <div className="pt-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ikuti Kami</p>
                <div className="flex items-center space-x-3">
                  {resolvedSocialLinks.instagram && (
                    <a
                      href={resolvedSocialLinks.instagram.startsWith('http') ? resolvedSocialLinks.instagram : `https://instagram.com/${resolvedSocialLinks.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-gray-800 hover:bg-indigo-600 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                      title="Instagram"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    </a>
                  )}
                  {resolvedSocialLinks.tiktok && (
                    <a
                      href={resolvedSocialLinks.tiktok.startsWith('http') ? resolvedSocialLinks.tiktok : `https://tiktok.com/@${resolvedSocialLinks.tiktok.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-gray-800 hover:bg-black flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                      title="TikTok"
                    >
                      <span className="font-bold text-xs">TT</span>
                    </a>
                  )}
                  {resolvedSocialLinks.facebook && (
                    <a
                      href={resolvedSocialLinks.facebook.startsWith('http') ? resolvedSocialLinks.facebook : `https://facebook.com/${resolvedSocialLinks.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-gray-800 hover:bg-blue-600 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                      title="Facebook"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Kolom 2: Navigasi Toko */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Navigasi</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition-colors">Beranda</Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-white transition-colors">Semua Produk</Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-white transition-colors">Kategori Produk</Link>
              </li>
              <li>
                <Link href="/articles" className="hover:text-white transition-colors">Artikel &amp; Rekomendasi</Link>
              </li>
              <li>
                <Link href="/penawaran" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
                  Penawaran Spesial
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolom 3: Layanan Pelanggan */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Layanan Pelanggan</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/orders" className="hover:text-white transition-colors">Status &amp; Lacak Pesanan</Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-white transition-colors">Keranjang Belanja</Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">Syarat &amp; Ketentuan</Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">Kebijakan Privasi</Link>
              </li>
              {waFormatted && (
                <li>
                  <a
                    href={`https://wa.me/${waFormatted}?text=Halo%20${encodeURIComponent(name)},%20saya%20ingin%20bertanya%20tentang%20produk`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                  >
                    <span>Hubungi via WhatsApp &rarr;</span>
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Kolom 4: Kontak & Alamat */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Kontak Kami</h3>
            {resolvedAddress && (
              <p className="text-sm text-gray-400 leading-relaxed">
                <span className="font-semibold text-gray-300 block">Alamat:</span>
                {resolvedAddress}
              </p>
            )}
            {resolvedPhone && (
              <p className="text-sm text-gray-400">
                <span className="font-semibold text-gray-300 block">Telepon / WhatsApp:</span>
                {resolvedPhone}
              </p>
            )}
            {resolvedEmail && (
              <p className="text-sm text-gray-400">
                <span className="font-semibold text-gray-300 block">Email:</span>
                <a href={`mailto:${resolvedEmail}`} className="hover:underline text-gray-300">{resolvedEmail}</a>
              </p>
            )}
          </div>
        </div>

        {/* Bottom Bar: Copyright & Legal */}
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© {currentYear} {name}. Seluruh hak cipta dilindungi.</p>
          <div className="flex items-center space-x-6 text-xs text-gray-400">
            <Link href="/terms" className="hover:text-white transition-colors">
              Syarat &amp; Ketentuan
            </Link>
            <span className="text-gray-700">•</span>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Kebijakan Privasi
            </Link>
          </div>
          <div className="flex items-center space-x-3">
            <p className="text-gray-400">
              Didukung oleh{' '}
              <a
                href="https://larismanis.online"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-gray-300 hover:text-white transition underline decoration-gray-600 underline-offset-2"
              >
                LarisManis.online
              </a>
            </p>
            <ThemeToggle className="text-gray-400 hover:text-white hover:bg-gray-800" />
          </div>
        </div>
      </div>
    </footer>
  );
}
