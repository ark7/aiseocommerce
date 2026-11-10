import { NextResponse } from 'next/server';
import { getRegencies } from '@/lib/indonesiaRegions';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const provinceId = searchParams.get('provinceId') || '';

    if (!provinceId) {
      return NextResponse.json({ error: 'provinceId is required' }, { status: 400 });
    }

    const regencies = await getRegencies(provinceId);
    return NextResponse.json({
      success: true,
      data: regencies,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data kabupaten/kota' }, { status: 500 });
  }
}

