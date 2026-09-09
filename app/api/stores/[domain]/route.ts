import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    const store = await prisma.store.findUnique({
      where: { domain },
      include: {
        settings: true,
        products: {
          where: { isPublished: true },
          take: 8,
          orderBy: { createdAt: 'desc' },
          include: { images: { where: { isPrimary: true }, take: 1 } },
        },
        categories: { where: { parentId: null }, take: 10 },
      },
    });
    
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    
    const [featuredProducts, totalProducts, totalCategories] = await Promise.all([
      prisma.product.findMany({
        where: { storeId: store.id, isPublished: true, isFeatured: true },
        take: 4,
        include: { images: { where: { isPrimary: true }, take: 1 } },
      }),
      prisma.product.count({ where: { storeId: store.id, isPublished: true } }),
      prisma.category.count({ where: { storeId: store.id } }),
    ]);
    
    return NextResponse.json({
      success: true,
      store: {
        id: store.id,
        name: store.name,
        domain: store.domain,
        logo: store.logo,
        address: store.address,
        phone: store.phone,
        email: store.email,
        settings: store.settings,
        statistics: { totalProducts, totalCategories },
      },
      featuredProducts,
      recentProducts: store.products,
      categories: store.categories,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await verifyToken(token);
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    
    const store = await prisma.store.findUnique({ where: { domain } });
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    if (store.id !== user.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    
    const body = await request.json();
    const updatedStore = await prisma.store.update({
      where: { id: store.id },
      data: { name: body.name, logo: body.logo, address: body.address, phone: body.phone, email: body.email },
    });
    
    return NextResponse.json({ success: true, store: updatedStore });
  } catch (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
