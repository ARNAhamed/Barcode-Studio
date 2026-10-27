import React from 'react';
import { Search, X, Barcode, QrCode, Layers } from 'lucide-react';

export default function Filters({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  counts = { all: 0, barcode: 0, qr: 0 },
}) {
  const filterOptions = [
    { value: 'all', label: 'All Codes', icon: Layers, count: counts.all },
    { value: 'barcode', label: 'Barcodes', icon: Barcode, count: counts.barcode },
    { value: 'qr', label: 'QR Codes', icon: QrCode, count: counts.qr },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" strokeWidth={1.5} />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by code name, value, or format..."
          className="w-full h-9 pl-9 pr-8 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="p-1 text-gray-400 hover:text-gray-600 absolute right-2 top-1/2 -translate-y-1/2 rounded-md cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Filter Tabs / Chips */}
      <div className="inline-flex p-0.5 bg-gray-100 rounded-lg self-start sm:self-auto shrink-0 max-w-full overflow-x-auto border border-gray-200">
        {filterOptions.map((opt) => {
          const Icon = opt.icon;
          const isActive = typeFilter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onTypeFilterChange(opt.value)}
              className={`flex items-center gap-1.5 px-3 h-8 rounded-md text-xs transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-white text-indigo-600 font-medium border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>{opt.label}</span>
              {opt.count !== undefined && (
                <span className={`text-[11px] ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
