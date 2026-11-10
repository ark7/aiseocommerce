import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const DEMO_STORE_ID = 'demo-store-001';
export const DEMO_DOMAINS = ['demo.larismanis.online', 'demo-store.local'];

export const DEMO_READ_ONLY_MESSAGE =
  'Aksi dibatasi pada Akun Demo: Mode pratinjau hanya-baca (Read-Only). Pada website toko Anda, seluruh fungsi CRUD beroperasi normal 100%.';

export const DEMO_PASSWORD_LOCKED_MESSAGE =
  'Password akun demo bersifat tetap ("password") agar selalu dapat diakses oleh calon pengguna lain. Pada website toko Anda, Anda bebas mengganti dan mereset password.';

export const DEMO_FILE_UPLOAD_LOCKED_MESSAGE =
  'Fitur upload berkas dinonaktifkan pada Akun Demo untuk menjaga kapasitas penyimpanan server. Pada website toko Anda, seluruh fitur upload gambar & bukti transfer beroperasi normal 100%.';

/**
 * Memeriksa apakah suatu alamat email tergolong akun demo bersama bawaan seeder.
 */
export function isDemoEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return (
    normalized.endsWith('@demo-store.local') ||
    normalized === 'admin@demo-store.local' ||
    normalized === 'staff@demo-store.local'
  );
}

/**
 * Memeriksa apakah suatu toko merupakan toko demo (Read-Only CRUD).
 * Toko klien produksi nyata akan mengembalikan false.
 */
export async function isDemoStore(storeId?: string | null): Promise<boolean> {
  if (!storeId) return false;
  if (storeId === DEMO_STORE_ID) return true;

  try {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { domain: true, isDemo: true },
    });

    if (!store) return false;
    if (store.isDemo === true) return true;
    if (store.domain && DEMO_DOMAINS.includes(store.domain.toLowerCase().trim())) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Menghasilkan respon HTTP 403 terstandarisasi saat aksi mutasi diblokir di mode demo.
 */
export function createDemoReadOnlyResponse(customMessage?: string) {
  return NextResponse.json(
    {
      error: customMessage || DEMO_READ_ONLY_MESSAGE,
      isDemoRestricted: true,
    },
    { status: 403 }
  );
}

/**
 * Menghasilkan respon HTTP 403 terstandarisasi saat upload berkas diblokir di mode demo.
 */
export function createDemoUploadBlockedResponse(customMessage?: string) {
  return NextResponse.json(
    {
      error: customMessage || DEMO_FILE_UPLOAD_LOCKED_MESSAGE,
      code: 'DEMO_FILE_UPLOAD_LOCKED',
      isDemoRestricted: true,
      isFileUploadBlocked: true,
    },
    { status: 403 }
  );
}

/**
 * Error khusus untuk menandai pelanggaran operasi tulis pada mode demo.
 */
export class DemoReadOnlyError extends Error {
  statusCode: number;
  constructor(message: string = DEMO_READ_ONLY_MESSAGE) {
    super(message);
    this.name = 'DemoReadOnlyError';
    this.statusCode = 403;
  }
}

/**
 * Memastikan toko bukan toko demo sebelum melanjutkan operasi tulis / CRUD.
 * Melemparkan DemoReadOnlyError jika toko adalah toko demo.
 */
export async function assertNotDemoStore(storeId?: string | null, customMessage?: string): Promise<void> {
  const isDemo = await isDemoStore(storeId);
  if (isDemo) {
    throw new DemoReadOnlyError(customMessage || DEMO_READ_ONLY_MESSAGE);
  }
}
