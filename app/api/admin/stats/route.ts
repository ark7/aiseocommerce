import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { logger } from '@/lib/logger';

// Reads the Authorization header, so it can never be served statically. Without
// this Next tries anyway at build time and logs a dynamic-usage error.
export const dynamic = 'force-dynamic';

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
    
    // `totalAmount` is the column on Order; there is no `total`, so the old
    // read summed undefined and the dashboard showed Rp 0 forever.
    const revenue = paidOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    
    const stats = {
      products: productsCount,
      orders: ordersCount,
      customers: customersCount,
      revenue: revenue,
      pendingOrders: pendingOrdersCount,
    };
    
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    logger.error(
      'Failed to fetch stats',
      undefined,
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
