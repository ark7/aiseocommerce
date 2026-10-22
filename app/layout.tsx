import type { Metadata } from 'next';
import './globals.css';
import { getActiveStore } from '@/lib/store';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import MasterThirdPartyTracker from '@/components/MasterThirdPartyTracker';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { isControlPlaneEnabled } from '@/lib/superAdminGuard';

export async function generateMetadata(): Promise<Metadata> {
  const store = await getActiveStore();
  const s = store?.settings;

  const title = s?.defaultSeoTitle || store?.name || 'AI SEO E-Commerce SaaS';
  const description = s?.defaultSeoDescription || s?.tagline || 'Platform E-Commerce SaaS dengan SEO Friendly, Keamanan Tinggi, dan Fitur Lengkap';
  const domain = store?.domain || 'localhost:3000';
  const siteUrl = `https://${domain}`;
  const favicon = s?.favicon || '/favicon.ico';

  return {
    title: {
      default: title,
      template: `%s | ${store?.name || 'Toko Online'}`,
    },
    description,
    keywords: 'e-commerce, belanja online, toko online, produk berkualitas',
    metadataBase: new URL(siteUrl),
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: store?.name || 'Toko Online',
      locale: 'id_ID',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: favicon,
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await getActiveStore();
  const primaryColor = store?.settings?.primaryColor || '#4F46E5';
  const fontFamily = store?.settings?.fontFamily || 'inter';

  let previewDomain: string | null = null;
  if (isControlPlaneEnabled()) {
    try {
      previewDomain = cookies().get('preview_store_domain')?.value || null;
    } catch {
      // ignore
    }
  }

  return (
    <html lang="id">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `:root { --brand-primary: ${primaryColor}; }`,
          }}
        />
      </head>
      <body className={`font-${fontFamily} antialiased`}>
        {previewDomain && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-between sticky top-0 z-50 shadow-md">
            <div className="flex items-center gap-2">
              <span className="bg-slate-950 text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                PREVIEW MODE
              </span>
              <span>
                Sedang mempratinjau Toko: <strong>{store?.name || previewDomain}</strong> (domain:{' '}
                {previewDomain})
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/super-admin" className="underline hover:text-slate-900">
                Panel Super-Admin &rarr;
              </Link>
              <a
                href="/api/super-admin/preview?clear=true"
                className="bg-slate-950 text-white px-2.5 py-1 rounded hover:bg-slate-800 text-[11px]"
              >
                Tutup Preview &times;
              </a>
            </div>
          </div>
        )}
        {children}
        <MasterThirdPartyTracker storeDomain={store?.domain} storeName={store?.name} />
        <CookieConsentBanner
          enabled={store?.settings?.cookieConsentEnabled ?? true}
          title={store?.settings?.cookieConsentTitle}
          text={store?.settings?.cookieConsentText}
        />
      </body>
    </html>
  );
}
