'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface DailyTrendItem {
  date: string;
  views: number;
  visitors: number;
}

interface TopPathItem {
  path: string;
  count: number;
}

interface TopReferrerItem {
  referrer: string;
  count: number;
}

interface UsageAnalyticsData {
  windowDays: number;
  totalViews: number;
  uniqueVisitors: number;
  dailyTrend: DailyTrendItem[];
  topPaths: TopPathItem[];
  topReferrers: TopReferrerItem[];
  deviceTotals: {
    mobile?: number;
    desktop?: number;
    tablet?: number;
  };
}

const WINDOWS = [7, 30, 90];

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<UsageAnalyticsData | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Anda harus login terlebih dahulu');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics/usage?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Gagal memuat analitik penggunaan');
      }

      setData(resData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat analitik');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const maxViewsInTrend = data?.dailyTrend?.reduce((max, d) => Math.max(max, d.views), 1) || 1;
  const totalDeviceHits =
    (data?.deviceTotals?.mobile || 0) +
    (data?.deviceTotals?.desktop || 0) +
    (data?.deviceTotals?.tablet || 0) || 1;

  const mobilePercent = Math.round(((data?.deviceTotals?.mobile || 0) / totalDeviceHits) * 100);
  const desktopPercent = Math.round(((data?.deviceTotals?.desktop || 0) / totalDeviceHits) * 100);
  const tabletPercent = Math.round(((data?.deviceTotals?.tablet || 0) / totalDeviceHits) * 100);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analitik & Tren Trafik</h1>
          <p className="text-sm text-gray-500 mt-1">
            Pantau performa kunjungan toko, halaman terpopuler, sumber traffic, dan perilaku pengunjung.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/funnel"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            Lihat Funnel Produk &rarr;
          </Link>
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            {WINDOWS.map((window) => (
              <button
                key={window}
                onClick={() => setDays(window)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  days === window
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {window} Hari
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchAnalytics}
            className="underline font-semibold text-xs ml-4 hover:text-red-900"
          >
            Coba lagi
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent mb-4"></div>
          <p className="text-sm text-gray-500">Memuat data analitik...</p>
        </div>
      ) : data ? (
        <div className="mt-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Tayangan Halaman (Pageviews)
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-gray-900">
                  {data.totalViews.toLocaleString('id-ID')}
                </span>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {days} hari terakhir
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Pengunjung Unik (Unique Visitors)
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-gray-900">
                  {data.uniqueVisitors.toLocaleString('id-ID')}
                </span>
                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  Browser Sid
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Rata-rata View / Pengunjung
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-gray-900">
                  {data.uniqueVisitors > 0
                    ? (data.totalViews / data.uniqueVisitors).toFixed(1)
                    : '0'}
                </span>
                <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                  Halaman / Sesi
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Top Referrer Utama
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-lg font-bold text-gray-900 truncate max-w-[180px]">
                  {data.topReferrers[0]?.referrer || 'Direct / Langsung'}
                </span>
                <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                  {data.topReferrers[0]?.count || 0} hits
                </span>
              </div>
            </div>
          </div>

          {/* Daily Trend Chart (CSS Native Bar Chart) */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-gray-900">Tren Kunjungan Harian</h2>
                <p className="text-xs text-gray-500">Perbandingan jumlah views harian pada periode terpilih</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-indigo-600 rounded"></span>
                  <span>Pageviews</span>
                </div>
              </div>
            </div>

            {data.dailyTrend.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">
                Belum ada data kunjungan yang tercatat pada rentang waktu ini.
              </div>
            ) : (
              <div className="h-48 flex items-end gap-2 pt-6 pb-2 px-2 overflow-x-auto">
                {data.dailyTrend.map((item) => {
                  const heightPercent = Math.max(8, Math.round((item.views / maxViewsInTrend) * 100));
                  const shortDate = item.date.slice(5); // MM-DD
                  return (
                    <div
                      key={item.date}
                      className="flex-1 min-w-[32px] flex flex-col items-center gap-2 group relative h-full justify-end"
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[11px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10 shadow-lg">
                        {item.date}: {item.views} views
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-indigo-500 hover:bg-indigo-600 rounded-t-lg transition-all"
                      ></div>
                      <span className="text-[10px] text-gray-400 font-medium tracking-tight">
                        {shortDate}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Details Grid: Top Pages & Referrers & Devices */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Visited Pages */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-1">Halaman Terpopuler (Top Pages)</h2>
              <p className="text-xs text-gray-500 mb-4">Halaman yang paling sering dibuka oleh pengunjung toko</p>

              {data.topPaths.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">Belum ada kunjungan tercatat</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {data.topPaths.map((item, idx) => {
                    const pct = data.totalViews > 0 ? Math.round((item.count / data.totalViews) * 100) : 0;
                    return (
                      <div key={item.path} className="py-3 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3 truncate pr-4">
                          <span className="w-5 text-xs font-bold text-gray-400">{idx + 1}</span>
                          <span className="font-mono text-xs text-gray-800 truncate" title={item.path}>
                            {item.path}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="w-20 bg-gray-100 rounded-full h-1.5 hidden sm:block">
                            <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="font-semibold text-gray-900 text-xs w-12 text-right">
                            {item.count.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Device & Referrer Column */}
            <div className="space-y-6">
              {/* Device Breakdown */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 mb-1">Perangkat Pengunjung</h2>
                <p className="text-xs text-gray-500 mb-4">Distribusi platform yang dipakai pembeli</p>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                      <span>📱 Mobile</span>
                      <span>{mobilePercent}% ({data.deviceTotals.mobile || 0})</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${mobilePercent}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                      <span>💻 Desktop</span>
                      <span>{desktopPercent}% ({data.deviceTotals.desktop || 0})</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${desktopPercent}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                      <span>📟 Tablet</span>
                      <span>{tabletPercent}% ({data.deviceTotals.tablet || 0})</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${tabletPercent}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Referrers */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 mb-1">Sumber Kunjungan (Referrers)</h2>
                <p className="text-xs text-gray-500 mb-4">Asal lalu lintas yang masuk ke toko</p>

                {data.topReferrers.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">Langsung / Direct traffic</p>
                ) : (
                  <div className="space-y-2">
                    {data.topReferrers.map((ref) => (
                      <div key={ref.referrer} className="flex justify-between text-xs py-1 border-b border-gray-50">
                        <span className="truncate pr-2 text-gray-700 font-medium">
                          {ref.referrer.startsWith('http') ? new URL(ref.referrer).hostname : ref.referrer}
                        </span>
                        <span className="font-semibold text-gray-900 flex-shrink-0">{ref.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

