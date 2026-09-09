import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');
    if (!paymentId) return NextResponse.json({ error: 'paymentId required' }, { status: 400 });

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        orderId: true,
        proofData: true,
        proofFile: true,
        order: { select: { storeId: true } },
      },
    });

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    if (payment.order.storeId !== user.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    if (!payment.proofData) return NextResponse.json({ error: 'No proof data available' }, { status: 404 });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      orderId: payment.orderId,
      proofData: payment.proofData,
      fileInfo: payment.proofFile ? JSON.parse(payment.proofFile) : null,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
