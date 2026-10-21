'use client';

import React from 'react';
import Link from 'next/link';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  createPageUrl?: (page: number) => string;
  limitOptions?: number[];
  className?: string;
  showLimitSelector?: boolean;
}

export default function Pagination({
  page,
  totalPages,
  totalItems,
  limit,
  onPageChange,
  onLimitChange,
  createPageUrl,
  limitOptions = [10, 20, 25, 50, 100],
  className = '',
  showLimitSelector = true,
}: PaginationProps) {
  if (totalPages <= 1 && (!totalItems || totalItems === 0) && !limit) {
    return null;
  }

  const currentPage = Math.max(1, Math.min(page, Math.max(1, totalPages)));
  const safeTotalPages = Math.max(1, totalPages);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = (): (number | string)[] => {
    if (safeTotalPages <= 7) {
      return Array.from({ length: safeTotalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', safeTotalPages];
    }

    if (currentPage >= safeTotalPages - 3) {
      return [
        1,
        '...',
        safeTotalPages - 4,
        safeTotalPages - 3,
        safeTotalPages - 2,
        safeTotalPages - 1,
        safeTotalPages,
      ];
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', safeTotalPages];
  };

  const pages = getPageNumbers();

  const handlePageClick = (p: number, e: React.MouseEvent) => {
    if (onPageChange) {
      e.preventDefault();
      if (p !== currentPage && p >= 1 && p <= safeTotalPages) {
        onPageChange(p);
      }
    }
  };

  const renderPageButton = (p: number | string, index: number) => {
    if (typeof p === 'string') {
      return (
        <span
          key={`ellipsis-${index}`}
          className="px-3 py-1.5 text-xs text-gray-400 select-none"
        >
          &hellip;
        </span>
      );
    }

    const isActive = p === currentPage;
    const commonClasses = `min-w-[2rem] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors text-center ${
      isActive
        ? 'bg-indigo-600 text-white shadow-xs'
        : 'text-gray-700 hover:bg-gray-100 hover:text-indigo-600 border border-gray-200'
    }`;

    if (createPageUrl) {
      return (
        <Link
          key={p}
          href={createPageUrl(p)}
          onClick={(e) => onPageChange && handlePageClick(p, e)}
          className={commonClasses}
        >
          {p}
        </Link>
      );
    }

    return (
      <button
        key={p}
        type="button"
        onClick={(e) => handlePageClick(p, e)}
        className={commonClasses}
      >
        {p}
      </button>
    );
  };

  const renderNavButton = (
    targetPage: number,
    label: React.ReactNode,
    isDisabled: boolean,
    direction: 'prev' | 'next'
  ) => {
    const commonClasses = `px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1 ${
      isDisabled
        ? 'opacity-40 cursor-not-allowed text-gray-400 border-gray-200 bg-gray-50'
        : 'text-gray-700 hover:bg-gray-100 hover:text-indigo-600 border-gray-300 bg-white'
    }`;

    if (isDisabled) {
      return (
        <span className={commonClasses} aria-disabled="true">
          {label}
        </span>
      );
    }

    if (createPageUrl) {
      return (
        <Link
          href={createPageUrl(targetPage)}
          onClick={(e) => onPageChange && handlePageClick(targetPage, e)}
          className={commonClasses}
        >
          {label}
        </Link>
      );
    }

    return (
      <button
        type="button"
        disabled={isDisabled}
        onClick={(e) => handlePageClick(targetPage, e)}
        className={commonClasses}
      >
        {label}
      </button>
    );
  };

  // Item counts string
  let countText = '';
  if (totalItems !== undefined && limit !== undefined && totalItems > 0) {
    const from = (currentPage - 1) * limit + 1;
    const to = Math.min(currentPage * limit, totalItems);
    countText = `Menampilkan ${from} - ${to} dari ${totalItems} data`;
  } else if (totalItems !== undefined) {
    countText = `Total: ${totalItems} data`;
  } else {
    countText = `Halaman ${currentPage} dari ${safeTotalPages}`;
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3 ${className}`}
    >
      {/* Left side: Info & Limit Selector */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span>{countText}</span>

        {showLimitSelector && limit && onLimitChange && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-gray-200">
            <span>Tampilkan:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 focus:ring-1 focus:ring-indigo-500"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / halaman
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Page Numbers & Prev/Next */}
      {safeTotalPages > 1 && (
        <div className="flex items-center gap-1.5">
          {renderNavButton(
            currentPage - 1,
            <>
              <span>&larr;</span>
              <span className="hidden sm:inline">Sebelumnya</span>
            </>,
            currentPage <= 1,
            'prev'
          )}

          <div className="flex items-center gap-1">{pages.map((p, i) => renderPageButton(p, i))}</div>

          {renderNavButton(
            currentPage + 1,
            <>
              <span className="hidden sm:inline">Berikutnya</span>
              <span>&rarr;</span>
            </>,
            currentPage >= safeTotalPages,
            'next'
          )}
        </div>
      )}
    </div>
  );
}

