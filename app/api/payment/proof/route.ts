import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  readPaymentProofFile,
  ensureProofOnDisk,
} from '@/lib/paymentStorage';

interface ProofFileInfo {
  name?: string;
  type?: string;
  size?: number;
  filename?: string;
  storagePath?: string;
  storeId?: string;
}

function parseProofFileInfo(rawProofFile: string | null): ProofFileInfo | null {
  if (!rawProofFile) return null;
  try {
    return JSON.parse(rawProofFile);
  } catch {
    return { name: rawProofFile, type: 'image/jpeg' };
  }
}

function generateDemoReceiptSvg(orderNumber: string, amount: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="none">
    <rect width="600" height="400" rx="16" fill="#F8FAFC"/>
    <rect x="24" y="24" width="552" height="352" rx="12" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
    <circle cx="300" cy="76" r="28" fill="#10B981" fill-opacity="0.1"/>
    <path d="M290 76L297 83L310 70" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="300" y="126" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="bold" fill="#0F172A">BUKTI TRANSFER BERHASIL</text>
    <text x="300" y="148" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#64748B">BANK MANDIRI / BCA VIRTUAL ACCOUNT</text>
    <line x1="56" y1="170" x2="544" y2="170" stroke="#E2E8F0" stroke-dasharray="6 6"/>
    <text x="56" y="206" font-family="sans-serif" font-size="13" fill="#64748B">Nomor Pesanan</text>
    <text x="544" y="206" text-anchor="end" font-family="sans-serif" font-size="13" font-weight="600" fill="#0F172A">${orderNumber}</text>
    <text x="56" y="242" font-family="sans-serif" font-size="13" fill="#64748B">Total Pembayaran</text>
    <text x="544" y="242" text-anchor="end" font-family="sans-serif" font-size="16" font-weight="bold" fill="#4F46E5">Rp ${amount.toLocaleString('id-ID')}</text>
    <text x="56" y="278" font-family="sans-serif" font-size="13" fill="#64748B">Waktu Transaksi</text>
    <text x="544" y="278" text-anchor="end" font-family="sans-serif" font-size="13" fill="#0F172A">${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</text>
    <text x="56" y="314" font-family="sans-serif" font-size="13" fill="#64748B">Status Verifikasi</text>
    <text x="544" y="314" text-anchor="end" font-family="sans-serif" font-size="13" font-weight="600" fill="#10B981">MENUNGGU KONFIRMASI ADMIN</text>
    <rect x="56" y="336" width="488" height="24" rx="4" fill="#F1F5F9"/>
    <text x="300" y="352" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#64748B">Simulasi Bukti Transfer Resmi Sistem E-Commerce</text>
  </svg>`;
}

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
        proofUrl: true,
        method: true,
        order: { select: { storeId: true, userId: true, orderNumber: true, totalAmount: true } },
      },
    });

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    if (payment.order.storeId !== user.storeId) return NextResponse.json({ error: 'Unauthorized: Toko tidak sesuai' }, { status: 403 });
    if (user.role === 'CUSTOMER' && payment.order.userId && payment.order.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized: Pesanan bukan milik akun Anda' }, { status: 403 });
    }

    const fileInfo = parseProofFileInfo(payment.proofFile);

    // 1. Try reading directly from store's isolated disk directory (storage/proofs/{storeId}/)
    if (fileInfo?.filename) {
      try {
        const fileOnDisk = await readPaymentProofFile({
          storeId: payment.order.storeId,
          filename: fileInfo.filename,
        });

        if (fileOnDisk) {
          return NextResponse.json({
            success: true,
            paymentId: payment.id,
            orderId: payment.orderId,
            proofData: fileOnDisk.buffer.toString('base64'),
            proofUrl: payment.proofUrl || null,
            fileInfo: {
              ...fileInfo,
              type: fileOnDisk.mimeType || fileInfo.type,
              size: fileOnDisk.size || fileInfo.size,
            },
            source: 'disk',
          });
        }
      } catch (err) {
        // If security exception (e.g. path traversal), reject immediately
        if (err instanceof Error && err.message.includes('Path traversal')) {
          return NextResponse.json({ error: 'Forbidden: Invalid file path' }, { status: 403 });
        }
      }
    }

    // 2. If proofData exists in DB but not on disk, save to disk now (automatic migration) and return base64
    if (payment.proofData) {
      // Auto-sync to disk if missing
      try {
        const saved = await ensureProofOnDisk({
          storeId: payment.order.storeId,
          paymentId: payment.id,
          proofData: payment.proofData,
          originalFilename: fileInfo?.name || 'bukti-transfer.jpg',
          mimeType: fileInfo?.type || 'image/jpeg',
        });
        if (saved && (!fileInfo?.filename || fileInfo.filename !== saved.filename)) {
          const updatedFileInfo = {
            ...fileInfo,
            filename: saved.filename,
            storagePath: saved.relativePath,
            storeId: payment.order.storeId,
          };
          await prisma.payment.update({
            where: { id: payment.id },
            data: { proofFile: JSON.stringify(updatedFileInfo) },
          }).catch(() => {});
        }
      } catch {
        // Fallback to serving proofData directly
      }

      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        orderId: payment.orderId,
        proofData: payment.proofData,
        proofUrl: payment.proofUrl || null,
        fileInfo,
        source: 'database',
      });
    }

    // 3. If proofUrl exists (external/seed URL), return proofUrl
    if (payment.proofUrl) {
      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        orderId: payment.orderId,
        proofData: null,
        proofUrl: payment.proofUrl,
        fileInfo,
        source: 'url',
      });
    }

    // 4. Fallback: If it's a demo payment without proofData/proofUrl, generate a demo transfer receipt SVG
    if (payment.id.startsWith('demo-payment-') || payment.method === 'MANUAL') {
      const demoSvg = generateDemoReceiptSvg(payment.order.orderNumber, payment.order.totalAmount);
      const demoBase64 = Buffer.from(demoSvg).toString('base64');
      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        orderId: payment.orderId,
        proofData: demoBase64,
        proofUrl: null,
        fileInfo: { name: 'demo-receipt.svg', type: 'image/svg+xml' },
        source: 'demo-fallback',
      });
    }

    return NextResponse.json({ error: 'Bukti bayar tidak tersedia' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
