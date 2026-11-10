import { NextResponse } from 'next/server';
import { getVillages } from '@/lib/indonesiaRegions';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const districtId = searchParams.get('districtId') || '';

    if (!districtId) {
      return NextResponse.json({ error: 'districtId is required' }, { status: 400 });
    }

    const villages = await getVillages(districtId);
    return NextResponse.json({
      success: true,
      data: villages,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data kelurahan/desa' }, { status: 500 });
  }
}

