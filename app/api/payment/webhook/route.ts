import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordOrderIncome } from '@/services/transactionService';
import { resolveGatewayCredentials } from '@/lib/paymentGateway';
import crypto from 'crypto';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const FLIP_SECRET_KEY = process.env.FLIP_SECRET_KEY || '';

function verifyMidtransSignature(
  requestBody: string,
  signatureKey: string,
  serverKey: string = MIDTRANS_SERVER_KEY
): boolean {
  try {
    const expectedSignature = crypto
      .createHash('sha512')
      .update(requestBody + serverKey)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signatureKey), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

function verifyFlipSignature(
  payload: any,
  signature: string,
  secretKey: string = FLIP_SECRET_KEY
): boolean {
  try {
    const data = JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(data)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

async function getRawBody(request: Request): Promise<string> {
  const chunks = [];
  const reader = request.body?.getReader();
  if (!reader) return '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  
  const chunksAll = new Uint8Array(chunks.reduce((a, b) => a + b.length, 0));
  let position = 0;
  for (const chunk of chunks) {
    chunksAll.set(chunk, position);
    position += chunk.length;
  }
  return new TextDecoder().decode(chunksAll);
}

export async function POST(request: Request) {
  try {
    const rawBody = await getRawBody(request);
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    
    const gateway = request.headers.get('x-gateway') || payload.gateway || payload.source;
    if (!gateway || !['midtrans', 'flip'].includes(gateway.toLowerCase())) {
      return NextResponse.json({ error: 'Unsupported gateway' }, { status: 400 });
    }
    
    const signature = request.headers.get('x-signature') || request.headers.get('x-signature-key') || payload.signature;
    if (!signature) return NextResponse.json({ error: 'Signature required' }, { status: 401 });

    // Which key signs this callback depends on whether the order is a sandbox
    // one, so the order is read before the signature is checked. The id is
    // untrusted until the signature passes: nothing from this lookup is
    // returned to the caller, and a failed check answers the same 401 whether
    // or not the order exists.
    const candidateOrderId =
      gateway.toLowerCase() === 'midtrans'
        ? payload.order_id
        : payload.order_id || payload.external_id;
    const sandboxOrder = candidateOrderId
      ? await prisma.order.findUnique({
          where: { id: String(candidateOrderId) },
          select: { isSandbox: true, store: { select: { settings: true } } },
        })
      : null;

    // Sandbox orders are verified only against sandbox keys; everything else
    // keeps the production keys exactly as before.
    const sandboxKeys = sandboxOrder?.isSandbox
      ? resolveGatewayCredentials(sandboxOrder.store?.settings, true)
      : null;

    let isValid = false;
    if (gateway.toLowerCase() === 'midtrans') {
      isValid = sandboxKeys
        ? !!sandboxKeys.midtrans.serverKey &&
          verifyMidtransSignature(rawBody, signature, sandboxKeys.midtrans.serverKey)
        : verifyMidtransSignature(rawBody, signature);
    } else if (gateway.toLowerCase() === 'flip') {
      isValid = sandboxKeys
        ? !!sandboxKeys.flip.apiKey && verifyFlipSignature(payload, signature, sandboxKeys.flip.apiKey)
        : verifyFlipSignature(payload, signature);
    }
    
    if (!isValid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    
    let result: { orderId: string; status: string; transactionId: string } | null = null;
    
    if (gateway.toLowerCase() === 'midtrans') {
      const orderId = payload.order_id;
      const transactionStatus = payload.transaction_status;
      const transactionId = payload.transaction_id;
      if (!orderId || !transactionStatus) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
      
      let status = 'PENDING';
      if (transactionStatus === 'settlement') status = 'PAID';
      else if (['deny', 'expire', 'cancel'].includes(transactionStatus)) status = 'FAILED';
      
      result = { orderId, status, transactionId };
    } else {
      const orderId = payload.order_id || payload.external_id;
      const transactionStatus = payload.status;
      const transactionId = payload.id;
      if (!orderId || !transactionStatus) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
      
      let status = 'PENDING';
      if (['paid', 'completed'].includes(transactionStatus.toLowerCase())) status = 'PAID';
      else if (['failed', 'expired'].includes(transactionStatus.toLowerCase())) status = 'FAILED';
      
      result = { orderId, status, transactionId };
    }
    
    if (!result) return NextResponse.json({ error: 'Invalid result' }, { status: 400 });
    
    const order = await prisma.order.findUnique({
      where: { id: result.orderId },
      include: { payments: true }
    });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    
    const existingPayment = order.payments?.find((p: any) => p.transactionId === result.transactionId);
    if (existingPayment) return NextResponse.json({ success: true, message: 'Already processed' });
    
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          orderId: result.orderId,
          method: gateway.toUpperCase() as any,
          amount: order.totalAmount,
          transactionId: result.transactionId,
          gatewayResponse: JSON.stringify(payload),
          status: result.status as any,
          isSandbox: Boolean(order.isSandbox),
        },
      }),
      prisma.order.update({
        where: { id: result.orderId },
        data: { status: result.status === 'PAID' ? 'PAID' : 'PENDING' },
      }),
    ]);

    // A settled gateway payment has to reach the books, or finance shows the
    // order as paid and the money nowhere. Idempotent per order.
    if (result.status === 'PAID') {
      await recordOrderIncome(prisma, order);
    }

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      status: result.status,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Webhook endpoint',
    supportedGateways: ['midtrans', 'flip'],
  });
}
