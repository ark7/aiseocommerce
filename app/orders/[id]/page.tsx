'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';
import { buildPurchaseCalls, fireOnce, getTrackingConfig } from '@/lib/tracking';

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product: {
    id: string;
    name: string;
    slug: string;
    productType?: 'PHYSICAL' | 'DIGITAL' | 'EVENT';
    digitalFileUrl?: string | null;
    digitalInstructions?: string | null;
    eventStartDate?: string | null;
    eventEndDate?: string | null;
    eventLocationType?: string | null;
    eventVenueName?: string | null;
    eventLocationAddress?: string | null;
    eventBenefits?: any;
  } | null;
}

interface PaymentInfo {
  id: string;
  method: string;
  status: string;
  amount: number;
  proofFile: string | null;
  verifiedAt: string | null;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  totalAmount: number;
  shippingCost?: number;
  shippingZone?: string | null;
  shippingAddress: string | null;
  discount?: number;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  courierCode?: string | null;
  courierService?: string | null;
  courierServiceName?: string | null;
  courierEtd?: string | null;
  waybillNumber?: string | null;
  biteshipTrackingId?: string | null;
  biteshipStatus?: string | null;
  createdAt: string;
  orderItems: OrderItem[];
  payments: PaymentInfo[];
}

const STEPS = [
  { key: 'PENDING', label: 'Dibuat' },
  { key: 'MANUAL_VERIFICATION', label: 'Bukti Diunggah' },
  { key: 'PROCESSING', label: 'Dikonfirmasi' },
  { key: 'SHIPPED', label: 'Dikirim' },
  { key: 'DELIVERED', label: 'Diterima' },
  { key: 'COMPLETED', label: 'Selesai' },
];

