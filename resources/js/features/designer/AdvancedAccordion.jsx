import React, { useState } from 'react';
import {
  ChevronDown,
  Layers,
  Layout,
  Maximize2,
  Type,
  Sliders,
  RotateCcw,
  Lock,
  Unlock,
  Upload,
  X,
  Plus,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize,
  AlertTriangle,
} from 'lucide-react';
import {
  UNITS,
  ARTBOARD_PRESETS,
  DPIS,
  convertUnit,
  toPx,
  fromPx,
  getPresetDimensionsInUnit,
} from '../../utils/units';

const ALIGNMENTS = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-center', label: 'Top Center' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'middle-left', label: 'Middle Left' },
  { id: 'center', label: 'Center' },
  { id: 'middle-right', label: 'Middle Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-center', label: 'Bottom Center' },
  { id: 'bottom-right', label: 'Bottom Right' },
];

const PRESET_BG_COLORS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Off-White', value: '#f8fafc' },
  { label: 'Slate', value: '#f1f5f9' },
  { label: 'Warm Cream', value: '#fef3c7' },
  { label: 'Soft Mint', value: '#ecfdf5' },
  { label: 'Ice Blue', value: '#eff6ff' },
  { label: 'Dark Charcoal', value: '#0f172a' },
];

const DOT_STYLES = [
  { value: 'square', label: 'Square' },
  { value: 'dots', label: 'Dots' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'extra-rounded', label: 'Extra Rounded' },
  { value: 'classy', label: 'Classy' },
];

const CORNER_STYLES = [
  { value: 'square', label: 'Square' },
  { value: 'dot', label: 'Dot' },
  { value: 'extra-rounded', label: 'Rounded' },
];

const ERROR_CORRECTION_LEVELS = [
  { value: 'L', label: 'Low (7%)' },
  { value: 'M', label: 'Medium (15%)' },
  { value: 'Q', label: 'Quartile (25%)' },
  { value: 'H', label: 'High (30% - best for logos)' },
];

// Helper component for number input with minus and plus buttons
function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  shiftStep = 10,
  unit = '',
  className = '',
  placeholder = '',
}) {
  const handleKeyDown = (e) => {
    const current = parseFloat(value) || 0;
    const delta = e.shiftKey ? shiftStep : step;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(max, parseFloat((current + delta).toFixed(2)));
      onChange(next);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(min, parseFloat((current - delta).toFixed(2)));
      onChange(next);
    }
  };

  const handleMinus = () => {
    const current = parseFloat(value) || 0;
    const next = Math.max(min, parseFloat((current - step).toFixed(2)));
    onChange(next);
  };

  const handlePlus = () => {
    const current = parseFloat(value) || 0;
    const next = Math.min(max, parseFloat((current + step).toFixed(2)));
    onChange(next);
  };

  return (
    <div className={`flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/20 ${className}`}>
      <button
        type="button"
        onClick={handleMinus}
        disabled={parseFloat(value) <= min}
        className="w-7 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors shrink-0"
        tabIndex={-1}
      >
        <Minus className="w-3 h-3 stroke-[2]" />
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          onChange(isNaN(val) ? '' : val);
        }}
        onKeyDown={handleKeyDown}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className="w-full h-8 text-center text-xs font-mono text-gray-900 border-x border-gray-200 focus:outline-none px-1 appearance-none [moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {unit && (
        <span className="text-[10px] text-gray-400 font-mono pr-1 select-none hidden sm:inline">
          {unit}
        </span>
      )}
      <button
        type="button"
        onClick={handlePlus}
        disabled={parseFloat(value) >= max}
        className="w-7 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors shrink-0"
        tabIndex={-1}
      >
        <Plus className="w-3 h-3 stroke-[2]" />
      </button>
    </div>
  );
}

