import React from 'react';
import {
  Maximize,
  RotateCw,
  Lock,
  Unlock,
  Move,
  RotateCcw,
  AlertTriangle,
  Info,
  Check,
  Square,
  Layout,
} from 'lucide-react';
import {
  UNITS,
  ARTBOARD_PRESETS,
  convertUnit,
  toPx,
  fromPx,
  getPresetDimensionsInUnit,
  validateArtboardDimension,
} from '../../utils/units';

const ALIGNMENTS = [
  { id: 'top-left', label: 'Top Left', row: 1, col: 1 },
  { id: 'top-center', label: 'Top Center', row: 1, col: 2 },
  { id: 'top-right', label: 'Top Right', row: 1, col: 3 },
  { id: 'middle-left', label: 'Middle Left', row: 2, col: 1 },
  { id: 'center', label: 'Center', row: 2, col: 2 },
  { id: 'middle-right', label: 'Middle Right', row: 2, col: 3 },
  { id: 'bottom-left', label: 'Bottom Left', row: 3, col: 1 },
  { id: 'bottom-center', label: 'Bottom Center', row: 3, col: 2 },
  { id: 'bottom-right', label: 'Bottom Right', row: 3, col: 3 },
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

export default function ArtboardControls({
  settings,
  onChange,
  codeDimensions, // { widthPx, heightPx }
  scannabilityWarning = null,
  codeExceedsWarning = null,
}) {
  const currentUnit = settings.unit || 'mm';
  const unitConfig = UNITS.find((u) => u.value === currentUnit) || UNITS[2]; // default mm

  const isAuto = settings.preset === 'auto';

  // Handle Preset Change
  const handlePresetChange = (presetId) => {
    if (presetId === 'auto') {
      onChange({
        ...settings,
        preset: 'auto',
      });
      return;
    }

    const preset = ARTBOARD_PRESETS.find((p) => p.id === presetId);
    if (!preset || presetId === 'custom') {
      onChange({
        ...settings,
        preset: 'custom',
      });
      return;
    }

    const dims = getPresetDimensionsInUnit(preset, currentUnit);
    if (!dims) return;

    const isPortrait = dims.height > dims.width;
    onChange({
      ...settings,
      preset: presetId,
      width: dims.width,
      height: dims.height,
      orientation: isPortrait ? 'portrait' : 'landscape',
    });
  };

  // Handle Unit Change
  const handleUnitChange = (newUnit) => {
    if (newUnit === currentUnit) return;
    const newWidth = convertUnit(settings.width, currentUnit, newUnit, 2);
    const newHeight = convertUnit(settings.height, currentUnit, newUnit, 2);
    const newPadding = convertUnit(settings.padding || 5, currentUnit, newUnit, 2);

    onChange({
      ...settings,
      unit: newUnit,
      width: newWidth,
      height: newHeight,
      padding: newPadding,
    });
  };

  // Handle Width Input
  const handleWidthChange = (val) => {
    const num = parseFloat(val);
    const updates = {
      preset: 'custom',
      width: isNaN(num) ? val : num,
    };

    if (settings.lockAspectRatio && !isNaN(num) && num > 0) {
      const ratio = (settings.width && settings.height && settings.height > 0)
        ? settings.width / settings.height
        : 2;
      updates.height = fromPx(toPx(num, currentUnit) / ratio, currentUnit, 2);
    }

    onChange({ ...settings, ...updates });
  };

  // Handle Height Input
  const handleHeightChange = (val) => {
    const num = parseFloat(val);
    const updates = {
      preset: 'custom',
      height: isNaN(num) ? val : num,
    };

    if (settings.lockAspectRatio && !isNaN(num) && num > 0) {
      const ratio = (settings.width && settings.height && settings.height > 0)
        ? settings.width / settings.height
        : 2;
      updates.width = fromPx(toPx(num, currentUnit) * ratio, currentUnit, 2);
    }

    onChange({ ...settings, ...updates });
  };

  // Toggle Orientation (Swap width and height)
  const toggleOrientation = (targetOrientation) => {
    if (settings.orientation === targetOrientation) return;

    const currentW = parseFloat(settings.width) || 100;
    const currentH = parseFloat(settings.height) || 50;

    // Determine if we need to swap dimensions
    const isCurrentlyLandscape = currentW >= currentH;
    const wantsLandscape = targetOrientation === 'landscape';

    let newW = currentW;
    let newH = currentH;

    if ((wantsLandscape && !isCurrentlyLandscape) || (!wantsLandscape && isCurrentlyLandscape)) {
      newW = currentH;
      newH = currentW;
    }

    onChange({
      ...settings,
      orientation: targetOrientation,
      width: newW,
      height: newH,
    });
  };

  // Toggle Aspect Ratio Lock
  const toggleAspectLock = () => {
    onChange({
      ...settings,
      lockAspectRatio: !settings.lockAspectRatio,
    });
  };

  // Validation
  const widthError = !isAuto ? validateArtboardDimension(settings.width, currentUnit) : null;
  const heightError = !isAuto ? validateArtboardDimension(settings.height, currentUnit) : null;
  const dimensionError = widthError || heightError;

  return (
    <div className="space-y-5">
      {/* Preset Selector */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Artboard Canvas Preset
          </label>
          <span className="text-[11px] text-slate-400">
            {isAuto ? 'Canvas matches code bounds' : 'Fixed label/card size'}
          </span>
        </div>

        <select
          id="artboard-preset-select"
          value={settings.preset || 'auto'}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
        >
          {ARTBOARD_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {!isAuto && (
        <>
          {/* Unit Selector & Dimensions */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Canvas Dimensions
                </span>
                <p className="text-[11px] text-slate-500">Physical artboard label size</p>
              </div>

              {/* Unit Selector Segmented Control */}
              <div className="inline-flex p-0.5 bg-slate-200 rounded-lg self-start sm:self-auto">
                {UNITS.map((u) => (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => handleUnitChange(u.value)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      currentUnit === u.value
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Width, Height, Lock, Orientation Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              {/* Width Input */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Width ({currentUnit})
                </label>
                <input
                  type="number"
                  step={unitConfig.step}
                  min={1}
                  value={settings.width}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Height Input & Aspect Lock */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-600">
                    Height ({currentUnit})
                  </label>
                  <button
                    type="button"
                    onClick={toggleAspectLock}
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                      settings.lockAspectRatio
                        ? 'text-indigo-600'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title={settings.lockAspectRatio ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                  >
                    {settings.lockAspectRatio ? (
                      <>
                        <Lock className="w-3 h-3" /> Locked
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3" /> Unlocked
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="number"
                  step={unitConfig.step}
                  min={1}
                  value={settings.height}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            {/* Orientation Toggle */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-medium text-slate-600">Orientation</span>
              <div className="inline-flex p-0.5 bg-slate-200/80 rounded-lg">
                <button
                  type="button"
                  onClick={() => toggleOrientation('landscape')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    settings.orientation === 'landscape'
                      ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Landscape (W &gt; H)
                </button>
                <button
                  type="button"
                  onClick={() => toggleOrientation('portrait')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    settings.orientation === 'portrait'
                      ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Portrait (H &gt; W)
                </button>
              </div>
            </div>

            {dimensionError && (
              <p className="text-xs text-rose-500 font-medium">{dimensionError}</p>
            )}
          </div>

          {/* Artboard Styling: Background, Border, Corner Radius */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-4">
            <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider block pb-2 border-b border-slate-200">
              Artboard Appearance
            </span>

            {/* Background Color */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Background Color
              </label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {PRESET_BG_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => onChange({ ...settings, background: c.value })}
                      style={{ backgroundColor: c.value }}
                      className={`w-6 h-6 rounded-full border border-slate-300 shadow-2xs transition-transform cursor-pointer ${
                        settings.background === c.value ? 'ring-2 ring-indigo-500 scale-110' : 'hover:scale-105'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={settings.background || '#ffffff'}
                  onChange={(e) => onChange({ ...settings, background: e.target.value })}
                  className="w-7 h-7 p-0 rounded-md border border-slate-300 cursor-pointer"
                  title="Custom Color"
                />
              </div>
            </div>

            {/* Border & Corner Radius */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Optional Border */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.border?.enabled)}
                    onChange={(e) =>
                      onChange({
                        ...settings,
                        border: {
                          ...(settings.border || { color: '#cbd5e1', width: 1 }),
                          enabled: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span>Show Card Border</span>
                </label>

                {settings.border?.enabled && (
                  <div className="flex items-center gap-2 pl-6">
                    <input
                      type="color"
                      value={settings.border?.color || '#cbd5e1'}
                      onChange={(e) =>
                        onChange({
                          ...settings,
                          border: { ...settings.border, color: e.target.value },
                        })
                      }
                      className="w-6 h-6 p-0 rounded border border-slate-300 cursor-pointer"
                    />
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={settings.border?.width || 1}
                      onChange={(e) =>
                        onChange({
                          ...settings,
                          border: {
                            ...settings.border,
                            width: Math.max(1, parseInt(e.target.value, 10) || 1),
                          },
                        })
                      }
                      className="w-16 px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                      title="Border width in px"
                    />
                    <span className="text-xs text-slate-400">px</span>
                  </div>
                )}
              </div>

              {/* Corner Radius */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-600">Corner Radius</label>
                  <span className="text-xs font-mono text-slate-500">{settings.radius || 0}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={settings.radius || 0}
                  onChange={(e) =>
                    onChange({ ...settings, radius: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Placing & Fitting the Code on the Artboard */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-4">
            <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider block pb-2 border-b border-slate-200">
              Code Placement &amp; Scaling
            </span>

            {/* Fit Mode */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Fit Mode
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/80 rounded-xl">
                {[
                  { id: 'original', label: 'Original size' },
                  { id: 'fit', label: 'Fit to artboard' },
                  { id: 'fill-width', label: 'Fill width' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onChange({ ...settings, fit: f.id })}
                    className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all cursor-pointer truncate ${
                      (settings.fit || 'original') === f.id
                        ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 9-Position Alignment & Margin / Padding */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* 3x3 Alignment Grid */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Alignment Grid
                </label>
                <div className="inline-grid grid-cols-3 gap-1 p-1 bg-slate-200/80 rounded-xl">
                  {ALIGNMENTS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...settings,
                          alignment: a.id,
                          xOffset: 0,
                          yOffset: 0,
                        })
                      }
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        (settings.alignment || 'center') === a.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                      title={a.label}
                    >
                      <div
                        className={`w-2 h-2 rounded-xs ${
                          (settings.alignment || 'center') === a.id ? 'bg-white' : 'bg-slate-400'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Padding / Margin */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Artboard Padding ({currentUnit})
                </label>
                <input
                  type="number"
                  step={unitConfig.step}
                  min={0}
                  value={settings.padding !== undefined ? settings.padding : 5}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      padding: Math.max(0, parseFloat(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <p className="text-[11px] text-slate-400 mt-1">Margin around outer canvas edge</p>
              </div>
            </div>

            {/* Fine Position: X & Y Offset + Reset Position */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-slate-400" /> Fine Position Offset
                </span>
                {(settings.xOffset !== 0 || settings.yOffset !== 0) && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...settings, xOffset: 0, yOffset: 0 })}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset position
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">X Offset (px)</label>
                  <input
                    type="number"
                    value={settings.xOffset || 0}
                    onChange={(e) =>
                      onChange({
                        ...settings,
                        xOffset: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">Y Offset (px)</label>
                  <input
                    type="number"
                    value={settings.yOffset || 0}
                    onChange={(e) =>
                      onChange({
                        ...settings,
                        yOffset: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Tip: You can also drag the code directly inside the preview canvas.
              </p>
            </div>
          </div>

          {/* Export Code Only Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(settings.exportCodeOnly)}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    exportCodeOnly: e.target.checked,
                  })
                }
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span>Export code only (without artboard canvas)</span>
            </label>
            <p className="text-[11px] text-slate-400 pl-6 mt-0.5">
              Downloads and preview thumbnail will omit the background artboard.
            </p>
          </div>

          {/* Warnings */}
          {codeExceedsWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Code exceeds artboard bounds</p>
                <p className="text-[11px] text-amber-700 mt-0.5">{codeExceedsWarning}</p>
              </div>
            </div>
          )}

          {scannabilityWarning && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Scannability Warning</p>
                <p className="text-[11px] text-rose-700 mt-0.5">{scannabilityWarning}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
