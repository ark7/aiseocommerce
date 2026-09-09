import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { auditPaymentVerified } from '@/services/auditService';
import { getIPAddress } from '@/middleware';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const ip = getIPAddress(request);
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await verifyToken(token);
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    
    const body = await request.json();
    const { paymentId, action } = body;
    if (!paymentId || !action) return NextResponse.json({ error: 'paymentId and action required' }, { status: 400 });
    if (!['APPROVE', 'REJECT'].includes(action.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    if (payment.order.storeId !== user.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    if (payment.method !== 'MANUAL') return NextResponse.json({ error: 'Only manual payments' }, { status: 400 });
    if (payment.status !== 'PENDING') return NextResponse.json({ error: 'Already processed' }, { status: 400 });
    
    const actionType = action.toUpperCase() as 'APPROVE' | 'REJECT';
    const newStatus = actionType === 'APPROVE' ? 'PAID' : 'FAILED';
    
    if (actionType === 'APPROVE') {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: paymentId },
          data: { status: 'PAID', verifiedById: user.id, verifiedAt: new Date() },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: { status: 'PAID' },
        }),
      ]);
      
      // Log audit
      await auditPaymentVerified(
        paymentId,
        user.id,
        user.storeId,
        'APPROVE',
        'PENDING',
        'PAID',
        ip
      );
      
      return NextResponse.json({ success: true, message: 'Payment approved', payment: { id: payment.id, status: 'PAID' } });
    } else {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'FAILED', verifiedById: user.id, verifiedAt: new Date() },
      });
      
      // Log audit
      await auditPaymentVerified(
        paymentId,
        user.id,
        user.storeId,
        'REJECT',
        'PENDING',
        'FAILED',
        ip
      );
      
      return NextResponse.json({ success: true, message: 'Payment rejected', payment: { id: payment.id, status: 'FAILED' } });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: {
          order: { storeId: user.storeId },
          method: 'MANUAL',
          status: status.toUpperCase() as any,
        },
        select: {
          id: true,
          orderId: true,
          method: true,
          amount: true,
          status: true,
          proofFile: true,
          createdAt: true,
          updatedAt: true,
          verifiedById: true,
          verifiedAt: true,
          verifiedBy: { select: { id: true, firstName: true, lastName: true } },
          order: { 
            select: { 
              id: true, 
              status: true, 
              totalAmount: true,
              orderNumber: true,
              customerName: true,
              customerEmail: true,
              orderItems: { 
                select: { 
                  id: true, 
                  productId: true, 
                  quantity: true, 
                  totalPrice: true,
                  product: { select: { id: true, name: true, sellingPrice: true } }
                } 
              }
            } 
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({
        where: {
          order: { storeId: user.storeId },
          method: 'MANUAL',
          status: status.toUpperCase() as any,
        },
      }),
    ]);
    
    return NextResponse.json({
      success: true,
      payments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