export default function AdvancedAccordion({
  type = 'barcode', // 'barcode' | 'qr'
  settings,
  onChangeSettings,
  artboardSettings,
  onChangeArtboard,
  dpi = 300,
  onChangeDpi,
  onResetAdvanced,
}) {
  // Outer accordion state
  const [isOuterOpen, setIsOuterOpen] = useState(() => {
    return localStorage.getItem('designer_advanced_open') === 'true';
  });

  // Vertical accordion: only ONE group open at a time
  const [openGroup, setOpenGroup] = useState(() => {
    return localStorage.getItem('designer_advanced_group') || 'artboard';
  });

  const handleToggleOuter = () => {
    setIsOuterOpen((prev) => {
      const next = !prev;
      localStorage.setItem('designer_advanced_open', String(next));
      return next;
    });
  };

  const handleToggleGroup = (groupKey) => {
    setOpenGroup((prev) => {
      const next = prev === groupKey ? null : groupKey;
      if (next) localStorage.setItem('designer_advanced_group', next);
      return next;
    });
  };

  const currentUnit = settings.unit || artboardSettings?.unit || 'mm';
  const unitConfig = UNITS.find((u) => u.value === currentUnit) || UNITS[2];

  // Helper for step size: 0.5 below 20mm, 1 above 20mm
  const getDimensionStep = (valInUnit) => {
    if (currentUnit === 'mm') {
      return valInUnit < 20 ? 0.5 : 1;
    }
    if (currentUnit === 'px') return 2;
    return 0.1;
  };

  // Artboard preset change
  const handleArtboardPresetChange = (presetId) => {
    if (presetId === 'auto') {
      onChangeArtboard({ ...artboardSettings, preset: 'auto' });
      return;
    }
    const preset = ARTBOARD_PRESETS.find((p) => p.id === presetId);
    if (!preset || presetId === 'custom') {
      onChangeArtboard({ ...artboardSettings, preset: 'custom' });
      return;
    }
    const dims = getPresetDimensionsInUnit(preset, artboardSettings.unit || 'mm');
    if (!dims) return;
    onChangeArtboard({
      ...artboardSettings,
      preset: presetId,
      width: dims.width,
      height: dims.height,
      orientation: dims.height > dims.width ? 'portrait' : 'landscape',
    });
  };

  // QR Fit to Artboard calculation
  const artboardW = artboardSettings?.width || 60;
  const artboardH = artboardSettings?.height || 40;
  const paddingVal = artboardSettings?.padding !== undefined ? artboardSettings.padding : 5;
  const maxAvailableInArtboard = Math.max(
    10,
    Math.min(artboardW - 2 * paddingVal, artboardH - 2 * paddingVal)
  );

  const qrSizeInActiveUnit = settings.size || 35;
  const qrPercentOfArtboard = artboardSettings.preset !== 'auto' && artboardW > 0
    ? Math.round((qrSizeInActiveUnit / Math.min(artboardW, artboardH)) * 100)
    : null;

  const qrMinScannable = currentUnit === 'mm' ? 10 : currentUnit === 'cm' ? 1 : currentUnit === 'inch' ? 0.4 : 38;
  const qrIsTooSmall = qrSizeInActiveUnit < qrMinScannable;

  const handleFitQrToArtboard = () => {
    if (artboardSettings.preset === 'auto') {
      onChangeSettings({ ...settings, size: 40 });
      return;
    }
    const fitted = parseFloat(maxAvailableInArtboard.toFixed(1));
    onChangeSettings({ ...settings, size: Math.max(qrMinScannable, fitted) });
  };

  // Logo upload
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChangeSettings({
        ...settings,
        logo: reader.result,
        errorCorrection: settings.errorCorrection === 'L' || settings.errorCorrection === 'M' ? 'H' : settings.errorCorrection,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="border-t border-gray-200 min-w-0">
      {/* Outer Accordion Header */}
      <button
        type="button"
        onClick={handleToggleOuter}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50/80 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sliders className="w-3.5 h-3.5 text-gray-500 stroke-[1.5] shrink-0" />
          <span className="text-xs font-semibold text-gray-800 truncate">Advanced Settings</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-gray-400">
            {isOuterOpen ? 'Expanded' : 'Collapsed'}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${
              isOuterOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Accordion List: Full-Width Rows, Only ONE Open at a Time */}
      {isOuterOpen && (
        <div className="px-3 pb-8 space-y-2 bg-gray-50/40">
          {/* Row 1: Artboard */}
          <div className="border border-gray-200 rounded-lg bg-white overflow-hidden min-w-0">
            <button
              type="button"
              onClick={() => handleToggleGroup('artboard')}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="w-3.5 h-3.5 text-indigo-600 stroke-[1.5] shrink-0" />
                <span className="text-xs font-semibold text-gray-800 truncate">Artboard</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 shrink-0 ${
                  openGroup === 'artboard' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openGroup === 'artboard' && (
              <div className="p-3.5 pt-1 space-y-3 border-t border-gray-100 min-w-0">
                {/* Preset */}
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Preset</label>
                  <select
                    value={artboardSettings.preset || 'auto'}
                    onChange={(e) => handleArtboardPresetChange(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    {ARTBOARD_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Orientation */}
                {artboardSettings.preset !== 'auto' && (
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Orientation</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const w = artboardSettings.width || 60;
                          const h = artboardSettings.height || 40;
                          onChangeArtboard({
                            ...artboardSettings,
                            orientation: 'landscape',
                            width: Math.max(w, h),
                            height: Math.min(w, h),
                          });
                        }}
                        className={`h-8 rounded-lg text-xs font-medium border cursor-pointer ${
                          artboardSettings.orientation === 'landscape'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Landscape
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const w = artboardSettings.width || 60;
                          const h = artboardSettings.height || 40;
                          onChangeArtboard({
                            ...artboardSettings,
                            orientation: 'portrait',
                            width: Math.min(w, h),
                            height: Math.max(w, h),
                          });
                        }}
                        className={`h-8 rounded-lg text-xs font-medium border cursor-pointer ${
                          artboardSettings.orientation === 'portrait'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Portrait
                      </button>
                    </div>
                  </div>
                )}

                {/* Background Color */}
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1.5">Background</label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PRESET_BG_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => onChangeArtboard({ ...artboardSettings, background: c.value })}
                        style={{ backgroundColor: c.value }}
                        className={`w-6 h-6 rounded-md border transition-transform cursor-pointer ${
                          (artboardSettings.background || '#ffffff') === c.value
                            ? 'scale-110 border-indigo-600 ring-2 ring-indigo-200'
                            : 'border-gray-300 hover:scale-105'
                        }`}
                        title={c.label}
                      />
                    ))}
                    <input
                      type="color"
                      value={artboardSettings.background || '#ffffff'}
                      onChange={(e) => onChangeArtboard({ ...artboardSettings, background: e.target.value })}
                      className="w-6 h-6 rounded-md border border-gray-300 cursor-pointer p-0"
                      title="Custom color"
                    />
                  </div>
                </div>

                {/* Border */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={artboardSettings.border?.enabled ?? false}
                      onChange={(e) =>
                        onChangeArtboard({
                          ...artboardSettings,
                          border: { ...(artboardSettings.border || {}), enabled: e.target.checked },
                        })
                      }
                      className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <span>Card border</span>
                  </label>
                  {artboardSettings.border?.enabled && (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={artboardSettings.border?.color || '#cbd5e1'}
                        onChange={(e) =>
                          onChangeArtboard({
                            ...artboardSettings,
                            border: { ...artboardSettings.border, color: e.target.value },
                          })
                        }
                        className="w-5 h-5 rounded cursor-pointer border border-gray-300 p-0"
                      />
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={artboardSettings.border?.width || 1}
                        onChange={(e) =>
                          onChangeArtboard({
                            ...artboardSettings,
                            border: { ...artboardSettings.border, width: parseInt(e.target.value, 10) || 1 },
                          })
                        }
                        className="w-12 h-6 px-1.5 text-xs text-center border border-gray-300 rounded font-mono"
                      />
                      <span className="text-[10px] text-gray-400">px</span>
                    </div>
                  )}
                </div>

                {/* Corner Radius */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-gray-700 font-medium">Corner radius</span>
                    <span className="font-mono text-gray-500">{artboardSettings.radius || 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    value={artboardSettings.radius || 0}
                    onChange={(e) =>
                      onChangeArtboard({
                        ...artboardSettings,
                        radius: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Placement */}
          <div className="border border-gray-200 rounded-lg bg-white overflow-hidden min-w-0">
            <button
              type="button"
              onClick={() => handleToggleGroup('placement')}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Layout className="w-3.5 h-3.5 text-indigo-600 stroke-[1.5] shrink-0" />
                <span className="text-xs font-semibold text-gray-800 truncate">Placement</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 shrink-0 ${
                  openGroup === 'placement' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openGroup === 'placement' && (
              <div className="p-3.5 pt-1 space-y-3 border-t border-gray-100 min-w-0">
                {/* 3x3 Alignment */}
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1.5">Alignment grid</label>
                  <div className="grid grid-cols-3 gap-1.5 w-32 mx-auto p-1.5 bg-gray-100 rounded-lg border border-gray-200">
                    {ALIGNMENTS.map((align) => {
                      const isSelected = (artboardSettings.alignment || 'center') === align.id;
                      return (
                        <button
                          key={align.id}
                          type="button"
                          onClick={() => onChangeArtboard({ ...artboardSettings, alignment: align.id })}
                          className={`w-8 h-8 rounded flex items-center justify-center transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-200'
                          }`}
                          title={align.label}
                        >
                          <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-gray-400'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fit Mode */}
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Fit mode</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'original', label: 'Original' },
                      { id: 'fit', label: 'Fit' },
                      { id: 'fill-width', label: 'Fill width' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => onChangeArtboard({ ...artboardSettings, fit: mode.id })}
                        className={`h-8 rounded-lg text-xs font-medium border cursor-pointer ${
                          (artboardSettings.fit || 'original') === mode.id
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Padding */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-gray-700 font-medium">Padding</span>
                    <span className="font-mono text-gray-500">
                      {artboardSettings.padding !== undefined ? artboardSettings.padding : 5} {artboardSettings.unit || 'mm'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={artboardSettings.padding !== undefined ? artboardSettings.padding : 5}
                    onChange={(e) =>
                      onChangeArtboard({
                        ...artboardSettings,
                        padding: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                {/* X & Y Offsets */}
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">Fine position offset</span>
                    <button
                      type="button"
                      onClick={() => onChangeArtboard({ ...artboardSettings, xOffset: 0, yOffset: 0 })}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 stroke-[1.5]" />
                      <span>Reset</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] text-gray-500 mb-0.5">X offset (px)</span>
                      <NumberStepper
                        value={artboardSettings.xOffset || 0}
                        onChange={(val) => onChangeArtboard({ ...artboardSettings, xOffset: parseInt(val, 10) || 0 })}
                        min={-500}
                        max={500}
                        step={1}
                        shiftStep={10}
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-500 mb-0.5">Y offset (px)</span>
                      <NumberStepper
                        value={artboardSettings.yOffset || 0}
                        onChange={(val) => onChangeArtboard({ ...artboardSettings, yOffset: parseInt(val, 10) || 0 })}
                        min={-500}
                        max={500}
                        step={1}
                        shiftStep={10}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Row 3: Code Style */}
          <div className="border border-gray-200 rounded-lg bg-white overflow-hidden min-w-0">
            <button
              type="button"
              onClick={() => handleToggleGroup('codeStyle')}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Maximize2 className="w-3.5 h-3.5 text-indigo-600 stroke-[1.5] shrink-0" />
                <span className="text-xs font-semibold text-gray-800 truncate">Code style</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 shrink-0 ${
                  openGroup === 'codeStyle' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openGroup === 'codeStyle' && (
              <div className="p-3.5 pt-1 space-y-3.5 border-t border-gray-100 min-w-0">
                {type === 'barcode' ? (
                  <>
                    {/* Barcode Width */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">Width ({currentUnit})</span>
                        <span className="font-mono text-gray-500">{settings.width} {currentUnit}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <NumberStepper
                          value={settings.width || 60}
                          onChange={(val) => onChangeSettings({ ...settings, width: parseFloat(val) || 0 })}
                          min={unitConfig.min}
                          max={unitConfig.max}
                          step={getDimensionStep(settings.width || 60)}
                          shiftStep={currentUnit === 'mm' ? 10 : 20}
                          className="w-28 shrink-0"
                        />
                        <input
                          type="range"
                          min={unitConfig.min}
                          max={unitConfig.max}
                          step={unitConfig.step}
                          value={settings.width || 60}
                          onChange={(e) => onChangeSettings({ ...settings, width: parseFloat(e.target.value) || 0 })}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Barcode Height */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">Height ({currentUnit})</span>
                        <span className="font-mono text-gray-500">{settings.height} {currentUnit}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <NumberStepper
                          value={settings.height || 25}
                          onChange={(val) => onChangeSettings({ ...settings, height: parseFloat(val) || 0 })}
                          min={currentUnit === 'px' ? 30 : unitConfig.min * 0.4}
                          max={currentUnit === 'px' ? 400 : unitConfig.max * 0.5}
                          step={getDimensionStep(settings.height || 25)}
                          shiftStep={currentUnit === 'mm' ? 5 : 10}
                          className="w-28 shrink-0"
                        />
                        <input
                          type="range"
                          min={currentUnit === 'px' ? 30 : unitConfig.min * 0.4}
                          max={currentUnit === 'px' ? 400 : unitConfig.max * 0.5}
                          step={unitConfig.step}
                          value={settings.height || 25}
                          onChange={(e) => onChangeSettings({ ...settings, height: parseFloat(e.target.value) || 0 })}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Margin */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">Quiet zone margin (px)</span>
                        <span className="font-mono text-gray-500">{settings.margin ?? 6}px</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <NumberStepper
                          value={settings.margin ?? 6}
                          onChange={(val) => onChangeSettings({ ...settings, margin: parseInt(val, 10) || 0 })}
                          min={0}
                          max={40}
                          step={1}
                          shiftStep={5}
                          className="w-28 shrink-0"
                        />
                        <input
                          type="range"
                          min="0"
                          max="40"
                          step="1"
                          value={settings.margin ?? 6}
                          onChange={(e) => onChangeSettings({ ...settings, margin: parseInt(e.target.value, 10) || 0 })}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Show Encoded Text */}
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                      <span className="font-medium text-gray-800">Show number under bars</span>
                      <input
                        type="checkbox"
                        checked={settings.displayValue ?? true}
                        onChange={(e) => onChangeSettings({ ...settings, displayValue: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 cursor-pointer"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* QR Code Precision Sizing */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-700">QR size ({currentUnit})</span>
                          {qrPercentOfArtboard && (
                            <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-medium">
                              {qrPercentOfArtboard}% of artboard
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleFitQrToArtboard}
                          className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                          title="Fit largest size within artboard margins"
                        >
                          <Maximize className="w-3 h-3 stroke-[1.5]" />
                          <span>Fit</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <NumberStepper
                          value={qrSizeInActiveUnit}
                          onChange={(val) => onChangeSettings({ ...settings, size: parseFloat(val) || 0 })}
                          min={qrMinScannable}
                          max={artboardSettings.preset !== 'auto' ? maxAvailableInArtboard : 200}
                          step={getDimensionStep(qrSizeInActiveUnit)}
                          shiftStep={currentUnit === 'mm' ? 5 : 10}
                          className="w-28 shrink-0"
                        />
                        <input
                          type="range"
                          min={qrMinScannable}
                          max={artboardSettings.preset !== 'auto' ? Math.max(qrMinScannable + 10, maxAvailableInArtboard) : 200}
                          step={unitConfig.step}
                          value={qrSizeInActiveUnit}
                          onChange={(e) => onChangeSettings({ ...settings, size: parseFloat(e.target.value) || 0 })}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      {qrIsTooSmall && (
                        <p className="mt-1 text-[11px] text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0 stroke-[1.5]" />
                          <span>Below recommended scannable minimum ({qrMinScannable} {currentUnit})</span>
                        </p>
                      )}
                    </div>

                    {/* Error Correction */}
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">
                        Error correction
                      </label>
                      <select
                        value={settings.errorCorrection || 'Q'}
                        onChange={(e) => onChangeSettings({ ...settings, errorCorrection: e.target.value })}
                        className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs text-gray-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                      >
                        {ERROR_CORRECTION_LEVELS.map((lvl) => (
                          <option key={lvl.value} value={lvl.value}>
                            {lvl.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Dot Style */}
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">Dot style</label>
                      <select
                        value={settings.dotStyle || 'rounded'}
                        onChange={(e) => onChangeSettings({ ...settings, dotStyle: e.target.value })}
                        className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs text-gray-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                      >
                        {DOT_STYLES.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Corner Style */}
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">Corner style</label>
                      <select
                        value={settings.cornerStyle || 'extra-rounded'}
                        onChange={(e) => onChangeSettings({ ...settings, cornerStyle: e.target.value })}
                        className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs text-gray-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                      >
                        {CORNER_STYLES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Logo Upload */}
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">Center logo</label>
                      {settings.logo ? (
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                          <img src={settings.logo} alt="Logo" className="w-8 h-8 object-contain rounded" />
                          <button
                            type="button"
                            onClick={() => onChangeSettings({ ...settings, logo: null })}
                            className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" /> Remove
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-1.5 h-8 px-3 border border-dashed border-gray-300 rounded-lg text-xs text-gray-600 hover:border-gray-400 hover:bg-gray-50 cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5 stroke-[1.5]" />
                          <span>Upload logo image</span>
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="sr-only" />
                        </label>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Row 4: Text Style */}
          <div className="border border-gray-200 rounded-lg bg-white overflow-hidden min-w-0">
            <button
              type="button"
              onClick={() => handleToggleGroup('textStyle')}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Type className="w-3.5 h-3.5 text-indigo-600 stroke-[1.5] shrink-0" />
                <span className="text-xs font-semibold text-gray-800 truncate">Text style</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 shrink-0 ${
                  openGroup === 'textStyle' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openGroup === 'textStyle' && (
              <div className="p-3.5 pt-1 space-y-3.5 border-t border-gray-100 min-w-0">
                {/* Font Size */}
                <div>
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span className="font-medium text-gray-700">Font size</span>
                    <div className="inline-flex p-0.5 bg-gray-100 rounded text-[10px]">
                      {['pt', 'px'].map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => onChangeSettings({ ...settings, labelFontUnit: u })}
                          className={`px-1.5 py-0.5 rounded cursor-pointer ${
                            (settings.labelFontUnit || 'pt') === u
                              ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                              : 'text-gray-600'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <NumberStepper
                      value={settings.labelFontSize || 11}
                      onChange={(val) => onChangeSettings({ ...settings, labelFontSize: parseFloat(val) || 11 })}
                      min={6}
                      max={72}
                      step={1}
                      shiftStep={10}
                      className="w-28 shrink-0"
                    />
                    <input
                      type="range"
                      min="6"
                      max="48"
                      step="1"
                      value={settings.labelFontSize || 11}
                      onChange={(e) => onChangeSettings({ ...settings, labelFontSize: parseFloat(e.target.value) || 11 })}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Gap */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">Gap from code</span>
                    <span className="font-mono text-gray-500">{settings.labelGap ?? 4}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <NumberStepper
                      value={settings.labelGap ?? 4}
                      onChange={(val) => onChangeSettings({ ...settings, labelGap: parseInt(val, 10) || 0 })}
                      min={0}
                      max={40}
                      step={1}
                      shiftStep={10}
                      className="w-28 shrink-0"
                    />
                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="1"
                      value={settings.labelGap ?? 4}
                      onChange={(e) => onChangeSettings({ ...settings, labelGap: parseInt(e.target.value, 10) || 0 })}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Weight & Alignment */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[11px] font-medium text-gray-700 mb-1">Font weight</span>
                    <div className="grid grid-cols-2 gap-1">
                      {['normal', 'bold'].map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => onChangeSettings({ ...settings, labelWeight: w })}
                          className={`h-8 rounded text-xs font-medium border capitalize cursor-pointer ${
                            (settings.labelWeight || 'normal') === w
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="block text-[11px] font-medium text-gray-700 mb-1">Alignment</span>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'left', icon: AlignLeft },
                        { id: 'center', icon: AlignCenter },
                        { id: 'right', icon: AlignRight },
                      ].map((a) => {
                        const Icon = a.icon;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => onChangeSettings({ ...settings, labelAlign: a.id })}
                            className={`h-8 rounded border flex items-center justify-center cursor-pointer ${
                              (settings.labelAlign || 'center') === a.id
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 stroke-[1.5]" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Row 5: Units & Export */}
          <div className="border border-gray-200 rounded-lg bg-white overflow-hidden min-w-0">
            <button
              type="button"
              onClick={() => handleToggleGroup('units')}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Sliders className="w-3.5 h-3.5 text-indigo-600 stroke-[1.5] shrink-0" />
                <span className="text-xs font-semibold text-gray-800 truncate">Units & export</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 shrink-0 ${
                  openGroup === 'units' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openGroup === 'units' && (
              <div className="p-3.5 pt-1 space-y-3.5 border-t border-gray-100 min-w-0">
                {/* Unit Switch */}
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Default unit</label>
                  <div className="grid grid-cols-4 gap-1 p-0.5 bg-gray-100 rounded-lg border border-gray-200">
                    {['mm', 'cm', 'inch', 'px'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => {
                          onChangeSettings({ ...settings, unit: u });
                          onChangeArtboard({ ...artboardSettings, unit: u });
                        }}
                        className={`h-7 rounded text-xs font-medium cursor-pointer ${
                          (settings.unit || 'mm') === u
                            ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Export DPI */}
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Export DPI</label>
                  <div className="grid grid-cols-4 gap-1 p-0.5 bg-gray-100 rounded-lg border border-gray-200">
                    {DPIS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => onChangeDpi(d)}
                        className={`h-7 rounded text-xs font-medium cursor-pointer ${
                          dpi === d
                            ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lock aspect ratio */}
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                  <span className="font-medium text-gray-800">Lock aspect ratio</span>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeSettings({
                        ...settings,
                        lockAspectRatio: !settings.lockAspectRatio,
                      })
                    }
                    className="p-1 rounded text-gray-600 hover:text-gray-900 cursor-pointer"
                  >
                    {settings.lockAspectRatio ? (
                      <Lock className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Unlock className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>

                {/* Export code only */}
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                  <div>
                    <span className="font-medium text-gray-800 block">Export code only</span>
                    <span className="text-[10px] text-gray-400">Ignore artboard background & border</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={artboardSettings.exportCodeOnly ?? false}
                    onChange={(e) =>
                      onChangeArtboard({
                        ...artboardSettings,
                        exportCodeOnly: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Reset advanced settings link */}
          <div className="pt-3 pb-2 text-center">
            <button
              type="button"
              onClick={onResetAdvanced}
              className="text-xs text-gray-500 hover:text-indigo-600 transition-colors cursor-pointer inline-flex items-center gap-1 font-medium"
            >
              <RotateCcw className="w-3 h-3 stroke-[1.5]" />
              <span>Reset advanced settings</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
