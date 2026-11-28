import path from 'path';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isControlPlaneEnabled, requireSuperAdminOwner } from '@/lib/superAdminAuth';
import { readPaymentProofFile } from '@/lib/paymentStorage';

interface Context {
  params: { id: string };
}

export async function GET(request: Request, { params }: Context) {
  if (!isControlPlaneEnabled(request)) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const owner = requireSuperAdminOwner(request);
  if (!owner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payment = await prisma.subscriptionPayment.findUnique({
    where: { id: params.id },
  });

  if (!payment || !payment.proofRelativePath) {
    return NextResponse.json({ error: 'Berkas bukti bayar tidak ditemukan' }, { status: 404 });
  }

  const filename = path.basename(payment.proofRelativePath);
  const bucketDir = path.basename(path.dirname(payment.proofRelativePath)) || payment.storeId || 'license-orders';

  const file = await readPaymentProofFile({
    storeId: bucketDir,
    filename,
  });

  if (!file) {
    return NextResponse.json({ error: 'File fisik bukti bayar tidak ditemukan' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.buffer), {
    status: 200,
    headers: {
      'Content-Type': payment.proofMimeType || file.mimeType || 'image/jpeg',
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });
}
