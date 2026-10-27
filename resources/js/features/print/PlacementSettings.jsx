import React, { useMemo } from 'react';
import {
  Maximize2,
  Minimize2,
  AlignCenter,
  AlignLeft,
  Eye,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { convertUnit } from '../../utils/units';

export default function PlacementSettings({
  placement,
  onChangePlacement,
  config,
  items = [],
}) {
  const labelW = parseFloat(config.label_width) || 0;
  const labelH = parseFloat(config.label_height) || 0;
  const paddingMm = parseFloat(placement.padding) || 0;

  const innerW = Math.max(1, labelW - 2 * paddingMm);
  const innerH = Math.max(1, labelH - 2 * paddingMm);

  // Warnings analysis
  const warnings = useMemo(() => {
    let hasLargerThanCell = false;
    let hasSmallScanSize = false;

    // Is the cell itself very small for scanning? (< 25mm wide or < 12mm high)
    if (innerW < 25 || innerH < 12) {
      hasSmallScanSize = true;
    }

    items.forEach((item) => {
      const artboard = item.settings?.artboard;
      if (artboard?.width && artboard?.height) {
        const itemWMm = convertUnit(artboard.width, artboard.unit || 'mm', 'mm');
        const itemHMm = convertUnit(artboard.height, artboard.unit || 'mm', 'mm');

        if (itemWMm > innerW || itemHMm > innerH) {
          hasLargerThanCell = true;
        }

        // If design is scaled significantly smaller than 25mm wide
        if (placement.fit === 'fit') {
          const aspect = itemWMm / itemHMm;
          const cellAspect = innerW / innerH;
          const finalW = aspect > cellAspect ? innerW : innerH * aspect;
          const finalH = aspect > cellAspect ? innerW / aspect : innerH;
          if (finalW < 20 || finalH < 10) {
            hasSmallScanSize = true;
          }
        }
      }
    });

    return {
      hasLargerThanCell,
      hasSmallScanSize,
    };
  }, [items, innerW, innerH, placement.fit]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <Maximize2 className="w-4 h-4 text-gray-500 stroke-[1.5]" />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">3. Placement & Cell Fitting</h2>
            <p className="text-xs text-gray-500">Scaling, alignment, padding & styling</p>
          </div>
        </div>
      </div>

      {/* Fit Options */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Design Sizing (Fit Mode)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'fit', label: 'Fit to Label', desc: 'Scale down, keep aspect ratio' },
            { id: 'original', label: 'Original Size', desc: 'Use real design dimensions' },
            { id: 'fill', label: 'Fill Label', desc: 'Stretch to label bounds' },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onChangePlacement({ ...placement, fit: mode.id })}
              className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                placement.fit === mode.id
                  ? 'border-indigo-600 bg-gray-50 text-indigo-600'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div
                className={`text-xs ${
                  placement.fit === mode.id ? 'font-semibold text-indigo-600' : 'font-medium text-gray-900'
                }`}
              >
                {mode.label}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 leading-tight">{mode.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Alignment & Cell Padding */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Alignment</label>
          <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg h-9 items-center">
            <button
              type="button"
              onClick={() => onChangePlacement({ ...placement, alignment: 'center' })}
              className={`flex-1 h-8 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                (placement.alignment || 'center') === 'center'
                  ? 'bg-white text-gray-900 font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Center
            </button>
            <button
              type="button"
              onClick={() => onChangePlacement({ ...placement, alignment: 'top-left' })}
              className={`flex-1 h-8 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                placement.alignment === 'top-left'
                  ? 'bg-white text-gray-900 font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Top-Left
            </button>
            <button
              type="button"
              onClick={() => onChangePlacement({ ...placement, alignment: 'top-center' })}
              className={`flex-1 h-8 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                placement.alignment === 'top-center'
                  ? 'bg-white text-gray-900 font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Top-Mid
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Cell Padding (mm)
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            max="15"
            value={placement.padding}
            onChange={(e) =>
              onChangePlacement({
                ...placement,
                padding: Math.max(0, parseFloat(e.target.value) || 0),
              })
            }
            className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Artboard Background & Border Toggles */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs text-gray-700">Show artboard background color</span>
          <input
            type="checkbox"
            checked={placement.showBackground !== false}
            onChange={(e) =>
              onChangePlacement({ ...placement, showBackground: e.target.checked })
            }
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500/20 border-gray-300 cursor-pointer"
          />
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs text-gray-700">Show artboard borders</span>
          <input
            type="checkbox"
            checked={Boolean(placement.showArtboardBorder)}
            onChange={(e) =>
              onChangePlacement({ ...placement, showArtboardBorder: e.target.checked })
            }
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500/20 border-gray-300 cursor-pointer"
          />
        </label>
      </div>

      {/* Inline Warning States */}
      {warnings.hasLargerThanCell && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 text-xs text-amber-800">
          <Info className="w-4 h-4 text-amber-600 shrink-0 stroke-[1.5] mt-0.5" />
          <span>
            One or more selected designs exceed the label cell dimensions ({labelW} × {labelH} mm)
            and will be scaled down to fit cleanly.
          </span>
        </div>
      )}

      {warnings.hasSmallScanSize && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 stroke-[1.5] mt-0.5" />
          <span>
            <strong>Small code notice:</strong> Scaling may reduce barcode height below 10mm or
            width below 20mm, which might affect scanning reliability with older hardware scanners.
          </span>
        </div>
      )}
    </div>
  );
}
