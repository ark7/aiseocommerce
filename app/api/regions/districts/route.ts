import { NextResponse } from 'next/server';
import { getDistricts } from '@/lib/indonesiaRegions';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const regencyId = searchParams.get('regencyId') || '';

    if (!regencyId) {
      return NextResponse.json({ error: 'regencyId is required' }, { status: 400 });
    }

    const districts = await getDistricts(regencyId);
    return NextResponse.json({
      success: true,
      data: districts,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data kecamatan' }, { status: 500 });
  }
}

