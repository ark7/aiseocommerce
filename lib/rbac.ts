import { NextRequest, NextResponse } from 'next/server';
import { requireUser, UserPayload } from './auth';

export type PermissionKey =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'orders'
  | 'customers'
  | 'finance'
  | 'promo'
  | 'cms'
  | 'articles'
  | 'analytics'
  | 'settings'
  | 'staff';

export interface MenuPermission {
  key: PermissionKey;
  label: string;
  description: string;
  path: string;
  category: 'core' | 'catalog' | 'sales' | 'content' | 'admin';
}

export const ALL_MENU_PERMISSIONS: MenuPermission[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'Ringkasan statistik, omset cepat, dan aktivitas toko',
    path: '/admin',
    category: 'core',
  },
  {
    key: 'products',
    label: 'Produk & Stok',
    description: 'Katalog produk, kelola stok, variasi & harga jual',
    path: '/admin/products',
    category: 'catalog',
  },
  {
    key: 'categories',
    label: 'Kategori Produk',
    description: 'Struktur kategori dan hierarki katalog',
    path: '/admin/categories',
    category: 'catalog',
  },
  {
    key: 'orders',
    label: 'Pesanan & Resi',
    description: 'Kelola status pesanan, update no. resi, dan bukti bayar',
    path: '/admin/orders',
    category: 'sales',
  },
  {
    key: 'customers',
    label: 'Data Pelanggan',
    description: 'Daftar pembeli, kontak, dan riwayat pesanan',
    path: '/admin/customers',
    category: 'sales',
  },
  {
    key: 'finance',
    label: 'Keuangan & Kas',
    description: 'Buku kas besar, pencatatan beban/biaya, petty cash & omset',
    path: '/admin/finance',
    category: 'sales',
  },
  {
    key: 'promo',
    label: 'Promo & Voucher',
    description: 'Diskon kupon promo, voucher belanja pelanggan',
    path: '/admin/promo',
    category: 'sales',
  },
  {
    key: 'cms',
    label: 'CMS Landing Page',
    description: 'Builder landing page, hero banner, dan layout beranda',
    path: '/admin/cms',
    category: 'content',
  },
  {
    key: 'articles',
    label: 'Artikel & SEO',
    description: 'Publikasi blog toko dan optimasi SEO organik',
    path: '/admin/articles',
    category: 'content',
  },
  {
    key: 'analytics',
    label: 'Laporan & Analitik',
    description: 'Funnel konversi, tren penjualan, analisa anomali',
    path: '/admin/analytics',
    category: 'core',
  },
  {
    key: 'settings',
    label: 'Pengaturan Toko',
    description: 'Identitas toko, payment gateway, domain, AI & notifikasi',
    path: '/admin/settings',
    category: 'admin',
  },
  {
    key: 'staff',
    label: 'Manajemen Staf',
    description: 'Kelola akun staf dan delegasi hak akses menu toko',
    path: '/admin/staff',
    category: 'admin',
  },
];

export interface RolePreset {
  id: string;
  name: string;
  description: string;
  badgeColor: string;
  permissions: PermissionKey[];
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    id: 'ADMIN',
    name: 'Administrator (Owner)',
    description: 'Akses penuh ke seluruh menu dan pengaturan sistem',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    permissions: [
      'dashboard',
      'products',
      'categories',
      'orders',
      'customers',
      'finance',
      'promo',
      'cms',
      'articles',
      'analytics',
      'settings',
      'staff',
    ],
  },
  {
    id: 'MANAGER',
    name: 'Manajer Operasional',
    description: 'Mengelola operasional harian, katalog, dan pesanan',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    permissions: [
      'dashboard',
      'products',
      'categories',
      'orders',
      'customers',
      'promo',
      'cms',
      'articles',
      'analytics',
    ],
  },
  {
    id: 'CS',
    name: 'Customer Service (CS)',
    description: 'Verifikasi pesanan, tangani komplain, dan data pelanggan',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    permissions: ['dashboard', 'orders', 'customers'],
  },
  {
    id: 'WAREHOUSE',
    name: 'Staf Gudang & Logistik',
    description: 'Kelola stok fisik produk, cetak label, dan input resi pesanan',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    permissions: ['dashboard', 'products', 'orders'],
  },
  {
    id: 'FINANCE',
    name: 'Staf Keuangan / Akuntan',
    description: 'Catat kas masuk/keluar, buku kas, petty cash, dan omset pesanan',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    permissions: ['dashboard', 'finance', 'orders'],
  },
  {
    id: 'MARKETING',
    name: 'Marketing & Konten',
    description: 'Kelola CMS halaman, artikel SEO, kupon diskon, dan analitik',
    badgeColor: 'bg-pink-100 text-pink-800 border-pink-200',
    permissions: ['dashboard', 'cms', 'articles', 'promo', 'analytics'],
  },
];

