'use client';

import { useState, useEffect, useCallback } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
}

const EMPTY_FORM = { name: '', slug: '', description: '', parentId: '' };

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : null;
  }, []);

  const load = useCallback(async () => {
    const headers = authHeaders();
    if (!headers) {
      setError('Anda harus login terlebih dahulu');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/categories', { headers });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Gagal memuat kategori');
      setCategories(data.categories ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat kategori');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      parentId: category.parentId ?? '',
    });
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const headers = authHeaders();
    if (!headers) {
      setError('Anda harus login terlebih dahulu');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const editing = Boolean(editingId);
      const response = await fetch('/api/categories', {
        method: editing ? 'PATCH' : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editing
            ? { id: editingId, ...form, parentId: form.parentId || undefined }
            : { ...form, parentId: form.parentId || undefined }
        ),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menyimpan kategori');

      setNotice(editing ? 'Kategori diperbarui.' : 'Kategori ditambahkan.');
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan kategori');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Hapus kategori "${category.name}"?`)) return;

    const headers = authHeaders();
    if (!headers) return;

    setError(null);
    setNotice(null);

    try {
      const response = await fetch('/api/categories', {
        method: 'DELETE',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: category.id }),
      });

      const data = await response.json();
      // The API refuses while products or subcategories still point here, and
      // its message is the useful one — show it rather than a generic failure.
      if (!response.ok) throw new Error(data.error || 'Gagal menghapus kategori');

      setNotice('Kategori dihapus.');
      if (editingId === category.id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus kategori');
    }
  };

  const parentName = (parentId: string | null) =>
    categories.find((category) => category.id === parentId)?.name ?? '—';

  // ponytail: only blocks a category from being its own parent. Deeper cycles
  // are already allowed by the API; add a chain walk when a cycle actually
  // breaks the storefront.
  const parentOptions = categories.filter((category) => category.id !== editingId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kategori</h1>
        <p className="text-gray-500 mt-1">Kelola kategori yang dipakai untuk mengelompokkan produk</p>
      </div>

      {notice && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700">{notice}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow border space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {editingId ? 'Ubah Kategori' : 'Tambah Kategori'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">
              Nama Kategori *
            </label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  name: event.target.value,
                  // Auto-fill the slug only while creating, so renaming an
                  // existing category never silently rewrites a live URL.
                  slug: editingId ? prev.slug : toSlug(event.target.value),
                }))
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Rumah Tangga"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="slug">
              Slug *
            </label>
            <input
              id="slug"
              type="text"
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="rumah-tangga"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="parentId">
              Induk Kategori
            </label>
            <select
              id="parentId"
              value={form.parentId}
              onChange={(event) => setForm((prev) => ({ ...prev, parentId: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Tanpa induk</option>
              {parentOptions.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">
              Deskripsi
            </label>
            <input
              id="description"
              type="text"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Kategori untuk peralatan masak"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Batal
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Kategori'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-lg shadow border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Daftar Kategori{' '}
            {categories.length > 0 && <span className="text-gray-400 font-normal">({categories.length})</span>}
          </h2>
        </div>

        {loading ? (
          <div className="p-6 flex items-center space-x-3">
            <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-gray-500">Memuat kategori...</span>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">Belum ada kategori. Tambahkan yang pertama di form atas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Induk</th>
                  <th className="px-4 py-3 font-medium">Deskripsi</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-t">
                    <td className="px-4 py-3 font-medium text-gray-900">{category.name}</td>
                    <td className="px-4 py-3 text-gray-500">{category.slug}</td>
                    <td className="px-4 py-3 text-gray-500">{parentName(category.parentId)}</td>
                    <td className="px-4 py-3 text-gray-500">{category.description || '—'}</td>
                    <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => startEdit(category)}
                        className="text-indigo-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(category)}
                        className="text-red-600 hover:underline"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
