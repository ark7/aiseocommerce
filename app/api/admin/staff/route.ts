import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, hashPassword } from '@/lib/auth';
import { hasPermission, normalizePermissions, ALL_MENU_PERMISSIONS } from '@/lib/rbac';
import { z } from 'zod';

const createStaffSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  firstName: z.string().min(1, 'Nama depan wajib diisi'),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  permissions: z.array(z.string()).default([]),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN or users with 'staff' permission can view staff list
    if (user.role !== 'ADMIN' && !hasPermission(user, 'staff')) {
      return NextResponse.json(
        { error: 'Akses Ditolak', message: 'Hanya Administrator yang dapat mengakses manajemen staf.' },
        { status: 403 }
      );
    }

    const staffMembers = await prisma.user.findMany({
      where: {
        storeId: user.storeId,
        role: { in: ['STAFF', 'ADMIN'] },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        title: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { role: 'asc' }, // ADMIN first
        { createdAt: 'desc' },
      ],
    });

    const formattedStaff = staffMembers.map((s) => ({
      ...s,
      permissions: normalizePermissions(s.permissions),
    }));

    return NextResponse.json({
      success: true,
      staff: formattedStaff,
      availablePermissions: ALL_MENU_PERMISSIONS,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Gagal mengambil daftar staf', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can create staff accounts
    if (user.role !== 'ADMIN' && !hasPermission(user, 'staff')) {
      return NextResponse.json(
        { error: 'Akses Ditolak', message: 'Hanya Administrator yang dapat membuat akun staf.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createStaffSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, phone, title, permissions } = validation.data;

    // Check existing email within the same store
    const existing = await prisma.user.findFirst({
      where: {
        storeId: user.storeId,
        email: email.trim().toLowerCase(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar untuk toko ini' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newStaff = await prisma.user.create({
      data: {
        storeId: user.storeId,
        email: email.trim().toLowerCase(),
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName?.trim() || null,
        phone: phone?.trim() || null,
        title: title?.trim() || 'Staf Toko',
        role: 'STAFF',
        permissions: permissions,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        title: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Akun staf berhasil dibuat',
        staff: {
          ...newStaff,
          permissions: normalizePermissions(newStaff.permissions),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Gagal membuat akun staf', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

