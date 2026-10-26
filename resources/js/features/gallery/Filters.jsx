import React from 'react';
import { Link } from 'react-router-dom';
import { Search, X, Plus, Barcode, QrCode, Layers } from 'lucide-react';
import Button from '../../components/Button';

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
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      {/* Search Input & Filter Chips */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by code name, value, or format..."
            className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="inline-flex p-1 bg-slate-200/60 rounded-xl self-start sm:self-auto shrink-0 max-w-full overflow-x-auto">
          {filterOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = typeFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onTypeFilterChange(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{opt.label}</span>
                {opt.count !== undefined && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {opt.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Create New Button */}
      <Link to="/designer" className="self-stretch sm:self-end md:self-auto shrink-0">
        <Button icon={Plus} variant="primary" size="md" className="w-full sm:w-auto">
          Create New
        </Button>
      </Link>
    </div>
  );
}