/**
 * Normalizes user permissions from array or JSON string.
 */
export function normalizePermissions(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((p) => typeof p === 'string');
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((p) => typeof p === 'string');
      }
    } catch {
      return [raw];
    }
  }
  return [];
}

/**
 * Evaluates whether a user has permission for a specific module key.
 * ADMIN role automatically has bypass permission for all modules.
 */
export function hasPermission(
  user: { role?: string; permissions?: unknown } | null | undefined,
  requiredKey: string
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role !== 'STAFF') return false;

  const perms = normalizePermissions(user.permissions);
  if (perms.includes('*')) return true;
  return perms.includes(requiredKey);
}

/**
 * Maps a given admin pathname to its corresponding permission key.
 */
export function getRequiredPermissionForPath(pathname: string): PermissionKey | null {
  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '');

  if (cleanPath === '/admin') return 'dashboard';
  if (cleanPath.startsWith('/admin/products')) return 'products';
  if (cleanPath.startsWith('/admin/categories')) return 'categories';
  if (cleanPath.startsWith('/admin/orders')) return 'orders';
  if (cleanPath.startsWith('/admin/customers')) return 'customers';
  if (cleanPath.startsWith('/admin/finance')) return 'finance';
  if (cleanPath.startsWith('/admin/promo')) return 'promo';
  if (cleanPath.startsWith('/admin/cms')) return 'cms';
  if (cleanPath.startsWith('/admin/articles')) return 'articles';
  if (cleanPath.startsWith('/admin/analytics') || cleanPath.startsWith('/admin/funnel')) return 'analytics';
  if (cleanPath.startsWith('/admin/settings') || cleanPath.startsWith('/admin/system')) return 'settings';
  if (cleanPath.startsWith('/admin/staff')) return 'staff';

  return null;
}

/**
 * Evaluates whether a user can access a specific /admin/* path.
 */
export function canAccessPath(
  user: { role?: string; permissions?: unknown } | null | undefined,
  pathname: string
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role !== 'STAFF') return false;

  const required = getRequiredPermissionForPath(pathname);
  if (!required) {
    // If not a recognized admin module, allow by default if user is staff
    return true;
  }

  // Staff management is strictly ADMIN only or if explicitly granted staff permission
  if (required === 'staff') {
    return hasPermission(user, 'staff');
  }

  return hasPermission(user, required);
}

/**
 * Server-side guard for API routes.
 * Usage:
 * const auth = await requirePermission(request, 'products');
 * if (!auth.authorized) return auth.response;
 * const { user } = auth;
 */
export async function requirePermission(
  request: NextRequest | Request,
  requiredKey: PermissionKey
): Promise<
  | { authorized: true; user: UserPayload }
  | { authorized: false; response: NextResponse }
> {
  const user = await requireUser(request);
  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (!hasPermission(user, requiredKey)) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          error: 'Akses Ditolak',
          message: `Anda tidak memiliki izin akses untuk modul '${requiredKey}'.`,
        },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, user };
}

