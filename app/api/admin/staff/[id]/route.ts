import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, hashPassword } from '@/lib/auth';
import { hasPermission, normalizePermissions } from '@/lib/rbac';
import { z } from 'zod';

const updateStaffSchema = z.object({
  firstName: z.string().min(1, 'Nama depan wajib diisi').optional(),
  lastName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6, 'Password minimal 6 karakter').optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN' && !hasPermission(user, 'staff')) {
      return NextResponse.json({ error: 'Akses Ditolak' }, { status: 403 });
    }

    const { id } = await params;

    const staff = await prisma.user.findFirst({
      where: {
        id,
        storeId: user.storeId,
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
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staf tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      staff: {
        ...staff,
        permissions: normalizePermissions(staff.permissions),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Gagal mengambil data staf', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN' && !hasPermission(user, 'staff')) {
      return NextResponse.json({ error: 'Akses Ditolak' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updateStaffSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: validation.error.format() },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        storeId: user.storeId,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Staf tidak ditemukan' }, { status: 404 });
    }

    // Only ADMIN can modify another ADMIN
    if (targetUser.role === 'ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Akses Ditolak', message: 'Hanya Administrator yang dapat mengubah data Administrator.' },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (validation.data.firstName !== undefined) updateData.firstName = validation.data.firstName.trim();
    if (validation.data.lastName !== undefined) updateData.lastName = validation.data.lastName?.trim() || null;
    if (validation.data.phone !== undefined) updateData.phone = validation.data.phone?.trim() || null;
    if (validation.data.title !== undefined) updateData.title = validation.data.title?.trim() || null;
    if (validation.data.permissions !== undefined) updateData.permissions = validation.data.permissions;
    if (validation.data.isActive !== undefined) {
      // Prevent user from deactivating themselves
      if (targetUser.id === user.id && validation.data.isActive === false) {
        return NextResponse.json(
          { error: 'Anda tidak dapat menonaktifkan akun Anda sendiri.' },
          { status: 400 }
        );
      }
      updateData.isActive = validation.data.isActive;
    }

    if (validation.data.password) {
      updateData.passwordHash = await hashPassword(validation.data.password);
    }

    const updated = await prisma.user.update({
      where: { id: targetUser.id },
      data: updateData,
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
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Data staf berhasil diperbarui',
      staff: {
        ...updated,
        permissions: normalizePermissions(updated.permissions),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Gagal memperbarui staf', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Akses Ditolak', message: 'Hanya Administrator yang dapat menghapus staf.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (id === user.id) {
      return NextResponse.json(
        { error: 'Operasi Ditolak', message: 'Anda tidak dapat menghapus akun Anda sendiri.' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        storeId: user.storeId,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Staf tidak ditemukan' }, { status: 404 });
    }

    // Try hard delete, fallback to deactivation if related records exist
    try {
      await prisma.user.delete({
        where: { id: targetUser.id },
      });
      return NextResponse.json({
        success: true,
        message: 'Akun staf berhasil dihapus secara permanen.',
      });
    } catch {
      await prisma.user.update({
        where: { id: targetUser.id },
        data: { isActive: false },
      });
      return NextResponse.json({
        success: true,
        message: 'Akun staf dinonaktifkan karena memiliki riwayat data terkait.',
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Gagal menghapus staf', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

