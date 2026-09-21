'use client';

import { useState, useEffect, useCallback } from 'react';

interface AnalyticsForm {
  googleTagId: string;
  tiktokPixelId: string;
  facebookPixelId: string;
  instagramAccountId: string;
  youtubeChannelId: string;
}

const EMPTY_FORM: AnalyticsForm = {
  googleTagId: '',
  tiktokPixelId: '',
  facebookPixelId: '',
  instagramAccountId: '',
  youtubeChannelId: '',
};

const FIELDS: { key: keyof AnalyticsForm; label: string; hint: string; placeholder: string }[] = [
  {
    key: 'googleTagId',
    label: 'Google Tag / GA4 / GTM',
    hint: 'Untuk Google Analytics 4, Google Ads, atau Google Tag Manager.',
    placeholder: 'G-ABCDE12345 atau GTM-ABCDE12',
  },
  {
    key: 'tiktokPixelId',
    label: 'TikTok Pixel',
    hint: 'Pixel TikTok Shop / TikTok Ads — kanal sosial commerce terbesar di Indonesia.',
    placeholder: 'C1A2B3D4E5F6G7H8',
  },
  {
    key: 'facebookPixelId',
    label: 'Meta (Facebook) Pixel',
    hint: 'Pixel Meta untuk iklan Facebook dan Instagram.',
    placeholder: '123456789012345',
  },
  {
    key: 'instagramAccountId',
    label: 'Instagram',
    hint: 'Username Instagram toko, tanpa tanda @.',
    placeholder: 'tokosaya',
  },
  {
    key: 'youtubeChannelId',
    label: 'YouTube Channel ID',
    hint: 'Channel ID YouTube (diawali UC), bukan nama channel.',
    placeholder: 'UCxxxxxxxxxxxxxxxxxxxxxx',
  },
];

/** Drop empty values so a cleared field removes the tag instead of storing "". */
function toPayload(form: AnalyticsForm): Record<string, string> {
  return Object.fromEntries(
    Object.entries(form)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value !== '')
  );
}

export default function AdminAnalyticsSettingsPage() {
  const [form, setForm] = useState<AnalyticsForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : null;
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = authHeaders();
      if (!headers) {
        setError('Anda harus login terlebih dahulu');
        return;
      }

      const response = await fetch('/api/admin/settings/analytics', { headers });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal memuat pengaturan analytics');
      }

      const data = await response.json();
      setForm({ ...EMPTY_FORM, ...(data.analytics || {}) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengaturan analytics');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const headers = authHeaders();
      if (!headers) throw new Error('Anda harus login terlebih dahulu');

      const response = await fetch('/api/admin/settings/analytics', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(toPayload(form)),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menyimpan pengaturan analytics');
      }

      setNotice('Pengaturan analytics disimpan. Tag akan aktif di storefront.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan analytics');
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof AnalyticsForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics &amp; Google Tag</h1>
      <p className="text-sm text-gray-500 mb-6">
        Sambungkan storefront ke Google Tag dan kanal sosial media. ID yang kosong berarti tag tidak
        dipasang.
      </p>

      {error && <div className="mb-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {notice && <div className="mb-4 bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">{notice}</div>}

      {loading ? (
        <div className="text-center text-gray-500 py-12">Memuat pengaturan...</div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow border space-y-5">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label htmlFor={field.key} className="block text-sm font-medium text-gray-900">
                {field.label}
              </label>
              <input
                id={field.key}
                type="text"
                value={form[field.key]}
                onChange={(event) => update(field.key, event.target.value)}
                placeholder={field.placeholder}
                className="mt-1 w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">{field.hint}</p>
            </div>
          ))}

          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </form>
      )}
    </div>
  );
}
