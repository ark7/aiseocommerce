import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { isDemoStore, createDemoUploadBlockedResponse } from '@/lib/demoGuard';
import { dispatchPaymentProofNotification } from '@/lib/orderNotificationService';
import { savePaymentProofFile } from '@/lib/paymentStorage';

const MAX_FILE_SIZE = 2 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    
    const formData = await request.formData();
    const orderId = formData.get('orderId') as string;
    const proofFile = formData.get('proof') as File;
    
    if (!orderId || !proofFile) {
      return NextResponse.json({ error: 'orderId and proof required' }, { status: 400 });
    }
    
    if (proofFile.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 });
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];
    if (proofFile.type && !allowedMimeTypes.includes(proofFile.type)) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Harap unggah gambar (JPG, PNG, WebP) atau PDF.' },
        { status: 400 }
      );
    }
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.storeId !== user.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    if (user.role === 'CUSTOMER' && order.userId && order.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized: Pesanan bukan milik akun Anda' }, { status: 403 });
    }

    // Demo store guard: block physical file uploads on demo stores
    if (await isDemoStore(order.storeId)) {
      return createDemoUploadBlockedResponse(
        'Unggah bukti transfer dinonaktifkan pada Akun Demo untuk menjaga penyimpanan server. Pesanan demo Anda tetap tersimpan dan tercatat di sistem.'
      );
    }
    
    if (order.status !== 'PENDING' && order.status !== 'MANUAL_VERIFICATION') {
      return NextResponse.json(
        { error: 'Order is not waiting for payment' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await proofFile.arrayBuffer());
    const proofData = buffer.toString('base64');

    // /api/checkout already created a PENDING payment for this order, so attach
    // the proof to it instead of trying to create a second one.
    const existingPayment = await prisma.payment.findFirst({ where: { orderId } });
    const paymentId = existingPayment?.id || randomUUID();

    // Save proof to local filesystem in store-isolated directory (storage/proofs/{storeId}/)
    const savedFile = await savePaymentProofFile({
      storeId: order.storeId,
      paymentId,
      buffer,
      originalFilename: proofFile.name,
      mimeType: proofFile.type,
    });

    const fileInfo = {
      name: proofFile.name,
      type: proofFile.type,
      size: proofFile.size,
      filename: savedFile.filename,
      storagePath: savedFile.relativePath,
      storeId: order.storeId,
    };

    const paymentData = {
      method: 'MANUAL' as const,
      amount: order.totalAmount,
      proofData,
      proofFile: JSON.stringify(fileInfo),
      status: 'PENDING' as const,
    };

    const [savedPayment] = await prisma.$transaction([
      existingPayment
        ? prisma.payment.update({ where: { id: existingPayment.id }, data: paymentData })
        : prisma.payment.create({ data: { id: paymentId, orderId, ...paymentData } }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: 'MANUAL_VERIFICATION' },
      }),
      prisma.auditLog.create({
        data: {
          storeId: user.storeId,
          userId: user.id,
          action: 'MANUAL_PAYMENT_UPLOAD',
          entityType: 'Order',
          entityId: orderId,
          newValue: JSON.stringify({ fileInfo, amount: order.totalAmount }),
        },
      }),
    ]);

    dispatchPaymentProofNotification(savedPayment.id);
    
    return NextResponse.json({
      success: true,
      message: 'Payment proof uploaded. Waiting for verification.',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });
    
    const payment = await prisma.payment.findFirst({
      where: { orderId },
      include: { order: { select: { id: true, status: true, totalAmount: true } } },
    });
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    
    return NextResponse.json({ payment, order: payment.order });
  } catch (error) {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
