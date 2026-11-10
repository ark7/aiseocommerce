'use client';

import { useState, useEffect, useCallback } from 'react';

interface SystemErrorItem {
  id: string;
  storeId?: string | null;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  source: 'CLIENT_FRONTEND' | 'SERVER_API' | 'PAYMENT_WEBHOOK' | 'DATABASE' | 'BACKGROUND_JOB';
  message: string;
  stack?: string | null;
  path?: string | null;
  method?: string | null;
  statusCode?: number | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  context?: Record<string, unknown> | null;
  isResolved: boolean;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  createdAt: string;
}

export default function AdminSystemErrorsPage() {
  const [errors, setErrors] = useState<SystemErrorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [resolvedFilter, setResolvedFilter] = useState<string>('false');

  // Modal / Detail state
  const [selectedError, setSelectedError] = useState<SystemErrorItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchErrors = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setErrorMessage('Anda harus login terlebih dahulu');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
      });
      if (severityFilter) params.append('severity', severityFilter);
      if (sourceFilter) params.append('source', sourceFilter);
      if (resolvedFilter !== '') params.append('resolved', resolvedFilter);

      const response = await fetch(`/api/admin/errors?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memuat log error');

      setErrors(data.errors || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal memuat log error');
    } finally {
      setLoading(false);
    }
  }, [page, severityFilter, sourceFilter, resolvedFilter]);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  const handleResolve = async (id: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/errors', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ errorId: id }),
      });
      if (!res.ok) throw new Error('Gagal memperbarui status error');

      setErrors((prev) =>
        prev.map((e) => (e.id === id ? { ...e, isResolved: true, resolvedAt: new Date().toISOString() } : e))
      );
      if (selectedError?.id === id) {
        setSelectedError((prev) => (prev ? { ...prev, isResolved: true } : null));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setActionLoading(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="bg-red-100 text-red-700 font-bold px-2.5 py-0.5 rounded text-xs">CRITICAL</span>;
      case 'ERROR':
        return <span className="bg-orange-100 text-orange-700 font-semibold px-2.5 py-0.5 rounded text-xs">ERROR</span>;
      case 'WARN':
        return <span className="bg-amber-100 text-amber-700 font-medium px-2.5 py-0.5 rounded text-xs">WARN</span>;
      default:
        return <span className="bg-blue-100 text-blue-700 font-medium px-2.5 py-0.5 rounded text-xs">{sev}</span>;
    }
  };

  const getSourceBadge = (src: string) => {
    switch (src) {
      case 'PAYMENT_WEBHOOK':
        return <span className="bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded text-[11px]">Payment Webhook</span>;
      case 'CLIENT_FRONTEND':
        return <span className="bg-cyan-100 text-cyan-800 font-medium px-2 py-0.5 rounded text-[11px]">Browser / Frontend</span>;
      case 'SERVER_API':
        return <span className="bg-indigo-100 text-indigo-700 font-medium px-2 py-0.5 rounded text-[11px]">Server API</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 font-medium px-2 py-0.5 rounded text-[11px]">{src}</span>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pemantauan Error Runtime Live</h1>
          <p className="text-sm text-gray-500 mt-1">
            Pantau dan diagnosis insiden runtime frontend & backend yang dialami pembeli secara real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchErrors()}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>Segarkan</span>
            <span>⟳</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mt-6 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Status</label>
            <select
              value={resolvedFilter}
              onChange={(e) => {
                setResolvedFilter(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="false">Belum Selesai (Aktif)</option>
              <option value="true">Sudah Selesai</option>
              <option value="">Semua Status</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Tingkat Keparahan</label>
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Tingkat</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="ERROR">ERROR</option>
              <option value="WARN">WARN</option>
              <option value="INFO">INFO</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Sumber Insiden</label>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Sumber</option>
              <option value="CLIENT_FRONTEND">Browser / Frontend</option>
              <option value="SERVER_API">Server API</option>
              <option value="PAYMENT_WEBHOOK">Payment Webhook</option>
              <option value="DATABASE">Database</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Total ditemukan: <strong className="text-gray-900">{totalCount}</strong> insiden
        </div>
      </div>

      {errorMessage && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {errorMessage}
        </div>
      )}

      {/* Table / Error Cards */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-sm text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3"></div>
            <p>Memuat log error runtime...</p>
          </div>
        ) : errors.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              ✓
            </div>
            <h3 className="text-base font-bold text-gray-900">Tidak Ada Error Ditemukan</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Sistem berjalan dengan stabil dan tidak ada laporan insiden pada kriteria filter ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Tingkat / Sumber</th>
                  <th className="py-3 px-4">Pesan Error</th>
                  <th className="py-3 px-4">Path / Rute</th>
                  <th className="py-3 px-4">Waktu Kejadian</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {errors.map((err) => (
                  <tr key={err.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col items-start gap-1">
                        {getSeverityBadge(err.severity)}
                        {getSourceBadge(err.source)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-md">
                      <p className="font-semibold text-gray-900 line-clamp-2 font-mono text-[11px]">
                        {err.message}
                      </p>
                      {err.statusCode && (
                        <span className="text-[10px] text-gray-500">HTTP {err.statusCode}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-[11px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                        {err.path || '-'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-gray-500">
                      <div>{new Date(err.createdAt).toLocaleDateString('id-ID')}</div>
                      <div className="text-[10px] text-gray-400">
                        {new Date(err.createdAt).toLocaleTimeString('id-ID')}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {err.isResolved ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full text-[10px]">
                          ✓ Selesai
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700 font-semibold bg-red-50 px-2.5 py-1 rounded-full text-[10px]">
                          ● Belum Selesai
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedError(err)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-[11px] transition-colors"
                        >
                          Detail
                        </button>
                        {!err.isResolved && (
                          <button
                            onClick={() => handleResolve(err.id)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-[11px] transition-colors"
                          >
                            Tandai Selesai
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
            <div>
              Halaman {page} dari {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                &larr; Sebelumnya
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                Berikutnya &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Detail Error */}
      {selectedError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                {getSeverityBadge(selectedError.severity)}
                {getSourceBadge(selectedError.source)}
                <span className="text-xs text-gray-500">ID: {selectedError.id}</span>
              </div>
              <button
                onClick={() => setSelectedError(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Pesan Error:</label>
                <div className="p-3 bg-red-50 text-red-900 rounded-xl font-mono border border-red-200 break-words">
                  {selectedError.message}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Path:</span>
                  <p className="font-mono text-gray-900 truncate">{selectedError.path || '-'}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Status Code:</span>
                  <p className="font-mono text-gray-900">{selectedError.statusCode || '-'}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Waktu:</span>
                  <p className="text-gray-900">{new Date(selectedError.createdAt).toLocaleString('id-ID')}</p>
                </div>
              </div>

              {selectedError.userAgent && (
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Browser / User Agent:</label>
                  <p className="p-2 bg-gray-50 rounded-lg text-gray-600 font-mono text-[11px] break-all border">
                    {selectedError.userAgent}
                  </p>
                </div>
              )}

              {selectedError.stack && (
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Stack Trace:</label>
                  <pre className="p-3 bg-gray-900 text-gray-100 rounded-xl font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed">
                    {selectedError.stack}
                  </pre>
                </div>
              )}

              {selectedError.context && (
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Context Data:</label>
                  <pre className="p-3 bg-gray-50 rounded-xl font-mono text-[11px] overflow-x-auto border text-gray-800">
                    {JSON.stringify(selectedError.context, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                {selectedError.isResolved ? (
                  <span className="text-emerald-700 font-medium text-xs">
                    Telah diselesaikan oleh {selectedError.resolvedBy || 'admin'} pada{' '}
                    {selectedError.resolvedAt ? new Date(selectedError.resolvedAt).toLocaleString('id-ID') : '-'}
                  </span>
                ) : (
                  <button
                    onClick={() => handleResolve(selectedError.id)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors"
                  >
                    Tandai Telah Selesai Diperbaiki
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedError(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl text-xs transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

