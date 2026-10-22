'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

interface ImageUploaderProps {
  value?: string | null;
  onChange: (url: string) => void;
  type?: 'logo' | 'favicon' | 'banner' | 'product' | 'general';
  label?: string;
  description?: string;
  placeholderUrl?: string;
  className?: string;
  disabled?: boolean;
}

export default function ImageUploader({
  value,
  onChange,
  type = 'general',
  label,
  description,
  placeholderUrl = 'https://.../gambar.png',
  className = '',
  disabled = false,
}: ImageUploaderProps) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savings, setSavings] = useState<{
    originalSize: number;
    optimizedSize: number;
    savingsPercent: number;
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    return Math.round(bytes / 1024) + ' KB';
  };

  const handleUploadFile = async (file: File) => {
    setError(null);
    setSavings(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('token') || localStorage.getItem('super_admin_token')
          : null;

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengunggah dan mengompresi gambar');
      }

      onChange(data.url);
      if (data.savingsPercent !== undefined) {
        setSavings({
          originalSize: data.originalSize,
          optimizedSize: data.optimizedSize,
          savingsPercent: data.savingsPercent,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat upload');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
    e.target.value = '';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const handleRemove = () => {
    onChange('');
    setSavings(null);
    setError(null);
  };

  const isFavicon = type === 'favicon';
  const previewBoxClasses = isFavicon
    ? 'w-10 h-10 rounded border bg-gray-50 flex items-center justify-center p-1 relative overflow-hidden'
    : 'w-24 h-24 rounded-lg border bg-gray-50 flex items-center justify-center p-2 relative overflow-hidden';

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-gray-700">
            {label}
          </label>
          <div className="flex items-center text-[11px] space-x-2">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`px-2 py-0.5 rounded font-medium transition ${
                mode === 'upload'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Upload File
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => setMode('url')}
              className={`px-2 py-0.5 rounded font-medium transition ${
                mode === 'url'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Gunakan URL
            </button>
          </div>
        </div>
      )}

      {description && <p className="text-[11px] text-gray-500">{description}</p>}

      {mode === 'url' ? (
        <div className="space-y-2">
          <input
            type="url"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholderUrl}
            disabled={disabled || uploading}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
            className="hidden"
            disabled={disabled || uploading}
          />

          {!value ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-50/50'
                  : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
              } ${uploading ? 'opacity-60 cursor-wait' : ''}`}
            >
              {uploading ? (
                <div className="flex flex-col items-center justify-center space-y-1.5 py-2">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-medium text-indigo-700">
                    Mengompresi & mengunggah ke WebP...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-1">
                  <svg
                    className="w-7 h-7 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-xs font-semibold text-gray-700">
                    Klik untuk memilih file <span className="text-gray-500 font-normal">atau tarik ke sini</span>
                  </p>
                  <p className="text-[10px] text-gray-400">
                    JPG, PNG, WEBP, SVG hingga 10MB • Otomatis dikompresi ringan & tajam
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <div className={previewBoxClasses}>
                <Image
                  src={value}
                  alt="Preview"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-xs font-medium text-gray-800 truncate" title={value}>
                  {value.split('/').pop()}
                </p>

                {savings ? (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                      📉 Hemat {savings.savingsPercent}%
                    </span>
                    <span className="text-gray-500">
                      {formatFileSize(savings.originalSize)} ➔{' '}
                      <strong className="text-gray-700">
                        {formatFileSize(savings.optimizedSize)}
                      </strong>
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-emerald-600 font-medium">
                    ✓ Gambar aktif
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || uploading}
                  className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition shadow-sm"
                >
                  Ganti
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={disabled || uploading}
                  className="p-1 text-gray-400 hover:text-red-600 transition rounded-lg"
                  title="Hapus Gambar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
