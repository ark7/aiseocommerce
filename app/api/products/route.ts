import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { z } from 'zod';

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

const createProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  basePrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  discountPrice: z.number().min(0).optional(),
  sku: z.string().optional(),
  categoryId: z.string().optional(),
  stock: z.number().min(0).default(0),
  minStock: z.number().min(0).default(0),
  isPublished: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
});

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
    
    for (const [key, value] of formData.entries()) {
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
    
    return NextResponse.json({ success: true, product });
  } catch (error) {
    return NextResponse.json({ error: 'Create failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureUploadDir();
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await verifyToken(token);
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    
    const formData = await request.formData();
    const productId = formData.get('id') as string;
    const productData: Record<string, any> = {};
    const images: File[] = [];
    const deletedImageIds: string[] = [];
    
    for (const [key, value] of formData.entries()) {
      if (key === 'id') continue;
      else if (key === 'images' && value instanceof File) images.push(value);
      else if (key.startsWith('deleteImage_')) deletedImageIds.push(value as string);
      else productData[key] = value;
    }
    
    if (!productId) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });
    if (!existingProduct) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    if (existingProduct.storeId !== user.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    
    for (const imageId of deletedImageIds) {
      const image = existingProduct.images.find(img => img.id === imageId);
      if (image) {
        try {
          const filePath = join(UPLOAD_DIR, image.url.replace('/uploads/', ''));
          await import('fs/promises').then(fs => fs.unlink(filePath));
          await prisma.productImage.delete({ where: { id: imageId } });
        } catch {}
      }
    }
    
    const newImageUrls: string[] = [];
    for (const image of images) {
      if (image.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Image too large' }, { status: 400 });
      const filename = generateFilename(image.name);
      const url = await saveFile(image, filename);
      newImageUrls.push(url);
    }
    
    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ...productData,
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
    
    return NextResponse.json({ success: true, product });
  } catch (error) {
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
    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
