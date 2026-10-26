import React from 'react';

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
}) {
  const handleSettingChange = (field, value) => {
    onChange({ ...settings, [field]: value });
  };

  return (
    <div className="space-y-5">
      {/* Format Selector */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          Barcode Symbology
        </label>
        <select
          value={settings.format || 'CODE128'}
          onChange={(e) => handleSettingChange('format', e.target.value)}
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
        >
          {BARCODE_FORMATS.map((fmt) => (
            <option key={fmt.value} value={fmt.value}>
              {fmt.label}
            </option>
          ))}
        </select>
        {validationError && (
          <p className="mt-1.5 text-xs text-rose-500 font-medium flex items-center gap-1">
            <span>⚠️</span> {validationError}
          </p>
        )}
      </div>

      {/* Sizing: Width & Height */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Bar Width
            </label>
            <span className="text-xs font-mono text-slate-500">{settings.width || 2}px</span>
          </div>
          <input
            type="range"
            min="1"
            max="4"
            step="1"
            value={settings.width || 2}
            onChange={(e) => handleSettingChange('width', parseInt(e.target.value, 10))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Height
            </label>
            <span className="text-xs font-mono text-slate-500">{settings.height || 80}px</span>
          </div>
          <input
            type="range"
            min="30"
            max="150"
            step="5"
            value={settings.height || 80}
            onChange={(e) => handleSettingChange('height', parseInt(e.target.value, 10))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
        </div>
      </div>

      {/* Margin & Font Size */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Margin
            </label>
            <span className="text-xs font-mono text-slate-500">{settings.margin ?? 10}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="40"
            step="2"
            value={settings.margin ?? 10}
            onChange={(e) => handleSettingChange('margin', parseInt(e.target.value, 10))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Font Size
            </label>
            <span className="text-xs font-mono text-slate-500">{settings.fontSize || 16}px</span>
          </div>
          <input
            type="range"
            min="10"
            max="26"
            step="1"
            disabled={!settings.displayValue}
            value={settings.fontSize || 16}
            onChange={(e) => handleSettingChange('fontSize', parseInt(e.target.value, 10))}
            className="w-full accent-indigo-600 disabled:opacity-40 cursor-pointer"
          />
        </div>
      </div>

      {/* Show Text Toggle */}
      <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
        <div>
          <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Show Encoded Text
          </span>
          <p className="text-xs text-slate-400 mt-0.5">Display human-readable characters below bars</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.displayValue ?? true}
            onChange={(e) => handleSettingChange('displayValue', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Bar Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={settings.lineColor || '#000000'}
              onChange={(e) => handleSettingChange('lineColor', e.target.value)}
              className="w-10 h-10 p-0.5 border border-slate-300 rounded-xl cursor-pointer bg-white"
            />
            <input
              type="text"
              value={settings.lineColor || '#000000'}
              onChange={(e) => handleSettingChange('lineColor', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Background Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={settings.background || '#ffffff'}
              onChange={(e) => handleSettingChange('background', e.target.value)}
              className="w-10 h-10 p-0.5 border border-slate-300 rounded-xl cursor-pointer bg-white"
            />
            <input
              type="text"
              value={settings.background || '#ffffff'}
              onChange={(e) => handleSettingChange('background', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Optional Label Text */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          Custom Label Under Code <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={settings.label || ''}
          onChange={(e) => handleSettingChange('label', e.target.value)}
          placeholder="e.g. Ergonomic Keyboard - $89.50"
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
        />
        <p className="mt-1 text-[11px] text-slate-400">
          Displayed centered beneath the barcode in preview and downloads.
        </p>
      </div>
    </div>
  );
}
