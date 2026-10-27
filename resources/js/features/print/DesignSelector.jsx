import React, { useState } from 'react';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import {
  Plus,
  Package,
  Layers,
  Trash2,
  Barcode,
  QrCode,
  Minus,
  Sparkles,
  Search,
} from 'lucide-react';

export default function DesignSelector({
  items = [],
  onUpdateCopies,
  onRemoveItem,
  onSetAllCopies,
  onClearAll,
  onOpenDesignModal,
  onOpenProductModal,
}) {
  const [batchCopies, setBatchCopies] = useState(1);

  const handleApplyBatch = (e) => {
    e.preventDefault();
    const val = parseInt(batchCopies, 10);
    if (!isNaN(val) && val > 0) {
      onSetAllCopies(val);
    }
  };

  const totalCopies = items.reduce((sum, item) => sum + (parseInt(item.copies, 10) || 1), 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">1. Choose What to Print</h2>
            <p className="text-xs text-slate-500">
              {items.length === 0
                ? 'No designs selected'
                : `${items.length} design${items.length === 1 ? '' : 's'} (${totalCopies} label${totalCopies === 1 ? '' : 's'} total)`}
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenDesignModal}
          icon={Plus}
          className="flex-1 justify-center text-xs"
        >
          Select from Gallery
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenProductModal}
          icon={Package}
          className="flex-1 justify-center text-xs"
        >
          Add Codes for Products
        </Button>
      </div>

      {/* Batch Copies Shortcut */}
      {items.length > 0 && (
        <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
          <span className="text-slate-600 font-medium">Set all to:</span>
          <form onSubmit={handleApplyBatch} className="flex items-center gap-1.5">
            <input
              type="number"
              min="1"
              max="999"
              value={batchCopies}
              onChange={(e) => setBatchCopies(e.target.value)}
              className="w-14 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-center font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Apply
            </button>
          </form>
        </div>
      )}

      {/* Selected Items List */}
      {items.length === 0 ? (
        <div className="text-center py-6 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <Barcode className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700">No designs selected yet</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Select saved barcodes from your Gallery or choose products.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {items.map((item) => {
            const artboard = item.settings?.artboard;
            const hasArtboard = artboard?.width && artboard?.height;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden p-0.5">
                  {item.preview_url ? (
                    <img
                      src={item.preview_url}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : item.type === 'qr' ? (
                    <QrCode className="w-5 h-5 text-slate-400" />
                  ) : (
                    <Barcode className="w-5 h-5 text-slate-400" />
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-slate-900 truncate" title={item.name}>
                      {item.name}
                    </span>
                    <Badge variant={item.type === 'qr' ? 'accent' : 'primary'} size="xs">
                      {item.format}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="font-mono truncate max-w-[120px]">{item.value}</span>
                    {hasArtboard && (
                      <span className="text-slate-400 font-mono text-[10px]">
                        [{artboard.width}×{artboard.height}{artboard.unit || 'mm'}]
                      </span>
                    )}
                  </div>
                </div>

                {/* Copies Stepper */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onUpdateCopies(item.id, Math.max(1, (item.copies || 1) - 1))}
                    className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                    title="Decrease copies"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={item.copies || 1}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      onUpdateCopies(item.id, isNaN(v) ? 1 : Math.max(1, v));
                    }}
                    className="w-10 px-1 py-0.5 bg-white border border-slate-200 rounded-md text-xs text-center font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateCopies(item.id, (item.copies || 1) + 1)}
                    className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                    title="Increase copies"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                  title="Remove from print list"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
