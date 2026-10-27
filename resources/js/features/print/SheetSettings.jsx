import React, { useMemo } from 'react';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import {
  FileText,
  Sliders,
  Sparkles,
  Bookmark,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Check,
} from 'lucide-react';
import { STANDARD_SHEET_PRESETS, validateSheetFit, calculateAutoGrid, validateCustomPaper } from '../../utils/printHelpers';
import { convertUnit } from '../../utils/units';

export default function SheetSettings({
  config,
  onChangeConfig,
  items = [],
  savedPresets = [],
  onDeleteSavedPreset,
  onOpenSaveModal,
  startPosition = 1,
  onChangeStartPosition,
}) {
  const currentUnit = config.unit || 'mm';

  // Custom paper dimensions in mm
  const customWidthMm = config.custom_width !== undefined ? Number(config.custom_width) : 210;
  const customHeightMm = config.custom_height !== undefined ? Number(config.custom_height) : 297;
  const customPaperValidation = validateCustomPaper(customWidthMm, customHeightMm);

  // Helper to convert mm values from config to the display unit
  const toDisplay = (valMm) => {
    if (valMm === undefined || valMm === null || isNaN(valMm)) return 0;
    const converted = convertUnit(Number(valMm), 'mm', currentUnit);
    return Math.round(converted * 100) / 100;
  };

  // Helper to convert display unit input back to mm for config storage
  const fromDisplayToMm = (valInUnit) => {
    if (valInUnit === undefined || valInUnit === null || isNaN(valInUnit)) return 0;
    const converted = convertUnit(Number(valInUnit), currentUnit, 'mm');
    return Math.round(converted * 100) / 100;
  };

  // Validation: Does current configuration fit on the selected paper size?
  const fitValidation = useMemo(() => {
    return validateSheetFit(config);
  }, [config]);

  // Check if all selected items share the same artboard dimensions
  const sharedArtboard = useMemo(() => {
    if (!items || items.length === 0) return null;
    const firstArtboard = items[0].settings?.artboard;
    if (!firstArtboard?.width || !firstArtboard?.height) return null;

    const firstWMm = convertUnit(firstArtboard.width, firstArtboard.unit || 'mm', 'mm');
    const firstHMm = convertUnit(firstArtboard.height, firstArtboard.unit || 'mm', 'mm');

    const allMatch = items.every((item) => {
      const a = item.settings?.artboard;
      if (!a?.width || !a?.height) return false;
      const w = convertUnit(a.width, a.unit || 'mm', 'mm');
      const h = convertUnit(a.height, a.unit || 'mm', 'mm');
      return Math.abs(w - firstWMm) < 0.5 && Math.abs(h - firstHMm) < 0.5;
    });

    return {
      allMatch,
      widthMm: Math.round(firstWMm * 10) / 10,
      heightMm: Math.round(firstHMm * 10) / 10,
      count: items.length,
    };
  }, [items]);

  // Handle Preset Selection
  const handlePresetChange = (e) => {
    const val = e.target.value;
    if (val.startsWith('saved_')) {
      const presetId = parseInt(val.replace('saved_', ''), 10);
      const found = savedPresets.find((p) => p.id === presetId);
      if (found) {
        const customW =
          found.settings?.custom_width !== undefined
            ? parseFloat(found.settings.custom_width)
            : found.paper_size === 'custom'
            ? 210
            : undefined;
        const customH =
          found.settings?.custom_height !== undefined
            ? parseFloat(found.settings.custom_height)
            : found.paper_size === 'custom'
            ? 297
            : undefined;

        onChangeConfig({
          ...config,
          preset_id: val,
          paper_size: found.paper_size,
          orientation: found.orientation,
          columns: found.columns,
          rows: found.rows,
          label_width: parseFloat(found.label_width),
          label_height: parseFloat(found.label_height),
          margin_top: parseFloat(found.margin_top),
          margin_left: parseFloat(found.margin_left),
          gap_horizontal: parseFloat(found.gap_horizontal),
          gap_vertical: parseFloat(found.gap_vertical),
          corner_radius: parseFloat(found.corner_radius || 0),
          unit: found.unit || 'mm',
          custom_width: customW,
          custom_height: customH,
        });
      }
      return;
    }

    const standard = STANDARD_SHEET_PRESETS.find((p) => p.id === val);
    if (standard) {
      onChangeConfig({
        ...config,
        preset_id: standard.id,
        paper_size: standard.paper_size,
        orientation: standard.orientation,
        columns: standard.columns,
        rows: standard.rows,
        label_width: standard.label_width,
        label_height: standard.label_height,
        margin_top: standard.margin_top,
        margin_left: standard.margin_left,
        gap_horizontal: standard.gap_horizontal,
        gap_vertical: standard.gap_vertical,
        corner_radius: standard.corner_radius || 0,
        unit: standard.unit || 'mm',
      });
    }
  };

  // Orientation toggle handler (swaps width and height when custom paper size is selected)
  const handleToggleOrientation = (newOrientation) => {
    if (config.orientation === newOrientation) return;

    if (config.paper_size === 'custom') {
      onChangeConfig({
        ...config,
        orientation: newOrientation,
        custom_width: customHeightMm,
        custom_height: customWidthMm,
        preset_id: 'custom',
      });
    } else {
      onChangeConfig({
        ...config,
        orientation: newOrientation,
        preset_id: 'custom',
      });
    }
  };

  // "Match my design size" auto grid generator
  const handleMatchDesignSize = () => {
    if (!sharedArtboard) return;
    const autoGrid = calculateAutoGrid(sharedArtboard.widthMm, sharedArtboard.heightMm, config);
    onChangeConfig({
      ...config,
      preset_id: 'custom',
      ...autoGrid,
    });
  };

  const totalSlotsPerSheet = (parseInt(config.columns, 10) || 1) * (parseInt(config.rows, 10) || 1);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500 stroke-[1.5]" />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">2. Sheet Settings</h2>
            <p className="text-xs text-gray-500">Paper size, grid, margins & gaps</p>
          </div>
        </div>

        {/* Unit Selector */}
        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs font-medium">
          {['mm', 'cm', 'inch'].map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => onChangeConfig({ ...config, unit: u })}
              className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                currentUnit === u
                  ? 'bg-white text-indigo-600 font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Paper Size & Orientation */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Paper Size
            </label>
            <select
              value={config.paper_size}
              onChange={(e) =>
                onChangeConfig({
                  ...config,
                  paper_size: e.target.value,
                  preset_id: 'custom',
                  ...(e.target.value === 'custom' && config.custom_width === undefined
                    ? { custom_width: 210, custom_height: 297 }
                    : {}),
                })
              }
              className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="a4">A4 (210 × 297 mm)</option>
              <option value="letter">US Letter (215.9 × 279.4 mm)</option>
              <option value="a3">A3 (297 × 420 mm)</option>
              <option value="a5">A5 (148 × 210 mm)</option>
              <option value="a6">A6 (105 × 148 mm)</option>
              <option value="legal">US Legal (215.9 × 355.6 mm)</option>
              <option value="4x6">4 × 6 inch (101.6 × 152.4 mm)</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Orientation
            </label>
            <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg h-9 items-center">
              <button
                type="button"
                onClick={() => handleToggleOrientation('portrait')}
                className={`flex-1 h-8 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  config.orientation === 'portrait'
                    ? 'bg-white text-gray-900 font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Portrait
              </button>
              <button
                type="button"
                onClick={() => handleToggleOrientation('landscape')}
                className={`flex-1 h-8 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  config.orientation === 'landscape'
                    ? 'bg-white text-gray-900 font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Landscape
              </button>
            </div>
          </div>
        </div>

        {/* Custom Paper Dimensions Inputs when 'custom' is selected */}
        {config.paper_size === 'custom' && (
          <div className="p-3 bg-gray-50/70 border border-gray-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">Custom Paper Dimensions</span>
              <span className="text-[11px] text-gray-500 font-mono">
                20 mm – 1000 mm ({toDisplay(20)} – {toDisplay(1000)} {currentUnit})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Width ({currentUnit})
                </label>
                <input
                  type="number"
                  step="any"
                  value={toDisplay(customWidthMm)}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      custom_width: fromDisplayToMm(e.target.value),
                      preset_id: 'custom',
                    })
                  }
                  className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded-md text-xs font-mono text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Height ({currentUnit})
                </label>
                <input
                  type="number"
                  step="any"
                  value={toDisplay(customHeightMm)}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      custom_height: fromDisplayToMm(e.target.value),
                      preset_id: 'custom',
                    })
                  }
                  className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded-md text-xs font-mono text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Inline validation error or Final paper size readout */}
            {customPaperValidation.error ? (
              <p className="text-xs text-red-600 font-medium">
                {customPaperValidation.error}
              </p>
            ) : (
              <p className="text-[11px] text-gray-500">
                Paper: <strong className="text-gray-800 font-mono">{Math.round(customWidthMm * 10) / 10} × {Math.round(customHeightMm * 10) / 10} mm</strong> ({toDisplay(customWidthMm)} × {toDisplay(customHeightMm)} {currentUnit})
              </p>
            )}
          </div>
        )}
      </div>

      {/* Preset Dropdown & Save Action */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-gray-700">
            Sheet Preset
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenSaveModal}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>Save current</span>
            </button>
            {config.preset_id?.startsWith('saved_') && (
              <button
                type="button"
                onClick={() => {
                  const id = parseInt(config.preset_id.replace('saved_', ''), 10);
                  onDeleteSavedPreset(id);
                }}
                className="text-xs text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1 cursor-pointer"
                title="Delete this saved preset"
              >
                <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        <select
          value={config.preset_id || 'custom'}
          onChange={handlePresetChange}
          className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
        >
          <optgroup label="Standard Presets">
            {STANDARD_SHEET_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
          {savedPresets.length > 0 && (
            <optgroup label="Saved Presets">
              {savedPresets.map((p) => (
                <option key={p.id} value={`saved_${p.id}`}>
                  {p.name} ({p.columns}×{p.rows})
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* "Match My Design Size" Action */}
      {sharedArtboard && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 stroke-[1.5]" />
              <span>Match my design size</span>
            </div>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              All designs share artboard {sharedArtboard.widthMm} × {sharedArtboard.heightMm} mm
            </p>
          </div>
          <button
            type="button"
            onClick={handleMatchDesignSize}
            className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer"
          >
            Auto-fit Grid
          </button>
        </div>
      )}

      {/* Grid: Columns & Rows */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Columns</label>
          <input
            type="number"
            min="1"
            max="20"
            value={config.columns}
            onChange={(e) =>
              onChangeConfig({
                ...config,
                columns: Math.max(1, parseInt(e.target.value, 10) || 1),
                preset_id: 'custom',
              })
            }
            className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Rows</label>
          <input
            type="number"
            min="1"
            max="30"
            value={config.rows}
            onChange={(e) =>
              onChangeConfig({
                ...config,
                rows: Math.max(1, parseInt(e.target.value, 10) || 1),
                preset_id: 'custom',
              })
            }
            className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Label Dimensions (Width & Height) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Label Width ({currentUnit})
          </label>
          <input
            type="number"
            step="0.1"
            min="5"
            value={toDisplay(config.label_width)}
            onChange={(e) =>
              onChangeConfig({
                ...config,
                label_width: fromDisplayToMm(parseFloat(e.target.value) || 0),
                preset_id: 'custom',
              })
            }
            className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Label Height ({currentUnit})
          </label>
          <input
            type="number"
            step="0.1"
            min="5"
            value={toDisplay(config.label_height)}
            onChange={(e) =>
              onChangeConfig({
                ...config,
                label_height: fromDisplayToMm(parseFloat(e.target.value) || 0),
                preset_id: 'custom',
              })
            }
            className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Margins: Top & Left */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Top Margin ({currentUnit})
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={toDisplay(config.margin_top)}
            onChange={(e) =>
              onChangeConfig({
                ...config,
                margin_top: fromDisplayToMm(parseFloat(e.target.value) || 0),
                preset_id: 'custom',
              })
            }
            className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Left Margin ({currentUnit})
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={toDisplay(config.margin_left)}
            onChange={(e) =>
              onChangeConfig({
                ...config,
                margin_left: fromDisplayToMm(parseFloat(e.target.value) || 0),
                preset_id: 'custom',
              })
            }
            className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Gaps: Horizontal & Vertical */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Horiz. Gap ({currentUnit})
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={toDisplay(config.gap_horizontal)}
            onChange={(e) =>
              onChangeConfig({
                ...config,
                gap_horizontal: fromDisplayToMm(parseFloat(e.target.value) || 0),
                preset_id: 'custom',
              })
            }
            className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Vert. Gap ({currentUnit})
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={toDisplay(config.gap_vertical)}
            onChange={(e) =>
              onChangeConfig({
                ...config,
                gap_vertical: fromDisplayToMm(parseFloat(e.target.value) || 0),
                preset_id: 'custom',
              })
            }
            className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Corner Radius & Start Position */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Corner Radius ({currentUnit})
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={toDisplay(config.corner_radius || 0)}
            onChange={(e) =>
              onChangeConfig({
                ...config,
                corner_radius: fromDisplayToMm(parseFloat(e.target.value) || 0),
                preset_id: 'custom',
              })
            }
            className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Start at Label Slot
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="1"
              max={totalSlotsPerSheet}
              value={startPosition}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onChangeStartPosition(
                  isNaN(val) ? 1 : Math.max(1, Math.min(val, totalSlotsPerSheet))
                );
              }}
              className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
            />
            {startPosition > 1 && (
              <button
                type="button"
                onClick={() => onChangeStartPosition(1)}
                className="h-9 px-2.5 text-xs text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg shrink-0 cursor-pointer transition-colors"
                title="Reset start position to 1"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Start slot skips partly used slots on sheet 1 (1 to {totalSlotsPerSheet}). Click any slot in preview to set.
      </p>

      {/* Layout Validation Alert */}
      {!fitValidation.isValid && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2.5 text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 stroke-[1.5] mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Grid exceeds paper size!</p>
            <p className="mt-0.5 text-red-600">{fitValidation.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
