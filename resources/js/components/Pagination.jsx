import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  page = 1,
  lastPage = 1,
  from = 0,
  to = 0,
  total = 0,
  itemLabel = 'items',
  onPageChange,
  isLoading = false,
  className = '',
}) {
  if (!lastPage || lastPage <= 1) {
    if (total > 0) {
      return (
        <div className={`px-4 py-3 sm:px-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium ${className}`}>
          <span>
            Showing <strong className="font-semibold text-slate-700">{from}</strong> to{' '}
            <strong className="font-semibold text-slate-700">{to}</strong> of{' '}
            <strong className="font-semibold text-slate-700">{total}</strong> {itemLabel}
          </span>
        </div>
      );
    }
    return null;
  }

  // Generate pagination range
  const getPageNumbers = () => {
    if (lastPage <= 7) {
      return Array.from({ length: lastPage }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, '...', lastPage];
    }
    if (page >= lastPage - 3) {
      return [1, '...', lastPage - 4, lastPage - 3, lastPage - 2, lastPage - 1, lastPage];
    }
    return [1, '...', page - 1, page, page + 1, '...', lastPage];
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`px-4 py-3 sm:px-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`}
    >
      {/* Left: Showing x to y of z */}
      <div className="text-xs text-slate-500 font-medium self-start sm:self-auto">
        Showing <strong className="font-semibold text-slate-700">{from}</strong> to{' '}
        <strong className="font-semibold text-slate-700">{to}</strong> of{' '}
        <strong className="font-semibold text-slate-700">{total}</strong> {itemLabel}
      </div>

      {/* Right: Compact pagination buttons */}
      <div className="flex items-center gap-1 self-end sm:self-auto justify-end">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}
          className="inline-flex items-center gap-1 h-8 sm:h-8.5 px-2.5 sm:px-3 text-xs sm:text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 shrink-0" />
          <span>Previous</span>
        </button>

        {/* Mobile: Compact "Page x of y" indicator */}
        <span className="sm:hidden px-2 text-xs font-semibold text-slate-700 whitespace-nowrap select-none">
          Page {page} of {lastPage}
        </span>

        {/* Desktop: Square page number buttons */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`dots-${idx}`}
                  className="w-8 h-8 sm:w-8.5 sm:h-8.5 flex items-center justify-center text-xs text-slate-400 select-none"
                >
                  ...
                </span>
              );
            }

            const isCurrent = p === page;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                disabled={isLoading}
                className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center cursor-pointer shrink-0 ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= lastPage || isLoading}
          className="inline-flex items-center gap-1 h-8 sm:h-8.5 px-2.5 sm:px-3 text-xs sm:text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4 shrink-0" />
        </button>
      </div>
    </div>
  );
}
