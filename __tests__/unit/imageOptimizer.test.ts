import sharp from 'sharp';
import {
  validateRawImage,
  optimizeAndSaveImage,
  MAX_RAW_UPLOAD_SIZE,
} from '@/lib/imageOptimizer';
import { unlink } from 'fs/promises';

describe('lib/imageOptimizer', () => {
  describe('validateRawImage', () => {
    it('accepts valid image MIME types within size limit', () => {
      expect(validateRawImage(1024 * 500, 'image/jpeg').valid).toBe(true);
      expect(validateRawImage(1024 * 500, 'image/png').valid).toBe(true);
      expect(validateRawImage(1024 * 500, 'image/webp').valid).toBe(true);
      expect(validateRawImage(1024 * 500, 'image/svg+xml').valid).toBe(true);
      expect(validateRawImage(1024 * 500, 'image/x-icon').valid).toBe(true);
    });

    it('rejects files larger than max size limit', () => {
      const oversized = MAX_RAW_UPLOAD_SIZE + 1024;
      const result = validateRawImage(oversized, 'image/jpeg');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('melebihi batas');
    });

    it('rejects empty files (0 bytes)', () => {
      const result = validateRawImage(0, 'image/jpeg');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak boleh kosong');
    });

    it('rejects unsupported file formats', () => {
      expect(validateRawImage(1024, 'application/pdf').valid).toBe(false);
      expect(validateRawImage(1024, 'text/plain').valid).toBe(false);
      expect(validateRawImage(1024, 'application/x-msdownload').valid).toBe(false);
    });
  });

  describe('optimizeAndSaveImage', () => {
    let createdFiles: string[] = [];

    afterAll(async () => {
      for (const path of createdFiles) {
        await unlink(path).catch(() => {});
      }
    });

    it('compresses a large product image into an optimized WebP', async () => {
      // Create a 1600x1200 high-res uncompressed PNG buffer
      const rawBuffer = await sharp({
        create: {
          width: 1600,
          height: 1200,
          channels: 3,
          background: { r: 50, g: 100, b: 200 },
        },
      })
        .png({ compressionLevel: 0 })
        .toBuffer();

      const result = await optimizeAndSaveImage({
        file: rawBuffer,
        type: 'product',
        originalFilename: 'camera-photo.png',
        storeId: 'test-store',
      });

      createdFiles.push(result.filePath);

      expect(result.url).toMatch(/^\/uploads\/products\/product-.*\.webp$/);
      expect(result.format).toBe('webp');
      expect(result.width).toBeLessThanOrEqual(1200);
      expect(result.height).toBeLessThanOrEqual(1200);
      expect(result.optimizedSize).toBeLessThan(result.originalSize);
      expect(result.savingsPercent).toBeGreaterThan(0);
    });

    it('compresses a store logo preserving transparency within 500x500px', async () => {
      // Create an 800x800 logo with transparent alpha channel
      const logoBuffer = await sharp({
        create: {
          width: 800,
          height: 800,
          channels: 4,
          background: { r: 255, g: 120, b: 0, alpha: 0.5 },
        },
      })
        .png()
        .toBuffer();

      const result = await optimizeAndSaveImage({
        file: logoBuffer,
        type: 'logo',
        originalFilename: 'brand-logo.png',
      });

      createdFiles.push(result.filePath);

      expect(result.url).toMatch(/^\/uploads\/logos\/logo-.*\.webp$/);
      expect(result.format).toBe('webp');
      expect(result.width).toBeLessThanOrEqual(500);
      expect(result.height).toBeLessThanOrEqual(500);
    });

    it('processes a favicon as a 64x64px PNG', async () => {
      const iconBuffer = await sharp({
        create: {
          width: 256,
          height: 256,
          channels: 4,
          background: { r: 0, g: 200, b: 100, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const result = await optimizeAndSaveImage({
        file: iconBuffer,
        type: 'favicon',
        originalFilename: 'favicon.png',
      });

      createdFiles.push(result.filePath);

      expect(result.url).toMatch(/^\/uploads\/favicons\/favicon-.*\.png$/);
      expect(result.format).toBe('png');
      expect(result.width).toBeLessThanOrEqual(64);
      expect(result.height).toBeLessThanOrEqual(64);
    });

    it('stores SVG vector graphics directly without rasterization', async () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" stroke="green" fill="yellow" /></svg>';
      const svgBuffer = Buffer.from(svgContent, 'utf-8');

      const result = await optimizeAndSaveImage({
        file: svgBuffer,
        type: 'logo',
        originalFilename: 'vector-logo.svg',
      });

      createdFiles.push(result.filePath);

      expect(result.url).toMatch(/^\/uploads\/logos\/logo-.*\.svg$/);
      expect(result.format).toBe('svg');
      expect(result.savingsPercent).toBe(0);
    });
  });
});

