'use client';

import React, { useState, useEffect } from 'react';

export type DatePreset = 'all' | 'today' | 'last7' | 'last30' | 'thisMonth' | 'custom';

export interface DateFilterValue {
  startDate: string;
  endDate: string;
  preset: DatePreset;
}

interface DateRangeFilterProps {
  startDate?: string;
  endDate?: string;
  initialPreset?: DatePreset;
  onFilterChange: (value: DateFilterValue) => void;
  className?: string;
  compact?: boolean;
}

function formatDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDateRangeFromPreset(preset: DatePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const todayStr = formatDateString(now);

  switch (preset) {
    case 'today':
      return { startDate: todayStr, endDate: todayStr };
    case 'last7': {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      return { startDate: formatDateString(past), endDate: todayStr };
    }
    case 'last30': {
      const past = new Date(now);
      past.setDate(past.getDate() - 29);
      return { startDate: formatDateString(past), endDate: todayStr };
    }
    case 'thisMonth': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: formatDateString(firstDay), endDate: todayStr };
    }
    case 'all':
    default:
      return { startDate: '', endDate: '' };
  }
}

export default function DateRangeFilter({
  startDate = '',
  endDate = '',
  initialPreset = 'all',
  onFilterChange,
  className = '',
  compact = false,
}: DateRangeFilterProps) {
  const [preset, setPreset] = useState<DatePreset>(() => {
    if (initialPreset && initialPreset !== 'custom') return initialPreset;
    if (startDate || endDate) return 'custom';
    return 'all';
  });

  const [start, setStart] = useState<string>(startDate);
  const [end, setEnd] = useState<string>(endDate);
  const [showCustom, setShowCustom] = useState<boolean>(preset === 'custom');

  useEffect(() => {
    setStart(startDate);
    setEnd(endDate);
    if (!startDate && !endDate && preset !== 'all') {
      setPreset('all');
      setShowCustom(false);
    }
  }, [startDate, endDate, preset]);

  const handlePresetSelect = (selectedPreset: DatePreset) => {
    setPreset(selectedPreset);
    if (selectedPreset === 'custom') {
      setShowCustom(true);
      return;
    }

    setShowCustom(false);
    const range = getDateRangeFromPreset(selectedPreset);
    setStart(range.startDate);
    setEnd(range.endDate);
    onFilterChange({
      startDate: range.startDate,
      endDate: range.endDate,
      preset: selectedPreset,
    });
  };

  const handleCustomApply = () => {
    onFilterChange({
      startDate: start,
      endDate: end,
      preset: 'custom',
    });
  };

  const handleReset = () => {
    setPreset('all');
    setStart('');
    setEnd('');
    setShowCustom(false);
    onFilterChange({
      startDate: '',
      endDate: '',
      preset: 'all',
    });
  };

  const PRESETS: { id: DatePreset; label: string }[] = [
    { id: 'all', label: 'Semua Waktu' },
    { id: 'today', label: 'Hari Ini' },
    { id: 'last7', label: '7 Hari Terakhir' },
    { id: 'last30', label: '30 Hari Terakhir' },
    { id: 'thisMonth', label: 'Bulan Ini' },
    { id: 'custom', label: 'Kustom' },
  ];

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Presets Pills */}
      <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-lg border border-gray-200">
        <span className="text-xs font-medium text-gray-500 px-2 flex items-center gap-1">
          <span>📅</span> {!compact && 'Waktu:'}
        </span>
        {PRESETS.map((p) => {
          const isActive = preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePresetSelect(p.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                isActive
                  ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Pickers */}
      {showCustom && (
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-lg border border-indigo-200 shadow-xs">
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
            title="Dari Tanggal"
          />
          <span className="text-xs text-gray-400">&ndash;</span>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
            title="Sampai Tanggal"
          />
          <button
            type="button"
            onClick={handleCustomApply}
            className="px-2.5 py-1 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 transition"
          >
            Terapkan
          </button>
        </div>
      )}

      {/* Active Filter Clear indicator */}
      {(start || end || preset !== 'all') && (
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition flex items-center gap-1"
          title="Reset filter waktu"
        >
          <span>✕</span>
          <span className="hidden sm:inline">Reset</span>
        </button>
      )}
    </div>
  );
}
