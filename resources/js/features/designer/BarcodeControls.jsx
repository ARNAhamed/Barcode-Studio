import React from 'react';
import { Lock, Unlock, AlertTriangle, Info } from 'lucide-react';
import { UNITS, convertUnit, toPx, fromPx } from '../../utils/units';
import LabelTextControls from './LabelTextControls';

const BARCODE_FORMATS = [
  { value: 'CODE128', label: 'CODE128 (Standard alphanumeric)' },
  { value: 'EAN13', label: 'EAN-13 (12-13 digits)' },
  { value: 'EAN8', label: 'EAN-8 (7-8 digits)' },
  { value: 'UPC', label: 'UPC-A (11-12 digits)' },
  { value: 'CODE39', label: 'CODE39 (Uppercase & symbols)' },
  { value: 'ITF14', label: 'ITF-14 (14 digits)' },
];

export default function BarcodeControls({
  settings,
  onChange,
  validationError,
  calculatedModuleWidth = null,
  sizeError = null,
  section = 'all', // 'size' | 'colors' | 'label' | 'all'
}) {
  const currentUnit = settings.unit || 'px';
  const unitConfig = UNITS.find((u) => u.value === currentUnit) || UNITS[0];

  const handleUnitChange = (newUnit) => {
    if (newUnit === currentUnit) return;
    const newWidth = convertUnit(settings.width, currentUnit, newUnit, 2);
    const newHeight = convertUnit(settings.height, currentUnit, newUnit, 2);
    onChange({
      ...settings,
      unit: newUnit,
      width: newWidth,
      height: newHeight,
    });
  };

  const handleWidthChange = (val) => {
    const num = parseFloat(val);
    const updates = { width: isNaN(num) ? val : num };

    if (settings.lockAspectRatio && !isNaN(num) && num > 0) {
      const ratio = settings.aspectRatio || (settings.width / settings.height) || 2.5;
      updates.height = fromPx(toPx(num, currentUnit) / ratio, currentUnit, 2);
    }

    onChange({ ...settings, ...updates });
  };

  const handleHeightChange = (val) => {
    const num = parseFloat(val);
    const updates = { height: isNaN(num) ? val : num };

    if (settings.lockAspectRatio && !isNaN(num) && num > 0) {
      const ratio = settings.aspectRatio || (settings.width / settings.height) || 2.5;
      updates.width = fromPx(toPx(num, currentUnit) * ratio, currentUnit, 2);
    }

    onChange({ ...settings, ...updates });
  };

  const toggleAspectLock = () => {
    const nextLock = !settings.lockAspectRatio;
    const ratio = (settings.width && settings.height && settings.height > 0)
      ? settings.width / settings.height
      : 2.5;
    onChange({
      ...settings,
      lockAspectRatio: nextLock,
      aspectRatio: ratio,
    });
  };

  // Slider bounds based on unit
  const widthSliderMin = unitConfig.min;
  const widthSliderMax = unitConfig.max;
  const heightSliderMin = currentUnit === 'px' ? 30 : unitConfig.min * 0.5;
  const heightSliderMax = currentUnit === 'px' ? 400 : unitConfig.max * 0.5;

  const renderSizeSection = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-gray-100">
        <div>
          <span className="text-xs font-semibold text-gray-900">
            Barcode Dimensions
          </span>
          <p className="text-xs text-gray-500">Specify physical size of the barcode element</p>
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

      {/* Width & Height Number Inputs with Aspect Ratio Lock */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
        {/* Total Width */}
        <div className="sm:col-span-5">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Width ({currentUnit})
          </label>
          <input
            type="number"
            step={unitConfig.step}
            min={unitConfig.min}
            max={unitConfig.max}
            value={settings.width}
            onChange={(e) => handleWidthChange(e.target.value)}
            className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm font-mono text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          />
        </div>

        {/* Aspect Ratio Lock Toggle Button */}
        <div className="sm:col-span-2 flex justify-center pb-0.5">
          <button
            type="button"
            onClick={toggleAspectLock}
            className={`w-9 h-9 rounded-lg border transition-colors cursor-pointer flex items-center justify-center ${
              settings.lockAspectRatio
                ? 'bg-gray-50 border-indigo-600 text-indigo-600'
                : 'bg-white border-gray-300 text-gray-400 hover:text-gray-600'
            }`}
            title={settings.lockAspectRatio ? 'Unlock Aspect Ratio' : 'Lock Aspect Ratio'}
          >
            {settings.lockAspectRatio ? (
              <Lock className="w-4 h-4 stroke-[1.5]" />
            ) : (
              <Unlock className="w-4 h-4 stroke-[1.5]" />
            )}
          </button>
        </div>

        {/* Total Height */}
        <div className="sm:col-span-5">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Height ({currentUnit})
          </label>
          <input
            type="number"
            step={unitConfig.step}
            min={heightSliderMin}
            max={heightSliderMax}
            value={settings.height}
            onChange={(e) => handleHeightChange(e.target.value)}
            className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm font-mono text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          />
        </div>
      </div>

      {/* Sliders kept in sync */}
      <div className="space-y-3 pt-1">
        <div>
          <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
            <span>Adjust Width</span>
            <span className="font-mono">{settings.width} {currentUnit}</span>
          </div>
          <input
            type="range"
            min={widthSliderMin}
            max={widthSliderMax}
            step={unitConfig.step}
            value={settings.width || widthSliderMin}
            onChange={(e) => handleWidthChange(e.target.value)}
            className="w-full accent-indigo-600 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
            <span>Adjust Height</span>
            <span className="font-mono">{settings.height} {currentUnit}</span>
          </div>
          <input
            type="range"
            min={heightSliderMin}
            max={heightSliderMax}
            step={unitConfig.step}
            value={settings.height || heightSliderMin}
            onChange={(e) => handleHeightChange(e.target.value)}
            className="w-full accent-indigo-600 cursor-pointer"
          />
        </div>
      </div>

      {/* Size validation error */}
      {sizeError && (
        <p className="text-xs text-red-600 font-medium flex items-center gap-1.5 mt-1">
          <AlertTriangle className="w-4 h-4 shrink-0 stroke-[1.5]" />
          <span>{sizeError}</span>
        </p>
      )}

      {/* Scannability Notice / Warning */}
      {calculatedModuleWidth !== null && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-start gap-2 transition-colors ${
            calculatedModuleWidth < 1.0
              ? 'bg-amber-50/60 border-amber-200 text-amber-900'
              : 'bg-gray-50 border-gray-200 text-gray-700'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${
              calculatedModuleWidth < 1.0 ? 'bg-amber-500' : 'bg-gray-400'
            }`}
          />
          <div>
            <p className="font-medium text-gray-900">
              Auto-calculated Bar Module Width: {calculatedModuleWidth.toFixed(2)} px
            </p>
            {calculatedModuleWidth < 1.0 ? (
              <p className="mt-0.5 text-xs text-amber-700">
                Size too small! At under 1px per bar, standard scanners may fail to read the code. Increase the total width or reduce the length of the encoded content.
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-gray-500">
                Optimal density for clear optical scanning.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderColorsSection = () => (
    <div className="space-y-4">
      {/* Symbology Format Selector */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Barcode Symbology
        </label>
        <select
          value={settings.format || 'CODE128'}
          onChange={(e) => onChange({ ...settings, format: e.target.value })}
          className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors cursor-pointer"
        >
          {BARCODE_FORMATS.map((fmt) => (
            <option key={fmt.value} value={fmt.value}>
              {fmt.label}
            </option>
          ))}
        </select>
        {validationError && (
          <p className="mt-1.5 text-xs text-red-600 font-medium">
            {validationError}
          </p>
        )}
      </div>

      {/* Margin & Font Size */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-medium text-gray-700">
              Quiet Zone Margin
            </label>
            <span className="text-xs font-mono text-gray-500">{settings.margin ?? 10}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="40"
            step="2"
            value={settings.margin ?? 10}
            onChange={(e) => onChange({ ...settings, margin: parseInt(e.target.value, 10) })}
            className="w-full accent-indigo-600 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-medium text-gray-700">
              Font Size
            </label>
            <span className="text-xs font-mono text-gray-500">{settings.fontSize || 16}px</span>
          </div>
          <input
            type="range"
            min="10"
            max="26"
            step="1"
            disabled={!settings.displayValue}
            value={settings.fontSize || 16}
            onChange={(e) => onChange({ ...settings, fontSize: parseInt(e.target.value, 10) })}
            className="w-full accent-indigo-600 disabled:opacity-40 cursor-pointer"
          />
        </div>
      </div>

      {/* Show Text Toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div>
          <span className="text-xs font-medium text-gray-900">
            Show Encoded Text
          </span>
          <p className="text-xs text-gray-500 mt-0.5">Display human-readable characters below bars</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.displayValue ?? true}
            onChange={(e) => onChange({ ...settings, displayValue: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Bar Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={settings.lineColor || '#000000'}
              onChange={(e) => onChange({ ...settings, lineColor: e.target.value })}
              className="w-9 h-9 p-0.5 border border-gray-300 rounded-lg cursor-pointer bg-white"
            />
            <input
              type="text"
              value={settings.lineColor || '#000000'}
              onChange={(e) => onChange({ ...settings, lineColor: e.target.value })}
              className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-xs font-mono text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Code Background
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={settings.background || '#ffffff'}
              onChange={(e) => onChange({ ...settings, background: e.target.value })}
              className="w-9 h-9 p-0.5 border border-gray-300 rounded-lg cursor-pointer bg-white"
            />
            <input
              type="text"
              value={settings.background || '#ffffff'}
              onChange={(e) => onChange({ ...settings, background: e.target.value })}
              className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-xs font-mono text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderLabelSection = () => (
    <LabelTextControls
      settings={settings}
      onChange={onChange}
      activeUnit={settings.unit || 'px'}
    />
  );

  if (section === 'size') return renderSizeSection();
  if (section === 'colors') return renderColorsSection();
  if (section === 'label') return renderLabelSection();

  return (
    <div className="space-y-6">
      {renderSizeSection()}
      {renderColorsSection()}
      {renderLabelSection()}
    </div>
  );
}
