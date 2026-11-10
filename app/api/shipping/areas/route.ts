import { NextResponse } from 'next/server';
import { searchBiteshipAreas } from '@/lib/biteship';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
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

