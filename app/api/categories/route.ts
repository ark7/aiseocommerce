import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  parentId: z.string().optional(),
});

const updateCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  parentId: z.string().optional(),
});

// GET all categories
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    let user = null;
    if (token) user = await verifyToken(token);
    
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const parentId = searchParams.get('parentId');
    const includeProducts = searchParams.get('includeProducts') === 'true';
    
    const where: any = {};
    if (storeId) where.storeId = storeId;
    else if (user) where.storeId = user.storeId;
    if (parentId) where.parentId = parentId;
    else where.parentId = null; // Only top-level categories by default
    
    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        children: includeProducts ? { include: { products: true } } : true,
        ...(includeProducts ? { products: true } : {}),
      },
    });
    
    return NextResponse.json({ success: true, categories });
  } catch (error) {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}

// POST - Create new category
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await verifyToken(token);
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    
    const body = await request.json();
    const validation = createCategorySchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    
    const { name, slug, description, parentId } = validation.data;
    
    // Check if slug already exists
    const existingCategory = await prisma.category.findFirst({
      where: { storeId: user.storeId, slug },
    });
    if (existingCategory) return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    
    // Check if parent exists and belongs to same store
    if (parentId) {
      const parentCategory = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parentCategory) return NextResponse.json({ error: 'Parent category not found' }, { status: 404 });
      if (parentCategory.storeId !== user.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const category = await prisma.category.create({
      data: {
        storeId: user.storeId,
        name,
        slug,
        description,
        parentId,
      },
    });
    
    return NextResponse.json({ success: true, category });
  } catch (error) {
    return NextResponse.json({ error: 'Create failed' }, { status: 500 });
  }
}

// PATCH - Update category
export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await verifyToken(token);
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    
    const body = await request.json();
    const validation = updateCategorySchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    
    const { id, ...data } = validation.data;
    
    // Check if category exists and belongs to user
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    if (category.storeId !== user.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    
    // Check if new slug conflicts
    if (data.slug) {
      const existingCategory = await prisma.category.findFirst({
        where: { storeId: user.storeId, slug: data.slug, id: { not: id } },
      });
      if (existingCategory) return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }
    
    const updatedCategory = await prisma.category.update({
      where: { id },
      data,
    });
    
    return NextResponse.json({ success: true, category: updatedCategory });
  } catch (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

// DELETE - Delete category
export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await verifyToken(token);
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    
    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'Category ID required' }, { status: 400 });
    
    // Check if category exists and belongs to user
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    if (category.storeId !== user.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    
    // Check if category has products
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) return NextResponse.json({ error: 'Cannot delete category with products' }, { status: 400 });
    
    // Check if category has children
    const childrenCount = await prisma.category.count({ where: { parentId: id } });
    if (childrenCount > 0) return NextResponse.json({ error: 'Cannot delete category with subcategories' }, { status: 400 });
    
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