function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const orderId = (params?.id as string) || '';

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [trackingInfo, setTrackingInfo] = useState<any | null>(null);
  const [loadingTracking, setLoadingTracking] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Silakan login untuk melihat detail pesanan.');
        return;
      }

      const response = await fetch(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal memuat pesanan');
      }

      const data = await response.json();
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pesanan');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) fetchOrder();
  }, [orderId, fetchOrder]);

  // Automatically fetch live tracking if order is shipped/delivered/completed
  useEffect(() => {
    if (!order || !['SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.status)) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoadingTracking(true);
    fetch(`/api/shipping/track?orderId=${order.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.tracking) {
          setTrackingInfo(data.tracking);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingTracking(false));
  }, [order]);

  useEffect(() => {
    if (!order) return;

    fireOnce(
      `purchase:${order.id}`,
      buildPurchaseCalls(getTrackingConfig(), {
        orderId: order.id,
        value: order.totalAmount,
        items: order.orderItems.map((item) => ({
          id: item.product?.id || item.id,
          name: item.product?.name || 'Produk',
          price: item.unitPrice,
          quantity: item.quantity,
        })),
      })
    );
  }, [order]);

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofFile) {
      setError('Pilih file bukti transfer terlebih dahulu');
      return;
    }

    try {
      setBusy(true);
      setError(null);
      setNotice(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Silakan login untuk mengunggah bukti.');
        return;
      }

      const formData = new FormData();
      formData.append('orderId', orderId);
      formData.append('proof', proofFile);

      const response = await fetch('/api/payment/manual', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal mengirim bukti transfer');
      }

      setNotice('Bukti transfer berhasil dikirim. Menunggu verifikasi admin.');
      setProofFile(null);
      fetchOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim bukti transfer');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmReceived = async () => {
    if (!confirm('Pastikan Anda sudah menerima paket pesanan ini. Lanjutkan konfirmasi penerimaan?')) {
      return;
    }

    try {
      setBusy(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Silakan login terlebih dahulu.');
        return;
      }

      const response = await fetch(`/api/orders/${orderId}/received`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal mengonfirmasi penerimaan pesanan');
      }

      setNotice('Terima kasih! Pesanan telah dikonfirmasi diterima.');
      fetchOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengonfirmasi penerimaan pesanan');
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!confirm('Pastikan kondisi dan kelengkapan barang sudah sesuai. Selesaikan pesanan ini?')) {
      return;
    }

    try {
      setBusy(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Silakan login terlebih dahulu.');
        return;
      }

      const response = await fetch(`/api/orders/${orderId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menyelesaikan pesanan');
      }

      setNotice('Terima kasih! Pesanan Anda telah ditandai selesai.');
      fetchOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyelesaikan pesanan');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <StoreHeader />
        <div className="flex-1 container mx-auto px-4 py-12 text-center text-gray-500 w-full">Memuat pesanan...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <StoreHeader />
        <div className="flex-1 container mx-auto px-4 py-12 max-w-3xl w-full">
          <div className="bg-amber-50 text-amber-800 px-4 py-3 rounded-lg">{error || 'Pesanan tidak ditemukan.'}</div>
          <Link href="/orders" className="inline-block mt-4 text-indigo-600 hover:text-indigo-900">
            &larr; Kembali ke pesanan saya
          </Link>
        </div>
      </div>
    );
  }

  const payment = order.payments[0];
  const currentStep = STEPS.findIndex((step) => step.key === order.status);
  const canUploadProof = order.status === 'PENDING' && payment?.method === 'MANUAL';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StoreHeader />
      <div className="flex-1 container mx-auto px-4 py-8 max-w-3xl w-full">
        <Link href="/orders" className="text-sm text-indigo-600 hover:text-indigo-900">
          &larr; Kembali ke pesanan saya
        </Link>

        <div className="flex items-center justify-between mt-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
            <p className="text-sm text-gray-500">
              Dibuat {new Date(order.createdAt).toLocaleString('id-ID')}
            </p>
          </div>
          <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            {order.status}
          </span>
        </div>

        {error && <div className="mb-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
        {notice && <div className="mb-4 bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">{notice}</div>}

        {/* Progress Timeline */}
        <div className="bg-white border rounded-lg p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const done = idx <= currentStep && currentStep !== -1;
              return (
                <div key={step.key} className="flex-1 text-center">
                  <div
                    className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-semibold ${
                      done ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{step.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Manual Payment Proof Upload */}
        {canUploadProof && (
          <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Upload Bukti Transfer Bank</h2>
            <p className="text-sm text-gray-600 mb-4">
              Silakan lakukan transfer sejumlah <strong className="text-indigo-600">{formatIDR(order.totalAmount)}</strong> ke salah satu rekening resmi kami di bawah ini, lalu lampirkan struk / tangkapan layar bukti transfer:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs font-bold text-blue-700 block uppercase">Bank BCA</span>
                <span className="text-sm font-mono font-semibold text-slate-900 block mt-0.5">8830192810</span>
                <span className="text-[11px] text-slate-500 block">a.n PT AI SEO Store</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs font-bold text-amber-700 block uppercase">Bank Mandiri</span>
                <span className="text-sm font-mono font-semibold text-slate-900 block mt-0.5">1320019283011</span>
                <span className="text-[11px] text-slate-500 block">a.n PT AI SEO Store</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs font-bold text-teal-700 block uppercase">Bank BNI</span>
                <span className="text-sm font-mono font-semibold text-slate-900 block mt-0.5">0429182390</span>
                <span className="text-[11px] text-slate-500 block">a.n PT AI SEO Store</span>
              </div>
            </div>
            <form onSubmit={handleUploadProof} className="space-y-4">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <button
                type="submit"
                disabled={busy || !proofFile}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {busy ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
              </button>
            </form>
          </div>
        )}

        {/* Manual Payment Verification Status */}
        {order.status === 'MANUAL_VERIFICATION' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6 shadow-xs flex items-start gap-3">
            <span className="text-2xl shrink-0">⏳</span>
            <div>
              <h2 className="text-sm font-semibold text-blue-900">Bukti Pembayaran Sedang Diverifikasi</h2>
              <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                Bukti transfer Anda telah kami terima dan sedang dalam antrean verifikasi tim admin toko. Status pesanan akan otomatis diperbarui begitu pembayaran disetujui.
              </p>
            </div>
          </div>
        )}

        {/* Shipped: Customer Confirms Goods Arrived */}
        {order.status === 'SHIPPED' && (
          <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pesanan Sedang Dikirim</h2>
              <p className="text-sm text-gray-600">
                Paket pesanan Anda sedang dalam perjalanan. Jika barang telah tiba dengan baik di tangan Anda, silakan konfirmasi penerimaan.
              </p>
            </div>
            <button
              onClick={handleConfirmReceived}
              disabled={busy}
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition shrink-0"
            >
              {busy ? 'Memproses...' : 'Konfirmasi Pesanan Diterima'}
            </button>
          </div>
        )}

        {/* Delivered: Customer Completes Order */}
        {order.status === 'DELIVERED' && (
          <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pesanan Telah Tiba</h2>
              <p className="text-sm text-gray-600">Pastikan kondisi dan kelengkapan barang sudah sesuai sebelum menyelesaikan pesanan.</p>
            </div>
            <button
              onClick={handleCompleteOrder}
              disabled={busy}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shrink-0"
            >
              {busy ? 'Memproses...' : 'Selesaikan Pesanan'}
            </button>
          </div>
        )}

        {/* Real-time Biteship Courier Tracker Widget */}
        {['SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.status) && (
          <div className="bg-white border rounded-xl p-6 mb-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>🚚 Pelacakan Pengiriman (Live Tracking)</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Layanan kurir: <strong className="text-indigo-600">{order.courierServiceName || (order.courierCode ? order.courierCode.toUpperCase() : 'Ekspedisi')}</strong>
                </p>
              </div>

              {order.waybillNumber && (
                <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 self-start sm:self-auto">
                  <span className="text-xs text-indigo-900 font-medium">No. Resi:</span>
                  <span className="font-mono text-xs font-bold text-indigo-700">{order.waybillNumber}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (order.waybillNumber) {
                        navigator.clipboard.writeText(order.waybillNumber);
                        alert('Nomor resi berhasil disalin!');
                      }
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline pl-1"
                  >
                    Salin
                  </button>
                </div>
              )}
            </div>

            {loadingTracking ? (
              <div className="py-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                <span className="animate-spin">⏳</span>
                <span>Memuat status pelacakan kurir...</span>
              </div>
            ) : trackingInfo ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📍</span>
                    <span className="text-xs font-bold text-emerald-950">Status: {trackingInfo.statusLabel}</span>
                  </div>
                  {order.trackingUrl && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <span>Lacak di Biteship</span>
                      <span>↗</span>
                    </a>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Riwayat Perjalanan Paket:</h3>
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-200">
                    {trackingInfo.history?.map((h: any, idx: number) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-50"></div>
                        <p className="text-xs font-semibold text-gray-900 leading-snug">{h.note}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {new Date(h.updatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                          {h.location ? ` • ${h.location}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500 py-2">
                Informasi posisi paket sedang disinkronkan oleh pihak ekspedisi. Silakan cek kembali secara berkala.
              </div>
            )}
          </div>
        )}

        {/* Digital Products & Seminar Tickets Fulfillment Cards */}
        {['PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.status) && (
          <div className="space-y-4 mb-6">
            {order.orderItems
              .filter((item) => item.product?.productType === 'DIGITAL')
              .map((item, idx) => (
                <div key={`dig_${item.id || idx}`} className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="inline-block px-2 py-0.5 bg-emerald-200 text-emerald-800 text-[10px] font-bold uppercase rounded mb-1">
                        💻 Akses Produk Digital
                      </span>
                      <h3 className="text-base font-bold text-emerald-950">
                        {item.product?.name}
                      </h3>
                      {item.product?.digitalInstructions && (
                        <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                          <strong>Petunjuk:</strong> {item.product.digitalInstructions}
                        </p>
                      )}
                    </div>
                    {item.product?.digitalFileUrl && (
                      <a
                        href={item.product.digitalFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition whitespace-nowrap"
                      >
                        ⬇️ Buka / Unduh File Digital
                      </a>
                    )}
                  </div>
                </div>
              ))}

            {order.orderItems
              .filter((item) => item.product?.productType === 'EVENT')
              .map((item, idx) => (
                <div key={`evt_${item.id || idx}`} className="bg-purple-50 border-2 border-purple-300 rounded-xl p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-0.5 bg-purple-200 text-purple-800 text-[10px] font-bold uppercase rounded">
                          🎟️ E-Tiket Seminar & Event
                        </span>
                        <span className="font-mono text-xs font-bold text-purple-900 bg-white px-2 py-0.5 rounded border border-purple-200">
                          Kode Tiket: TKT-{order.orderNumber.replace('ORD-', '')}-{idx + 1}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-purple-950 mt-1">
                        {item.product?.name}
                      </h3>
                      <div className="text-xs text-purple-800 space-y-0.5 pt-1">
                        {item.product?.eventStartDate && (
                          <p>
                            📅 <strong>Waktu:</strong> {new Date(item.product.eventStartDate).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })} WIB
                          </p>
                        )}
                        <p>
                          {item.product?.eventLocationType === 'ONLINE' ? '💻' : '📍'}{' '}
                          <strong>Platform / Lokasi:</strong> {item.product?.eventVenueName || 'Online Webinar'}
                        </p>
                      </div>
                    </div>
                    {item.product?.eventLocationAddress && (
                      <a
                        href={item.product.eventLocationAddress}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow transition whitespace-nowrap sm:self-center"
                      >
                        {item.product.eventLocationType === 'ONLINE' ? '🌐 Buka Ruang Zoom / Acara' : '🗺️ Petunjuk Lokasi Venue'}
                      </a>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Shipping Address */}
        {order.shippingAddress && (
          <div className="bg-white border rounded-lg p-5 mb-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>📍 Alamat Pengiriman</span>
                {order.shippingZone && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                    {order.shippingZone === 'INNER'
                      ? 'Dalam Kota'
                      : order.shippingZone === 'OUTER'
                      ? 'Luar Kota'
                      : order.shippingZone === 'FREE'
                      ? 'Bebas Ongkir'
                      : order.shippingZone}
                  </span>
                )}
              </span>
              {order.courierServiceName && (
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                  🚚 {order.courierServiceName}
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-line mt-2 leading-relaxed">
              {order.shippingAddress}
            </p>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Rincian Produk</h2>
          <div className="divide-y">
            {order.orderItems.map((item) => (
              <div key={item.id} className="py-3 flex justify-between items-center text-sm">
                <div>
                  <p className="font-medium text-gray-900">{item.product?.name || 'Produk'}</p>
                  <p className="text-xs text-gray-500">
                    {item.quantity} x {formatIDR(item.unitPrice)}
                  </p>
                </div>
                <p className="font-semibold text-gray-900">{formatIDR(item.totalPrice)}</p>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal Produk</span>
              <span>{formatIDR(order.subtotal)}</span>
            </div>
            {Boolean(order.discount && order.discount > 0) && (
              <div className="flex justify-between text-emerald-600">
                <span>Diskon Voucher</span>
                <span>- {formatIDR(order.discount!)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>
                Ongkos Kirim
                {order.shippingZone === 'INNER'
                  ? ' (Dalam Kota)'
                  : order.shippingZone === 'OUTER'
                  ? ' (Luar Kota)'
                  : order.shippingZone === 'FREE'
                  ? ' (Bebas Ongkir)'
                  : order.shippingZone === 'DIGITAL'
                  ? ' (Bebas Ongkir Digital)'
                  : ''}
              </span>
              <span>{order.shippingCost ? formatIDR(order.shippingCost) : 'GRATIS'}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t">
              <span>Total Pembayaran</span>
              <span className="text-indigo-600">{formatIDR(order.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      <StoreFooter />
    </div>
  );
}

