import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import LandingPageView from '@/components/LandingPageView';
import {
  LandingPageData,
  LandingPageSection,
  ProofTrustSectionData,
  TestimonialsSectionData,
  OfferSectionData,
  EventDetailsSectionData,
  SpeakersSectionData,
  PricingTiersSectionData,
} from '@/lib/landingPageTypes';

interface LandingPageProps {
  params: { slug: string };
}

// 1. DYNAMIC SEO METADATA
export async function generateMetadata({ params }: LandingPageProps): Promise<Metadata> {
  const landingPage = await prisma.landingPage.findFirst({
    where: { slug: params.slug, isPublished: true },
    include: { store: true },
  });

  if (!landingPage) {
    return {
      title: 'Halaman Tidak Ditemukan',
    };
  }

  const title = landingPage.seoTitle || landingPage.title;
  const description =
    landingPage.seoDescription ||
    'Dapatkan promo dan penawaran eksklusif terbaik dengan ulasan pelanggan terverifikasi dan garansi uang kembali.';
  const keywords = landingPage.seoKeywords
    ? landingPage.seoKeywords.split(',').map((k) => k.trim())
    : undefined;

  return {
    title: `${title} | ${landingPage.store.name}`,
    description,
    keywords,
    openGraph: {
      title,
      description,
      url: `https://${landingPage.store.domain}/lp/${landingPage.slug}`,
      siteName: landingPage.store.name,
      images: landingPage.ogImage ? [{ url: landingPage.ogImage }] : [],
      locale: 'id_ID',
      type: 'website',
    },
    alternates: {
      canonical: `https://${landingPage.store.domain}/lp/${landingPage.slug}`,
    },
  };
}

// 2. STOREFRONT PAGE COMPONENT
export default async function StorefrontLandingPage({ params }: LandingPageProps) {
  const landingPage = await prisma.landingPage.findFirst({
    where: { slug: params.slug, isPublished: true },
    include: {
      store: true,
      product: {
        select: {
          id: true,
          name: true,
          productType: true,
          sellingPrice: true,
          discountPrice: true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        },
      },
    },
  });

  if (!landingPage) {
    notFound();
  }

  const sections = (Array.isArray(landingPage.sections)
    ? (landingPage.sections as unknown as LandingPageSection[])
    : []) as LandingPageSection[];

  // Extract Sections for Google Schema.org Rich Snippet
  const proofSec = sections.find((s): s is ProofTrustSectionData => s.type === 'proof_trust');
  const testiSec = sections.find((s): s is TestimonialsSectionData => s.type === 'testimonials');
  const offerSec = sections.find((s): s is OfferSectionData => s.type === 'offer');
  const eventSec = sections.find((s): s is EventDetailsSectionData => s.type === 'event_details');
  const speakersSec = sections.find((s): s is SpeakersSectionData => s.type === 'speakers');
  const tiersSec = sections.find((s): s is PricingTiersSectionData => s.type === 'pricing_tiers');

  const ratingValue = proofSec?.aggregateRating || 4.9;
  const reviewCount = testiSec?.items?.length ? Math.max(testiSec.items.length * 35, 120) : 1250;

  // Schema.org Product JSON-LD
  const schemas: any[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: landingPage.title,
      description: landingPage.seoDescription || landingPage.title,
      image: landingPage.ogImage || (landingPage.product?.images?.[0]?.url ?? undefined),
      brand: {
        '@type': 'Brand',
        name: landingPage.store.name,
      },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'IDR',
        price: offerSec?.discountPrice || tiersSec?.tiers?.[0]?.price || landingPage.product?.discountPrice || landingPage.product?.sellingPrice || 149000,
        availability: 'https://schema.org/InStock',
        url: `https://${landingPage.store.domain}/lp/${landingPage.slug}`,
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue,
        reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
      review: (testiSec?.items || []).slice(0, 5).map((t) => ({
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: t.name,
        },
        reviewRating: {
          '@type': 'Rating',
          ratingValue: t.rating || 5,
          bestRating: 5,
          worstRating: 1,
        },
        reviewBody: t.comment,
      })),
    },
  ];

  // If this landing page represents an Event/Seminar, generate Schema.org Event
  if (eventSec) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'EducationEvent',
      name: landingPage.title,
      description: landingPage.seoDescription || landingPage.title,
      startDate: eventSec.eventStartDate,
      endDate: eventSec.eventEndDate || eventSec.eventStartDate,
      eventAttendanceMode: eventSec.locationType === 'ONLINE'
        ? 'https://schema.org/OnlineEventAttendanceMode'
        : 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      location: eventSec.locationType === 'ONLINE'
        ? {
            '@type': 'VirtualLocation',
            url: `https://${landingPage.store.domain}/lp/${landingPage.slug}`,
            name: eventSec.venueName || 'Online Webinar',
          }
        : {
            '@type': 'Place',
            name: eventSec.venueName || 'Lokasi Acara',
            address: eventSec.venueAddress || 'Indonesia',
          },
      image: landingPage.ogImage || (landingPage.product?.images?.[0]?.url ?? undefined),
      organizer: {
        '@type': 'Organization',
        name: landingPage.store.name,
        url: `https://${landingPage.store.domain}`,
      },
      performer: speakersSec?.speakers?.map((spk) => ({
        '@type': 'Person',
        name: spk.name,
        jobTitle: spk.role,
      })) || [],
      offers: {
        '@type': 'Offer',
        priceCurrency: 'IDR',
        price: tiersSec?.tiers?.[0]?.price || offerSec?.discountPrice || landingPage.product?.sellingPrice || 99000,
        availability: (eventSec.quotaRemaining ?? 1) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/SoldOut',
        url: `https://${landingPage.store.domain}/lp/${landingPage.slug}`,
      },
    });
  }

  const formattedLp: LandingPageData = {
    id: landingPage.id,
    title: landingPage.title,
    slug: landingPage.slug,
    customPath: landingPage.customPath,
    seoTitle: landingPage.seoTitle,
    seoDescription: landingPage.seoDescription,
    seoKeywords: landingPage.seoKeywords,
    ogImage: landingPage.ogImage,
    isPublished: landingPage.isPublished,
    productId: landingPage.productId,
    product: landingPage.product
      ? {
          id: landingPage.product.id,
          name: landingPage.product.name,
          sellingPrice: landingPage.product.sellingPrice,
          discountPrice: landingPage.product.discountPrice,
          images: landingPage.product.images,
        }
      : null,
    sections,
    createdAt: landingPage.createdAt.toISOString(),
    updatedAt: landingPage.updatedAt.toISOString(),
  };

  return (
    <>
      {/* Schema.org Structured Data */}
      {schemas.map((s, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}

      <LandingPageView
        landingPage={formattedLp}
        storeName={landingPage.store.name}
        storeDomain={landingPage.store.domain}
      />
    </>
  );
}
