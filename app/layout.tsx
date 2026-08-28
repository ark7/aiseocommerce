import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'AI SEO E-Commerce SaaS',
    template: '%s | %s',
  },
  description: 'Platform E-Commerce SaaS dengan SEO Friendly, Keamanan Tinggi, dan Fitur Lengkap',
  keywords: 'e-commerce, saas, toko online, belanja online, platform ecommerce',
  authors: [{ name: 'E-Commerce SaaS Team' }],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    title: 'AI SEO E-Commerce SaaS',
    description: 'Platform E-Commerce SaaS dengan SEO Friendly, Keamanan Tinggi, dan Fitur Lengkap',
    url: 'https://ecommerce-saas.example.com',
    siteName: 'AI SEO E-Commerce SaaS',
    images: [{ url: 'https://ecommerce-saas.example.com/og-image.png', width: 1200, height: 630 }],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI SEO E-Commerce SaaS',
    description: 'Platform E-Commerce SaaS dengan SEO Friendly, Keamanan Tinggi, dan Fitur Lengkap',
    images: ['https://ecommerce-saas.example.com/twitter-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
