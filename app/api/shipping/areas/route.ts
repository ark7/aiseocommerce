import { NextResponse } from 'next/server';
import { searchBiteshipAreas } from '@/lib/biteship';
import { prisma } from '@/lib/prisma';
import { allow } from '@/lib/rateLimit';
import { getIPAddress } from '@/lib/ip';

export async function GET(request: Request) {
  try {
    const ip = getIPAddress(request);
    if (!allow(`shipping_areas:${ip}`, 30)) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan pencarian wilayah. Silakan coba lagi sebentar.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('input') || '';
    const storeId = searchParams.get('storeId');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ success: true, areas: [] });
    }

    let apiKey: string | null = null;
    if (storeId) {
      const storeSettings = await prisma.storeSettings.findUnique({
        where: { storeId },
        select: { biteshipApiKey: true },
      });
      apiKey = storeSettings?.biteshipApiKey || null;
    }

    const areas = await searchBiteshipAreas({
      apiKey,
      query,
    });

    return NextResponse.json({
      success: true,
      areas,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mencari wilayah pengiriman' }, { status: 500 });
  }
}

