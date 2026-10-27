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
    <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-gray-500 stroke-[1.5]" />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">1. Choose What to Print</h2>
            <p className="text-xs text-gray-500">
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
            className="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
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
        <div className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs">
          <span className="text-gray-600 font-medium">Set all to:</span>
          <form onSubmit={handleApplyBatch} className="flex items-center gap-1.5">
            <input
              type="number"
              min="1"
              max="999"
              value={batchCopies}
              onChange={(e) => setBatchCopies(e.target.value)}
              className="w-14 h-7 px-2 bg-white border border-gray-300 rounded-md text-xs text-center font-semibold text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-2.5 h-7 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              Apply
            </button>
          </form>
        </div>
      )}

      {/* Selected Items List */}
      {items.length === 0 ? (
        <div className="text-center py-6 px-4 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
          <Barcode className="w-8 h-8 text-gray-400 mx-auto mb-2 stroke-[1.5]" />
          <p className="text-xs font-semibold text-gray-900">No designs selected yet</p>
          <p className="text-xs text-gray-500 mt-0.5">
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
                className="flex items-center justify-between gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-10 h-10 bg-white rounded-md border border-gray-200 shrink-0 flex items-center justify-center overflow-hidden p-0.5">
                  {item.preview_url ? (
                    <img
                      src={item.preview_url}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : item.type === 'qr' ? (
                    <QrCode className="w-5 h-5 text-gray-400 stroke-[1.5]" />
                  ) : (
                    <Barcode className="w-5 h-5 text-gray-400 stroke-[1.5]" />
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-xs text-gray-900 truncate" title={item.name}>
                      {item.name}
                    </span>
                    <Badge variant="neutral" size="xs">
                      {item.format}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                    <span className="font-mono truncate max-w-[120px]">{item.value}</span>
                    {hasArtboard && (
                      <span className="text-gray-400 font-mono text-[10px]">
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
                    className="w-6 h-6 rounded-md bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
                    title="Decrease copies"
                  >
                    <Minus className="w-3 h-3 stroke-[1.5]" />
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
                    className="w-10 h-6 px-1 bg-white border border-gray-300 rounded-md text-xs text-center font-medium text-gray-900 focus:outline-none focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateCopies(item.id, (item.copies || 1) + 1)}
                    className="w-6 h-6 rounded-md bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
                    title="Increase copies"
                  >
                    <Plus className="w-3 h-3 stroke-[1.5]" />
                  </button>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer shrink-0"
                  title="Remove from print list"
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
