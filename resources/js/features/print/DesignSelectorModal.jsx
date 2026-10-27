import React, { useState, useMemo } from 'react';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import { Search, Check, Barcode, QrCode, Filter } from 'lucide-react';

export default function DesignSelectorModal({
  isOpen,
  onClose,
  allCodes = [],
  selectedIds = [],
  onSelectCodes,
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'barcode' | 'qr'
  const [tempSelected, setTempSelected] = useState(new Set(selectedIds));

  // Sync tempSelected whenever modal opens or selectedIds changes
  React.useEffect(() => {
    if (isOpen) {
      setTempSelected(new Set(selectedIds));
      setSearch('');
      setTypeFilter('all');
    }
  }, [isOpen, selectedIds]);

  const filteredCodes = useMemo(() => {
    return allCodes.filter((code) => {
      if (typeFilter !== 'all' && code.type !== typeFilter) {
        return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        code.name?.toLowerCase().includes(q) ||
        code.value?.toLowerCase().includes(q) ||
        code.format?.toLowerCase().includes(q) ||
        code.product?.name?.toLowerCase().includes(q)
      );
    });
  }, [allCodes, typeFilter, search]);

  const toggleCode = (id) => {
    const next = new Set(tempSelected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setTempSelected(next);
  };

  const handleSelectAllFiltered = () => {
    const next = new Set(tempSelected);
    filteredCodes.forEach((c) => next.add(c.id));
    setTempSelected(next);
  };

  const handleClear = () => {
    setTempSelected(new Set());
  };

  const handleConfirm = () => {
    const selectedList = allCodes.filter((c) => tempSelected.has(c.id));
    onSelectCodes(selectedList);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Choose Designs from Gallery"
      description="Select the barcodes or QR codes you want to include on this print sheet."
      maxWidth="max-w-3xl"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            disabled={tempSelected.size === 0}
            icon={Check}
          >
            Add Selected ({tempSelected.size})
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search designs by name, value, format..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-100"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  typeFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('barcode')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  typeFilter === 'barcode'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Barcodes
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('qr')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  typeFilter === 'qr'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                QR Codes
              </button>
            </div>

            <span className="text-slate-300">&bull;</span>

            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer whitespace-nowrap"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer whitespace-nowrap"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Designs List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[400px] overflow-y-auto pr-1">
          {filteredCodes.length === 0 ? (
            <div className="col-span-2 text-center py-10 text-slate-400 text-sm">
              No designs found matching your search.
            </div>
          ) : (
            filteredCodes.map((code) => {
              const isSelected = tempSelected.has(code.id);
              return (
                <div
                  key={code.id}
                  onClick={() => toggleCode(code.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/60 shadow-2xs ring-1 ring-indigo-500/30'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCode(code.id)}
                    className="w-4 h-4 rounded-sm text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  />

                  {/* Thumbnail */}
                  <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden p-1">
                    {code.preview_url ? (
                      <img
                        src={code.preview_url}
                        alt={code.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : code.type === 'qr' ? (
                      <QrCode className="w-6 h-6 text-slate-400" />
                    ) : (
                      <Barcode className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  {/* Meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                        {code.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge
                        variant={code.type === 'qr' ? 'accent' : 'primary'}
                        size="xs"
                      >
                        {code.format}
                      </Badge>
                      <span className="text-xs font-mono text-slate-400 truncate">
                        {code.value}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
