import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import {
  generateProductSalesImage,
  SalesImageStyle,
  SALES_IMAGE_PRESETS,
} from '@/lib/aiService';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Harap login terlebih dahulu.' },
        { status: 401 }
      );
    }

    if (!['ADMIN', 'STAFF'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Hanya admin dan staf toko yang dapat membuat gambar jualan.' },
        { status: 403 }
      );
    }

    if (!user.storeId) {
      return NextResponse.json(
        { error: 'Akun Anda tidak terasosiasi dengan toko manapun (storeId tidak ditemukan).' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      referenceImage,
      style = 'studio-clean',
      aspectRatio = '1:1',
      productName,
      categoryName,
      additionalPrompt,
      attachToProductId,
    } = body;

    // VALIDASI WAJIB: Foto referensi produk asli mutlak diperlukan!
    if (!referenceImage || typeof referenceImage !== 'string' || !referenceImage.trim()) {
      return NextResponse.json(
        {
          error:
            'Foto referensi produk asli wajib disertakan. AI membutuhkan referensi visual produk untuk menghasilkan foto jualan yang akurat.',
        },
        { status: 400 }
      );
    }

    // Validasi pilihan style
    const validStyles = SALES_IMAGE_PRESETS.map((p) => p.id);
    const chosenStyle: SalesImageStyle = validStyles.includes(style) ? style : 'studio-clean';

    // Validasi aspect ratio
    const validRatios = ['1:1', '4:5', '16:9'];
    const chosenRatio = validRatios.includes(aspectRatio) ? aspectRatio : '1:1';

    const result = await generateProductSalesImage({
      storeId: user.storeId,
      referenceImage: referenceImage.trim(),
      style: chosenStyle,
      aspectRatio: chosenRatio as '1:1' | '4:5' | '16:9',
      productName: typeof productName === 'string' ? productName.slice(0, 150) : undefined,
      categoryName: typeof categoryName === 'string' ? categoryName.slice(0, 100) : undefined,
      additionalPrompt:
        typeof additionalPrompt === 'string' ? additionalPrompt.slice(0, 500) : undefined,
      attachToProductId:
        typeof attachToProductId === 'string' && attachToProductId.trim()
          ? attachToProductId.trim()
          : undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error('Failed to generate AI product sales image', {
      error: error?.message || String(error),
    });

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Terjadi kesalahan internal saat memproses generasi foto jualan AI.',
      },
      { status: 500 }
    );
  }
}

