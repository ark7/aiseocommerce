import { NextResponse } from 'next/server';
import { getProvinces } from '@/lib/indonesiaRegions';

export async function GET() {
  try {
    const provinces = await getProvinces();
    return NextResponse.json({
      success: true,
      data: provinces,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data provinsi' }, { status: 500 });
  }
}

