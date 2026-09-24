import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { revalidateProduct } from '@/lib/revalidate';
import { logger } from '@/lib/logger';
import { getIPAddress } from '@/lib/ip';
import {
  auditProductCreated,
  auditProductUpdated,
  auditProductDeleted,
} from '@/services/auditService';

const UPLOAD_DIR = './public/uploads';
const MAX_FILE_SIZE = 2 * 1024 * 1024;

async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true }).catch(() => {});
}

function generateFilename(originalName: string): string {
  const ext = originalName.split('.').pop();
  return `${randomUUID()}.${ext}`;
}

async function saveFile(file: File, filename: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = join(UPLOAD_DIR, filename);
  await writeFile(filePath, buffer);
  return `/uploads/${filename}`;
}

/**
 * Every FormData value arrives as a string, and the two ways a field can be
 * missing mean different things to Prisma:
 *
 * - key absent        -> `undefined` -> leave the column alone
 * - key present, `''` -> `null`      -> clear the column
 *
 * Collapsing both to `undefined` (the obvious reading of "blank") would make
 * it impossible to ever clear a field, and — worse — answer 200 while quietly
 * changing nothing.
 */
const nullableNumber = z
  .union([z.literal(''), z.coerce.number().min(0)])
  .optional()
  .transform((value) => (value === '' ? null : value));

const nullableText = z
  .string()
  .transform((value) => (value === '' ? null : value))
  .optional();

/**
 * For columns that are NOT NULL (stock, minStock): a blank must mean
 * "unchanged", because `null` would be rejected by the database.
 */
const optionalNumber = z
  .union([z.literal(''), z.coerce.number().min(0)])
  .optional()
  .transform((value) => (value === '' ? undefined : value));

/** Not `z.coerce.boolean()`: Boolean('false') === true, so publish could never be turned off. */
const formBoolean = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === 'true'));

const productFields = {
  name: z.string().min(1),
  slug: z.string().min(1),
  description: nullableText,
  shortDescription: nullableText,
  basePrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  discountPrice: nullableNumber,
  sku: nullableText,
  categoryId: nullableText,
  stock: optionalNumber,
  minStock: optionalNumber,
  isPublished: formBoolean,
  isFeatured: formBoolean,
  seoTitle: nullableText,
  seoDescription: nullableText,
  seoKeywords: nullableText,
};

/** Prisma's code for "a unique constraint rejected this write". */
const UNIQUE_VIOLATION = 'P2002';

/**
 * Turns a unique-constraint rejection into the 400 the admin can act on,
 * or `null` when the error is something else and a 500 is the honest answer.
 */
function uniqueViolationMessage(error: unknown): string | null {
  if ((error as { code?: string } | null)?.code !== UNIQUE_VIOLATION) return null;

  const target = (error as { meta?: { target?: unknown } }).meta?.target;
  const fields = Array.isArray(target) ? target.join(',') : String(target ?? '');

  if (fields.includes('slug')) return 'Slug already exists';
  if (fields.includes('sku')) return 'SKU already exists';
  return 'A unique field is already taken';
}

/** The only files this app owns and may delete are the ones it wrote itself. */
async function removeUploadedFile(url: string): Promise<void> {
  if (!url.startsWith('/uploads/')) return;
  try {
    const { unlink } = await import('fs/promises');
    await unlink(join(UPLOAD_DIR, url.replace('/uploads/', '')));
  } catch {
    // A missing file is not a reason to keep the row.
  }
}

/**
 * Supplies a value only when the field is absent.
 *
 * Not `.default()`: ZodDefault feeds the default back through the field's own
 * schema, so a boolean default would be handed to the string enum and rejected.
 */
const withDefault = <S extends z.ZodTypeAny>(schema: S, fallback: z.output<S>) =>
  schema.transform((value) => (value === undefined ? fallback : value));

const createProductSchema = z.object({
  ...productFields,
  stock: withDefault(productFields.stock, 0),
  minStock: withDefault(productFields.minStock, 0),
  isPublished: withDefault(productFields.isPublished, true),
  isFeatured: withDefault(productFields.isFeatured, false),
});

/**
 * A separate schema rather than `createProductSchema.partial()`: partial()
 * keeps the defaults, so a publish toggle carrying only `{ isPublished }`
 * would also write `stock: 0`.
 */
