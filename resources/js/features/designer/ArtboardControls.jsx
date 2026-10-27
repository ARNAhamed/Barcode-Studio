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
          <label className="text-xs font-medium text-gray-700">
            Artboard Canvas Preset
          </label>
          <span className="text-xs text-gray-400">
            {isAuto ? 'Canvas matches code bounds' : 'Fixed label/card size'}
          </span>
        </div>

        <select
          id="artboard-preset-select"
          value={settings.preset || 'auto'}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors cursor-pointer"
        >
          {ARTBOARD_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {!isAuto && (
        <div className="space-y-5 pt-3 border-t border-gray-100">
          {/* Unit Selector & Dimensions */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-gray-900">
                  Canvas Dimensions
                </span>
                <p className="text-xs text-gray-500">Physical artboard label size</p>
              </div>

              {/* Unit Selector Segmented Control */}
              <div className="inline-flex p-0.5 bg-gray-100 border border-gray-200 rounded-lg self-start sm:self-auto">
                {UNITS.map((u) => (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => handleUnitChange(u.value)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      currentUnit === u.value
                        ? 'bg-white text-indigo-600 font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
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
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Width ({currentUnit})
                </label>
                <input
                  type="number"
                  step={unitConfig.step}
                  min={1}
                  value={settings.width}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                />
              </div>

              {/* Height Input & Aspect Lock */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700">
                    Height ({currentUnit})
                  </label>
                  <button
                    type="button"
                    onClick={toggleAspectLock}
                    className={`inline-flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer ${
                      settings.lockAspectRatio
                        ? 'text-indigo-600 font-semibold'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title={settings.lockAspectRatio ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                  >
                    {settings.lockAspectRatio ? (
                      <>
                        <Lock className="w-3 h-3 stroke-[1.5]" /> Locked
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3 stroke-[1.5]" /> Unlocked
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
                  className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                />
              </div>
            </div>

            {/* Orientation Toggle */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-medium text-gray-700">Orientation</span>
              <div className="inline-flex p-0.5 bg-gray-100 border border-gray-200 rounded-lg">
                <button
                  type="button"
                  onClick={() => toggleOrientation('landscape')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    settings.orientation === 'landscape'
                      ? 'bg-white text-indigo-600 font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Landscape (W &gt; H)
                </button>
                <button
                  type="button"
                  onClick={() => toggleOrientation('portrait')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    settings.orientation === 'portrait'
                      ? 'bg-white text-indigo-600 font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Portrait (H &gt; W)
                </button>
              </div>
            </div>

            {dimensionError && (
              <p className="text-xs text-red-600 font-medium">{dimensionError}</p>
            )}
          </div>

          {/* Artboard Styling: Background, Border, Corner Radius */}
          <div className="space-y-4 pt-3 border-t border-gray-100">
            <span className="text-xs font-semibold text-gray-900 block">
              Artboard Appearance
            </span>

            {/* Background Color */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
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
                      className={`w-6 h-6 rounded-md border border-gray-300 transition-colors cursor-pointer ${
                        settings.background === c.value ? 'ring-2 ring-indigo-600 ring-offset-1' : 'hover:border-gray-400'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={settings.background || '#ffffff'}
                  onChange={(e) => onChange({ ...settings, background: e.target.value })}
                  className="w-7 h-7 p-0 rounded-md border border-gray-300 cursor-pointer"
                  title="Custom Color"
                />
              </div>
            </div>

            {/* Border & Corner Radius */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Optional Border */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
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
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
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
                      className="w-6 h-6 p-0 rounded border border-gray-300 cursor-pointer"
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
                      className="w-16 h-8 px-2 text-xs border border-gray-300 rounded-lg bg-white"
                      title="Border width in px"
                    />
                    <span className="text-xs text-gray-500">px</span>
                  </div>
                )}
              </div>

              {/* Corner Radius */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-gray-700">Corner Radius</label>
                  <span className="text-xs font-mono text-gray-500">{settings.radius || 0}px</span>
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
          <div className="space-y-4 pt-3 border-t border-gray-100">
            <span className="text-xs font-semibold text-gray-900 block">
              Code Placement &amp; Scaling
            </span>

            {/* Fit Mode */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Fit Mode
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-0.5 bg-gray-100 border border-gray-200 rounded-lg">
                {[
                  { id: 'original', label: 'Original size' },
                  { id: 'fit', label: 'Fit to artboard' },
                  { id: 'fill-width', label: 'Fill width' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onChange({ ...settings, fit: f.id })}
                    className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer truncate ${
                      (settings.fit || 'original') === f.id
                        ? 'bg-white text-indigo-600 font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
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
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Alignment Grid
                </label>
                <div className="inline-grid grid-cols-3 gap-1 p-1 bg-gray-100 border border-gray-200 rounded-lg">
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
                      className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                        (settings.alignment || 'center') === a.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                      title={a.label}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-xs ${
                          (settings.alignment || 'center') === a.id ? 'bg-white' : 'bg-gray-400'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Padding / Margin */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
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
                  className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">Margin around outer canvas edge</p>
              </div>
            </div>

            {/* Fine Position: X & Y Offset + Reset Position */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-gray-400 stroke-[1.5]" /> Fine Position Offset
                </span>
                {(settings.xOffset !== 0 || settings.yOffset !== 0) && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...settings, xOffset: 0, yOffset: 0 })}
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 stroke-[1.5]" /> Reset position
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">X Offset (px)</label>
                  <input
                    type="number"
                    value={settings.xOffset || 0}
                    onChange={(e) =>
                      onChange({
                        ...settings,
                        xOffset: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Y Offset (px)</label>
                  <input
                    type="number"
                    value={settings.yOffset || 0}
                    onChange={(e) =>
                      onChange({
                        ...settings,
                        yOffset: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-900"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Tip: You can also drag the code directly inside the preview canvas.
              </p>
            </div>
          </div>

          {/* Export Code Only Checkbox */}
          <div className="pt-2 border-t border-gray-100">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(settings.exportCodeOnly)}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    exportCodeOnly: e.target.checked,
                  })
                }
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span>Export code only (without artboard canvas)</span>
            </label>
            <p className="text-xs text-gray-400 pl-6 mt-0.5">
              Downloads and preview thumbnail will omit the background artboard.
            </p>
          </div>

          {/* Warnings */}
          {codeExceedsWarning && (
            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-900 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
              <div>
                <p className="font-semibold">Code exceeds artboard bounds</p>
                <p className="text-xs text-amber-700 mt-0.5">{codeExceedsWarning}</p>
              </div>
            </div>
          )}

          {scannabilityWarning && (
            <div className="p-3 bg-red-50/60 border border-red-200 rounded-lg flex items-start gap-2 text-red-900 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />
              <div>
                <p className="font-semibold">Scannability Warning</p>
                <p className="text-xs text-red-700 mt-0.5">{scannabilityWarning}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
