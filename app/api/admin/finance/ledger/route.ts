import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await verifyToken(token);
    if (!user || !['ADMIN', 'STAFF'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin/Staff access required' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    
    const where: any = { storeId: user.storeId };
    if (type) where.type = type;
    if (category) where.category = category;
    if (search) where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
    ];
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    const [entries, total, categorySummary] = await Promise.all([
      prisma.ledger.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ledger.count({ where }),
      prisma.ledger.groupBy({
        by: ['category'],
        where,
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);
    
    let runningBalance = 0;
    const entriesWithBalance = entries.map(entry => {
      runningBalance += entry.amount;
      return { ...entry, runningBalance };
    });
    
    return NextResponse.json({
      success: true,
      entries: entriesWithBalance,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      categorySummary,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await verifyToken(token);
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    
    const body = await request.json();
    const { type, amount, description, category } = body;
    if (!type || amount === undefined || !description) {
      return NextResponse.json({ error: 'type, amount, description required' }, { status: 400 });
    }
    
    const validTypes = ['INCOME', 'EXPENSE', 'PETTY_CASH', 'CAPITAL', 'LOAN', 'REFUND'];
    if (!validTypes.includes(type)) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    
    const ledger = await prisma.ledger.create({
      data: {
        storeId: user.storeId,
        type: type as any,
        amount: type === 'EXPENSE' ? -Math.abs(amount) : Math.abs(amount),
        description,
        category,
        referenceType: 'MANUAL',
      },
    });
    
    return NextResponse.json({ success: true, ledger });
  } catch (error) {
    return NextResponse.json({ error: 'Create failed' }, { status: 500 });
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
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    
    const ledger = await prisma.ledger.findUnique({ where: { id } });
    if (!ledger) return NextResponse.json({ error: 'Ledger not found' }, { status: 404 });
    if (ledger.storeId !== user.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    
    await prisma.ledger.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
