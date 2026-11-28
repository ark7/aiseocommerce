import React from 'react';
import Link from 'next/link';

interface StoreSuspendedNoticeProps {
  storeName?: string | null;
  domain?: string | null;
  effectiveStatus: string;
  reason?: string | null;
  billingPortalToken?: string | null;
}

export default function StoreSuspendedNotice({
  storeName,
  domain,
  effectiveStatus,
  reason,
  billingPortalToken,
}: StoreSuspendedNoticeProps) {
  const isOverdueLicense = effectiveStatus === 'LICENSE_OVERDUE';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-3xl">
          {isOverdueLicense ? '🔐' : '⏸️'}
        </div>

        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30 mb-3">
          {isOverdueLicense ? 'Batas Tebus Lisensi Terlampaui' : 'Layanan Sementara Nonaktif'}
        </span>

        <h1 className="text-2xl font-extrabold text-white mb-2">
          {storeName ? `Website ${storeName} Sedang Dijeda` : 'Layanan Website Sementara Dijeda'}
        </h1>

        {domain && (
          <p className="text-xs font-mono text-slate-400 mb-4">{domain}</p>
        )}

        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          {reason ||
            'Akses etalase dan operasional toko sementara dinonaktifkan menunggu verifikasi pembayaran langganan bulanan atau penebusan lisensi.'}
        </p>

        {billingPortalToken ? (
          <div className="space-y-3">
            <Link
              href={`/billing/${encodeURIComponent(billingPortalToken)}`}
              className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition"
            >
              Buka Portal Billing &amp; Upload Bukti Bayar &rarr;
            </Link>
            <p className="text-xs text-slate-400">
              Untuk pemilik toko: unggah bukti pembayaran melalui tautan di atas agar website segera aktif kembali.
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            Jika Anda pemilik toko ini, silakan hubungi tim pengelola LarisDari.web.id untuk re-aktivasi layanan.
          </p>
        )}
      </div>
    </div>
  );
}