const updateProductSchema = z.object(productFields).partial().strict();

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    let user = null;
    if (token) user = await verifyToken(token);
    
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const isPublished = searchParams.get('isPublished');
    const isFeatured = searchParams.get('isFeatured');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const orderBy = searchParams.get('orderBy') || 'createdAt';
    const orderDirection = searchParams.get('orderDirection') || 'desc';
    
    const where: any = {};
    if (storeId) where.storeId = storeId;
    else if (user) where.storeId = user.storeId;
    if (categoryId) where.categoryId = categoryId;
    if (isPublished !== null) where.isPublished = isPublished === 'true';
    else if (!user) where.isPublished = true;
    if (isFeatured !== null) where.isFeatured = isFeatured === 'true';
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
    
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { [orderBy]: orderDirection },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          category: true,
        },
      }),
      prisma.product.count({ where }),
    ]);
    
    return NextResponse.json({
      success: true,
      products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureUploadDir();
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await verifyToken(token);
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    
    const formData = await request.formData();
    const productData: Record<string, any> = {};
    const images: File[] = [];
    
    const entries = Array.from(formData.entries());
    for (const [key, value] of entries) {
      if (key === 'images' && value instanceof File) {
        images.push(value);
      } else {
        productData[key] = value;
      }
    }
    
    const validation = createProductSchema.safeParse(productData);
    if (!validation.success) return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    
    const existingProduct = await prisma.product.findFirst({
      where: { storeId: user.storeId, slug: validation.data.slug },
    });
    if (existingProduct) return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    
    const imageUrls: string[] = [];
    for (const image of images) {
      if (image.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Image too large' }, { status: 400 });
      const filename = generateFilename(image.name);
      const url = await saveFile(image, filename);
      imageUrls.push(url);
    }
    
    const product = await prisma.product.create({
      data: {
        storeId: user.storeId,
        ...validation.data,
        images: {
          create: imageUrls.map((url, index) => ({
            url,
            altText: formData.get(`imageAltText_${index}`) as string || '',
            isPrimary: index === 0,
            order: index,
          })),
        },
      },
      include: { images: true, category: true },
    });

    // A new listing must be crawlable before the ISR window expires.
    await revalidateProduct(user.storeId, product.slug);

    // Audited after the write, never inside it: logAuditAction swallows its own
    // failures so a logging problem can never fail a save that succeeded.
    await auditProductCreated(
      product.id,
      user.id,
      user.storeId,
      {
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        sellingPrice: product.sellingPrice,
        stock: product.stock,
        isPublished: product.isPublished,
      },
      getIPAddress(request)
    );

    return NextResponse.json({ success: true, product });
  } catch (error) {
    const duplicate = uniqueViolationMessage(error);
    if (duplicate) {
      return NextResponse.json({ error: duplicate }, { status: 400 });
    }
    return NextResponse.json({ error: 'Create failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  // Hoisted so the catch block can still name the row that failed.
  let productId: string | undefined;
  let storeId: string | undefined;
  try {
    await ensureUploadDir();
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await verifyToken(token);
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    
    storeId = user.storeId;

    const formData = await request.formData();
    productId = formData.get('id') as string;
    const productData: Record<string, any> = {};
    const images: File[] = [];
    const deletedImageIds: string[] = [];
    
    const entries = Array.from(formData.entries());
    for (const [key, value] of entries) {
      if (key === 'id') continue;
      else if (key === 'images' && value instanceof File) images.push(value);
      else if (key.startsWith('deleteImage_')) deletedImageIds.push(value as string);
      else productData[key] = value;
    }
    
    if (!productId) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

    const validation = updateProductSchema.safeParse(productData);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.errors }, { status: 400 });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });
    if (!existingProduct) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    if (existingProduct.storeId !== user.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    
    for (const imageId of deletedImageIds) {
      const image = existingProduct.images.find(img => img.id === imageId);
      if (!image) continue;
      await removeUploadedFile(image.url);
      // Deliberately outside the file cleanup: an image hosted elsewhere has
      // no local file to unlink, and pairing the two used to mean the row
      // survived whenever the unlink threw.
      await prisma.productImage.delete({ where: { id: imageId } });
    }
    
    const newImageUrls: string[] = [];
    for (const image of images) {
      if (image.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Image too large' }, { status: 400 });
      const filename = generateFilename(image.name);
      const url = await saveFile(image, filename);
      newImageUrls.push(url);
    }
    
    const product = await prisma.product.update({
      // storeId is repeated here on purpose: the ownership check above is the
      // explicit 403, this is the write itself refusing to cross tenants.
      where: { id: productId, storeId: user.storeId },
      data: {
        ...validation.data,
        images: {
          create: newImageUrls.map((url, index) => ({
            url,
            altText: formData.get(`imageAltText_${index}`) as string || '',
            isPrimary: index === 0,
            order: existingProduct.images.length + index,
          })),
        },
      },
      include: { images: true, category: true },
    });

    // Pass the old slug too: a rename has to purge the URL it used to live at,
    // otherwise the stale page keeps being served from the cache.
    await revalidateProduct(user.storeId, product.slug, existingProduct.slug);

    // Record only the fields this request actually touched — a full before/after
    // dump would bury the change in noise.
    const before = Object.fromEntries(
      Object.keys(validation.data).map((key) => [
        key,
        (existingProduct as Record<string, unknown>)[key],
      ])
    );
    await auditProductUpdated(
      productId,
      user.id,
      user.storeId,
      before,
      validation.data,
      getIPAddress(request)
    );

    return NextResponse.json({ success: true, product });
  } catch (error) {
    const duplicate = uniqueViolationMessage(error);
    if (duplicate) {
      return NextResponse.json({ error: duplicate }, { status: 400 });
    }

    logger.error(
      'Product update failed',
      { productId, storeId },
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await verifyToken(token);
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    
    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    
    const product = await prisma.product.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    if (product.storeId !== user.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    
    for (const image of product.images) {
      try {
        const filePath = join(UPLOAD_DIR, image.url.replace('/uploads/', ''));
        await import('fs/promises').then(fs => fs.unlink(filePath));
      } catch {}
    }
    
    await prisma.product.delete({ where: { id } });
    await revalidateProduct(user.storeId, product.slug);

    // The row is gone, so this snapshot is the only record of what it was.
    await auditProductDeleted(
      product.id,
      user.id,
      user.storeId,
      {
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        sellingPrice: product.sellingPrice,
        stock: product.stock,
        isPublished: product.isPublished,
      },
      getIPAddress(request)
    );

    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
