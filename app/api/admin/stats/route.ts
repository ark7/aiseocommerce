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
    
    const [
      productsCount,
      ordersCount,
      customersCount,
      pendingOrdersCount,
      paidOrders,
    ] = await Promise.all([
      prisma.product.count({ where: { storeId: user.storeId } }),
      prisma.order.count({ where: { storeId: user.storeId } }),
      prisma.user.count({ 
        where: { storeId: user.storeId, role: 'CUSTOMER' } 
      }),
      prisma.order.count({ 
        where: { storeId: user.storeId, status: 'PENDING' } 
      }),
      prisma.order.findMany({
        where: { storeId: user.storeId, status: 'PAID' },
      }),
    ]);
    
    const revenue = paidOrders.reduce((sum, order: any) => sum + (order.total || 0), 0);
    
    const stats = {
      products: productsCount,
      orders: ordersCount,
      customers: customersCount,
      revenue: revenue,
      pendingOrders: pendingOrdersCount,
    };
    
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
