import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = './public/uploads';
const MAX_FILE_SIZE = 2 * 1024 * 1024;

async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true }).catch(() => {});
}

function generateFilename(originalName: string): string {
  const ext = originalName.split('.').pop();
  return `${randomUUID()}.${ext}`;
}

async function saveFile(file: File, filename: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = join(UPLOAD_DIR, filename);
  await writeFile(filePath, buffer);
  return `/uploads/${filename}`;
}

export async function POST(request: Request) {
  try {
    await ensureUploadDir();
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
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.storeId !== user.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    
    const existingPayment = await prisma.payment.findFirst({ where: { orderId } });
    if (existingPayment) return NextResponse.json({ error: 'Payment already exists' }, { status: 400 });
    
    const filename = generateFilename(proofFile.name);
    const proofUrl = await saveFile(proofFile, filename);
    
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          orderId,
          method: 'MANUAL',
          amount: order.totalAmount,
          proofUrl,
          proofFile: filename,
          status: 'PENDING',
        },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: 'MANUAL_VERIFICATION' },
      }),
    ]);
    
    return NextResponse.json({
      success: true,
      message: 'Payment proof uploaded. Waiting for verification.',
      proofUrl,
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
