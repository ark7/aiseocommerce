import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { getFinanceSummary } from '@/services/transactionService';

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
    const period = searchParams.get('period') || 'month';
    const now = new Date();
    let start: Date | undefined, end: Date | undefined;
    
    switch (period) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek;
        start = new Date(now.getFullYear(), now.getMonth(), diff);
        end = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
    }
    
    const summary = await getFinanceSummary(user.storeId, start, end);
    
    const [recentTransactions, lowStockProducts, pendingPayments, todaySales] = await Promise.all([
      prisma.ledger.findMany({
        where: { storeId: user.storeId, createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, type: true, amount: true, description: true, category: true, createdAt: true },
      }),
      prisma.product.count({ where: { storeId: user.storeId, stock: { lte: 5 }, isPublished: true } }),
      prisma.payment.count({ where: { order: { storeId: user.storeId }, method: 'MANUAL', status: 'PENDING' } }),
      prisma.order.aggregate({
        where: { storeId: user.storeId, status: 'PAID', createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
    ]);
    
    return NextResponse.json({
      success: true,
      summary,
      recentTransactions,
      alerts: { lowStockProducts, pendingPayments },
      todaySales: { count: todaySales._count._all, amount: todaySales._sum.totalAmount || 0 },
      period: { start: start?.toISOString(), end: end?.toISOString() },
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
        userId: user.id,
      },
    });
    
    return NextResponse.json({ success: true, ledger });
  } catch (error) {
    return NextResponse.json({ error: 'Create failed' }, { status: 500 });
  }
}
