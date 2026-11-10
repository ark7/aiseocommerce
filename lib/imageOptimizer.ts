import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

export type ImageAssetType =
  | 'logo'
  | 'favicon'
  | 'product'
  | 'banner'
  | 'article'
  | 'general';

export interface ImageOptimizationConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'webp' | 'png' | 'jpeg';
  subDir: string;
}

export const IMAGE_TYPE_CONFIGS: Record<ImageAssetType, ImageOptimizationConfig> = {
  logo: {
    maxWidth: 500,
    maxHeight: 500,
    quality: 85,
    format: 'webp',
    subDir: 'logos',
  },
  favicon: {
    maxWidth: 64,
    maxHeight: 64,
    quality: 90,
    format: 'png',
    subDir: 'favicons',
  },
  product: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 80,
    format: 'webp',
    subDir: 'products',
  },
  banner: {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 82,
    format: 'webp',
    subDir: 'banners',
  },
  article: {
    maxWidth: 1200,
    maxHeight: 800,
    quality: 80,
    format: 'webp',
    subDir: 'articles',
  },
  general: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 80,
    format: 'webp',
    subDir: 'general',
  },
};

export interface OptimizeImageOptions {
  file: File | Buffer;
  type?: ImageAssetType;
  storeId?: string;
  originalFilename?: string;
  customMaxWidth?: number;
  customQuality?: number;
}

export interface OptimizeImageResult {
  url: string;
  filename: string;
  filePath: string;
  originalSize: number;
  optimizedSize: number;
  savingsPercent: number;
  width?: number;
  height?: number;
  format: string;
}

const BASE_UPLOAD_DIR = './public/uploads';
export const MAX_RAW_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB raw camera photos supported

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
];

/**
 * Validates a raw image file before processing
 */
export function validateRawImage(
  size: number,
  mimeType: string,
  maxSizeBytes = MAX_RAW_UPLOAD_SIZE
): { valid: boolean; error?: string } {
  if (size <= 0) {
    return { valid: false, error: 'Ukuran file gambar tidak boleh kosong' };
  }

  if (size > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    return {
      valid: false,
      error: `Ukuran file gambar melebihi batas maksimal ${maxMb}MB`,
    };
  }

  const normalizedMime = mimeType.toLowerCase().trim();
  const isAllowed = ALLOWED_MIME_TYPES.some(
    (allowed) =>
      normalizedMime === allowed ||
      (allowed === 'image/jpeg' && normalizedMime === 'image/jpg')
  );

  if (!isAllowed) {
    return {
      valid: false,
      error: 'Format file tidak didukung. Harap gunakan format JPG, PNG, WEBP, atau SVG.',
    };
  }

  return { valid: true };
}

/**
 * Optimizes an image (resize, compress, format conversion to WebP/PNG, strip EXIF)
 * and saves it into the public upload directory.
 */
export async function optimizeAndSaveImage(
  options: OptimizeImageOptions
): Promise<OptimizeImageResult> {
  const type = options.type || 'general';
  const config = IMAGE_TYPE_CONFIGS[type] || IMAGE_TYPE_CONFIGS.general;

  // Convert File to Buffer if necessary
  let buffer: Buffer;
  let originalFilename = options.originalFilename || 'image';

  if (Buffer.isBuffer(options.file)) {
    buffer = options.file;
  } else {
    const file = options.file as File;
    buffer = Buffer.from(await file.arrayBuffer());
    if (file.name) {
      originalFilename = file.name;
    }
  }

  const originalSize = buffer.length;
  const isSvg =
    originalFilename.toLowerCase().endsWith('.svg') ||
    buffer.slice(0, 100).toString('utf-8').includes('<svg');

  const targetDir = join(BASE_UPLOAD_DIR, config.subDir);
  await mkdir(targetDir, { recursive: true }).catch(() => {});

  const filePrefix = options.storeId
    ? `${type}-${options.storeId.slice(-6)}-${randomUUID().slice(0, 8)}`
    : `${type}-${randomUUID().slice(0, 12)}`;

  // Handle SVG vector graphics directly without rasterization
  if (isSvg) {
    const filename = `${filePrefix}.svg`;
    const filePath = join(targetDir, filename);
    await writeFile(filePath, buffer);

    return {
      url: `/uploads/${config.subDir}/${filename}`,
      filename,
      filePath,
      originalSize,
      optimizedSize: originalSize,
      savingsPercent: 0,
      format: 'svg',
    };
  }

  try {
    // Process raster image via sharp
    const targetWidth = options.customMaxWidth || config.maxWidth;
    const targetHeight = config.maxHeight;
    const targetQuality = options.customQuality || config.quality;

    let pipeline = sharp(buffer)
      .rotate() // Automatically orient based on EXIF orientation
      .resize({
        width: targetWidth,
        height: targetHeight,
        fit: 'inside',
        withoutEnlargement: true,
      });

    let outputBuffer: Buffer;
    let finalFormat = config.format;

    if (config.format === 'png') {
      outputBuffer = await pipeline
        .png({
          compressionLevel: 9,
          adaptiveFiltering: true,
          quality: targetQuality,
        })
        .toBuffer();
    } else {
      // Default to modern WebP
      finalFormat = 'webp';
      outputBuffer = await pipeline
        .webp({
          quality: targetQuality,
          effort: 4,
          alphaQuality: 90,
        })
        .toBuffer();
    }

    const metadata = await sharp(outputBuffer).metadata().catch(() => null);
    const optimizedSize = outputBuffer.length;
    const savingsPercent =
      originalSize > 0
        ? Math.max(
            0,
            parseFloat(
              (((originalSize - optimizedSize) / originalSize) * 100).toFixed(1)
            )
          )
        : 0;

    const filename = `${filePrefix}.${finalFormat}`;
    const filePath = join(targetDir, filename);
    await writeFile(filePath, outputBuffer);

    return {
      url: `/uploads/${config.subDir}/${filename}`,
      filename,
      filePath,
      originalSize,
      optimizedSize,
      savingsPercent,
      width: metadata?.width,
      height: metadata?.height,
      format: finalFormat,
    };
  } catch (error) {
    // Graceful fallback: If sharp fails on corrupt buffer, write fallback or throw clean error
    const ext = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
    const fallbackFilename = `${filePrefix}.${ext}`;
    const fallbackPath = join(targetDir, fallbackFilename);
    await writeFile(fallbackPath, buffer);

    return {
      url: `/uploads/${config.subDir}/${fallbackFilename}`,
      filename: fallbackFilename,
      filePath: fallbackPath,
      originalSize,
      optimizedSize: originalSize,
      savingsPercent: 0,
      format: ext,
    };
  }
}
