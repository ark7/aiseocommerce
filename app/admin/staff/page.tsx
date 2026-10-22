'use client';

import { useState, useEffect } from 'react';
import { ALL_MENU_PERMISSIONS, ROLE_PRESETS, PermissionKey, MenuPermission } from '@/lib/rbac';

interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  title?: string | null;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  permissions: string[];
  isActive: boolean;
  createdAt: string;
}

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/staff', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Gagal memuat daftar staf');
      }
      setStaffList(data.staff || []);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const openCreateModal = () => {
    setEditingStaff(null);
    setFormEmail('');
    setFormPassword('');
    setFormFirstName('');
    setFormLastName('');
    setFormPhone('');
    setFormTitle('Staf Operasional');
    setFormPermissions(['dashboard', 'products', 'orders']);
    setFormIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (staff: StaffUser) => {
    setEditingStaff(staff);
    setFormEmail(staff.email);
    setFormPassword('');
    setFormFirstName(staff.firstName || '');
    setFormLastName(staff.lastName || '');
    setFormPhone(staff.phone || '');
    setFormTitle(staff.title || '');
    setFormPermissions(staff.permissions || []);
    setFormIsActive(staff.isActive);
    setFormError(null);
    setModalOpen(true);
  };

  const handleApplyPreset = (presetPerms: PermissionKey[]) => {
    setFormPermissions(presetPerms);
  };

  const togglePermission = (key: string) => {
    if (formPermissions.includes(key)) {
      setFormPermissions(formPermissions.filter((p) => p !== key));
    } else {
      setFormPermissions([...formPermissions, key]);
    }
  };

  const handleSelectAll = () => {
    setFormPermissions(ALL_MENU_PERMISSIONS.map((m) => m.key));
  };

  const handleDeselectAll = () => {
    setFormPermissions([]);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const token = localStorage.getItem('token');

    try {
      if (!editingStaff) {
        // Create new staff
        if (!formPassword || formPassword.length < 6) {
          throw new Error('Password wajib diisi minimal 6 karakter.');
        }

        const res = await fetch('/api/admin/staff', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: formEmail,
            password: formPassword,
            firstName: formFirstName,
            lastName: formLastName,
            phone: formPhone,
            title: formTitle,
            permissions: formPermissions,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || data.error || 'Gagal menambahkan staf.');
        }

        setSuccessMessage('Staf baru berhasil ditambahkan!');
      } else {
        // Update existing staff
        const payload: any = {
          firstName: formFirstName,
          lastName: formLastName,
          phone: formPhone,
          title: formTitle,
          permissions: formPermissions,
          isActive: formIsActive,
        };

        if (formPassword && formPassword.trim().length >= 6) {
          payload.password = formPassword.trim();
        }

        const res = await fetch(`/api/admin/staff/${editingStaff.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || data.error || 'Gagal memperbarui staf.');
        }

        setSuccessMessage('Data staf dan hak akses berhasil diperbarui!');
      }

      setModalOpen(false);
      fetchStaff();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Gagal menghapus staf.');
      }
      setSuccessMessage(data.message || 'Staf berhasil dihapus.');
      setDeleteConfirmId(null);
      fetchStaff();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus staf');
    }
  };

  // Group permissions by category
  const categoriesMap: Record<string, { title: string; items: MenuPermission[] }> = {
    core: { title: 'Dasar & Analisis', items: [] },
    catalog: { title: 'Katalog & Inventaris', items: [] },
    sales: { title: 'Penjualan, Pesanan & Keuangan', items: [] },
    content: { title: 'Konten, CMS & SEO', items: [] },
    admin: { title: 'Pengaturan & Administrator', items: [] },
  };

  ALL_MENU_PERMISSIONS.forEach((perm) => {
    if (categoriesMap[perm.category]) {
      categoriesMap[perm.category].items.push(perm);
    }
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <span>👥</span>
            <span>Manajemen Staf & Akses Menu (RBAC)</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Delegasikan akses menu dan wewenang fitur toko kepada staf sesuai dengan pembagian tugas operasional.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm"
        >
          <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Staf Baru
        </button>
      </div>

      {/* Notification Alerts */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <span>✅</span>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 text-xs">✕</button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl font-bold">
            👥
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{staffList.length}</div>
            <div className="text-xs text-gray-500">Total Akun Pengelola</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-xl font-bold">
            👑
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {staffList.filter((s) => s.role === 'ADMIN').length}
            </div>
            <div className="text-xs text-gray-500">Pemilik Toko (Owner)</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl font-bold">
            💼
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {staffList.filter((s) => s.role === 'STAFF').length}
            </div>
            <div className="text-xs text-gray-500">Staf Terdelegasi</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl font-bold">
            🛡️
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {staffList.filter((s) => s.isActive).length}
            </div>
            <div className="text-xs text-gray-500">Akun Aktif</div>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 text-base">Daftar Akun Pengelola Toko</h2>
          <span className="text-xs text-gray-500">{staffList.length} Pengguna</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
            Memuat daftar staf...
          </div>
        ) : staffList.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-base font-medium text-gray-700">Belum ada akun staf yang didaftarkan</p>
            <p className="text-sm mt-1">Klik tombol &quot;Tambah Staf Baru&quot; untuk mulai mendelegasikan akses menu.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Nama & Posisi</th>
                  <th className="px-6 py-3.5">Email & Kontak</th>
                  <th className="px-6 py-3.5">Peran</th>
                  <th className="px-6 py-3.5">Izin Menu Terdelegasi</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {staffList.map((staff) => {
                  const isOwner = staff.role === 'ADMIN';
                  return (
                    <tr key={staff.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${isOwner ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {staff.firstName?.[0] || 'U'}
                            {staff.lastName?.[0] || ''}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {staff.firstName} {staff.lastName || ''}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">
                              {isOwner ? 'Pemilik Toko (Full Access)' : (staff.title || 'Staf Toko')}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-mono text-xs text-gray-800">{staff.email}</div>
                        {staff.phone && <div className="text-xs text-gray-500">{staff.phone}</div>}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isOwner ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}`}>
                          {isOwner ? '👑 Owner (Admin)' : '💼 Staf Toko'}
                        </span>
                      </td>

                      <td className="px-6 py-4 max-w-xs">
                        {isOwner ? (
                          <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded-md border border-purple-100">
                            Semua Menu (Bypass)
                          </span>
                        ) : staff.permissions.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">Tidak ada izin aktif</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {staff.permissions.slice(0, 4).map((pKey) => {
                              const item = ALL_MENU_PERMISSIONS.find((m) => m.key === pKey);
                              return (
                                <span
                                  key={pKey}
                                  className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-700 text-[11px] font-medium rounded"
                                >
                                  {item ? item.label : pKey}
                                </span>
                              );
                            })}
                            {staff.permissions.length > 4 && (
                              <span className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-semibold rounded">
                                +{staff.permissions.length - 4} lainnya
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${staff.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {staff.isActive ? '● Aktif' : '○ Nonaktif'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openEditModal(staff)}
                            className="px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                          >
                            Edit Izin
                          </button>
                          {!isOwner && (
                            <>
                              {deleteConfirmId === staff.id ? (
                                <div className="inline-flex items-center space-x-1">
                                  <button
                                    onClick={() => handleDeleteStaff(staff.id)}
                                    className="px-2 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded transition"
                                  >
                                    Ya, Hapus
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(staff.id)}
                                  className="px-2.5 py-1 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                                >
                                  Hapus
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah / Edit Staf */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {editingStaff ? 'Edit Data & Hak Akses Staf' : 'Tambah Akun Staf Baru'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tentukan profil staf dan centang modul menu yang diizinkan untuk dibuka.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveStaff} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                  ⚠️ {formError}
                </div>
              )}

              {/* Data Identitas */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  1. Informasi Profil Staf
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Nama Depan <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formFirstName}
                      onChange={(e) => setFormFirstName(e.target.value)}
                      placeholder="Contoh: Budi"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nama Belakang</label>
                    <input
                      type="text"
                      value={formLastName}
                      onChange={(e) => setFormLastName(e.target.value)}
                      placeholder="Contoh: Santoso"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email Login <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      disabled={!!editingStaff}
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="staf@tokosaya.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Jabatan / Posisi Staf
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Contoh: Customer Support / Admin Gudang"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {editingStaff ? 'Reset Password (Opsional)' : 'Password Login *'}
                    </label>
                    <input
                      type="password"
                      required={!editingStaff}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={editingStaff ? 'Kosongkan jika tidak diubah' : 'Minimal 6 karakter'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">No. WhatsApp / HP</label>
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="0812xxxxxxx"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {editingStaff && (
                  <div className="mt-3 flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="formIsActive"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="formIsActive" className="text-xs font-medium text-gray-700">
                      Akun Staf Aktif (Beri tanda centang agar staf dapat login)
                    </label>
                  </div>
                )}
              </div>

              {/* Template Cepat (Presets) */}
              <div className="border-t border-gray-100 pt-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    2. Pilihan Cepat Template Peran (Presets)
                  </h4>
                  <div className="space-x-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-indigo-600 hover:underline font-medium"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-gray-500 hover:underline font-medium"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ROLE_PRESETS.map((preset) => (
                    <button
                      type="button"
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset.permissions)}
                      className="p-2.5 border border-gray-200 rounded-xl text-left hover:border-indigo-400 hover:bg-indigo-50/40 transition group"
                    >
                      <div className="font-semibold text-xs text-gray-800 group-hover:text-indigo-600">
                        {preset.name}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                        {preset.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Checklist Hak Akses Modul */}
              <div className="border-t border-gray-100 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    3. Kustomisasi Hak Akses Menu ({formPermissions.length} dari {ALL_MENU_PERMISSIONS.length} Menu)
                  </h4>
                </div>

                <div className="space-y-4">
                  {Object.entries(categoriesMap).map(([catKey, category]) => (
                    <div key={catKey} className="bg-gray-50/60 p-3.5 rounded-xl border border-gray-100">
                      <div className="text-xs font-bold text-gray-700 mb-2.5">
                        {category.title}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {category.items.map((menu) => {
                          const isChecked = formPermissions.includes(menu.key);
                          return (
                            <label
                              key={menu.key}
                              className={`flex items-start space-x-2.5 p-2 rounded-lg cursor-pointer transition border ${isChecked ? 'bg-white border-indigo-200 shadow-xs' : 'border-transparent hover:bg-white/60'}`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => togglePermission(menu.key)}
                                className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-gray-900 flex items-center justify-between">
                                  <span>{menu.label}</span>
                                  <span className="text-[10px] text-gray-400 font-mono font-normal">{menu.path}</span>
                                </div>
                                <div className="text-[11px] text-gray-500 leading-tight mt-0.5">
                                  {menu.description}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="border-t border-gray-100 pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
                >
                  {saving ? 'Menyimpan...' : editingStaff ? 'Perbarui Akses Staf' : 'Buat Akun Staf'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

