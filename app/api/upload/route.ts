import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { requireSuperAdminOwner } from '@/lib/superAdminAuth';
import {
  optimizeAndSaveImage,
  validateRawImage,
  ImageAssetType,
  IMAGE_TYPE_CONFIGS,
} from '@/lib/imageOptimizer';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    // 1. Authenticate caller (Store Admin/Staff OR Super-Admin Owner)
    const user = await requireUser(request);
    const isOwner = requireSuperAdminOwner(request);

    if (!user && !isOwner) {
      return NextResponse.json(
        { error: 'Unauthorized: Harap login terlebih dahulu untuk mengunggah media.' },
        { status: 401 }
      );
    }

    if (user && !['ADMIN', 'STAFF'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Hanya admin dan staf toko yang dapat mengunggah media.' },
        { status: 403 }
      );
    }

    // 2. Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const rawType = (formData.get('type') as string) || 'general';

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'File gambar wajib disertakan dalam parameter "file".' },
        { status: 400 }
      );
    }

    const type: ImageAssetType =
      rawType in IMAGE_TYPE_CONFIGS ? (rawType as ImageAssetType) : 'general';

    // 3. Validate raw file size & MIME type
    const validation = validateRawImage(file.size, file.type);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 4. Optimize, resize, convert to WebP/PNG, and save
    const storeId = user?.storeId || undefined;
    const result = await optimizeAndSaveImage({
      file,
      type,
      storeId,
      originalFilename: file.name,
    });

    logger.info('Image uploaded and optimized successfully', {
      type,
      url: result.url,
      originalSize: result.originalSize,
      optimizedSize: result.optimizedSize,
      savingsPercent: result.savingsPercent,
      storeId,
    });

    return NextResponse.json({
      success: true,
      url: result.url,
      filename: result.filename,
      originalSize: result.originalSize,
      optimizedSize: result.optimizedSize,
      savingsPercent: result.savingsPercent,
      width: result.width,
      height: result.height,
      format: result.format,
    });
  } catch (error) {
    logger.error(
      'Failed to process and optimize image upload',
      {},
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat memproses dan mengompresi gambar.' },
      { status: 500 }
    );
  }
}

