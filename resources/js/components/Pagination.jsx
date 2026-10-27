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
        <div className={`px-4 py-3 sm:px-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 ${className}`}>
          <span>
            Showing <strong className="font-medium text-gray-900">{from}</strong> to{' '}
            <strong className="font-medium text-gray-900">{to}</strong> of{' '}
            <strong className="font-medium text-gray-900">{total}</strong> {itemLabel}
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
      className={`px-4 py-3 sm:px-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`}
    >
      {/* Left: Showing x to y of z */}
      <div className="text-xs text-gray-500 self-start sm:self-auto">
        Showing <strong className="font-medium text-gray-900">{from}</strong> to{' '}
        <strong className="font-medium text-gray-900">{to}</strong> of{' '}
        <strong className="font-medium text-gray-900">{total}</strong> {itemLabel}
      </div>

      {/* Right: Compact pagination buttons */}
      <div className="flex items-center gap-1 self-end sm:self-auto justify-end">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}
          className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          <span>Previous</span>
        </button>

        {/* Mobile: Compact "Page x of y" indicator */}
        <span className="sm:hidden px-2 text-xs font-medium text-gray-700 whitespace-nowrap select-none">
          Page {page} of {lastPage}
        </span>

        {/* Desktop: Square page number buttons */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`dots-${idx}`}
                  className="w-8 h-8 flex items-center justify-center text-xs text-gray-400 select-none"
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
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors flex items-center justify-center cursor-pointer shrink-0 ${
                  isCurrent
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
          className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4 shrink-0" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
