import { NextResponse } from 'next/server';
import { lookupPostalCode } from '@/lib/indonesiaRegions';

export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const code = params?.code || '';
    if (!/^\d{5}$/.test(code)) {
      return NextResponse.json(
        { error: 'Kode pos harus terdiri dari 5 digit angka' },
        { status: 400 }
      );
    }

    const results = await lookupPostalCode(code);
    return NextResponse.json({
      success: true,
      postalCode: code,
      data: results,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mencari data wilayah berdasarkan kode pos' }, { status: 500 });
  }
}

