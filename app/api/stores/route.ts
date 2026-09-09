import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search');
    
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          domain: true,
          logo: true,
          address: true,
          phone: true,
          email: true,
          createdAt: true,
          _count: {
            select: {
              products: true,
              users: true,
              orders: true,
            },
          },
        },
      }),
      prisma.store.count({ where }),
    ]);
    
    return NextResponse.json({
      success: true,
      stores,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, domain, logo, address, phone, email, userEmail, userPassword, userFirstName, userLastName } = body;
    
    if (!name || !domain || !userEmail || !userPassword) {
      return NextResponse.json({ error: 'Name, domain, user email, and password are required' }, { status: 400 });
    }
    
    // Check if domain already exists
    const existingStore = await prisma.store.findUnique({ where: { domain } });
    if (existingStore) {
      return NextResponse.json({ error: 'Domain already exists' }, { status: 400 });
    }
    
    // Create store
    const store = await prisma.store.create({
      data: {
        name,
        domain,
        logo,
        address,
        phone,
        email,
      },
    });
    
    // Create admin user
    const hashedPassword = await import('bcryptjs').then(bcrypt => bcrypt.hash(userPassword, 12));
    const user = await prisma.user.create({
      data: {
        storeId: store.id,
        email: userEmail,
        passwordHash: hashedPassword,
        firstName: userFirstName || 'Admin',
        lastName: userLastName || '',
        role: 'ADMIN',
        isActive: true,
      },
    });
    
    return NextResponse.json({
      success: true,
      store,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        storeId: user.storeId,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Create failed' }, { status: 500 });
  }
}
