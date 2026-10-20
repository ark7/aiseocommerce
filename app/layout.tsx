import type { Metadata } from 'next';
import './globals.css';
import { getActiveStore } from '@/lib/store';
import CookieConsentBanner from '@/components/CookieConsentBanner';

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
        {children}
        <CookieConsentBanner
          enabled={store?.settings?.cookieConsentEnabled ?? true}
          title={store?.settings?.cookieConsentTitle}
          text={store?.settings?.cookieConsentText}
        />
      </body>
    </html>
  );
}
