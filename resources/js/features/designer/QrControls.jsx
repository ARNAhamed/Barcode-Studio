import React from 'react';
import { Upload, X, AlertTriangle } from 'lucide-react';
import { UNITS, convertUnit } from '../../utils/units';

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

export default function QrControls({
  settings,
  onChange,
  validationError,
  sizeError = null,
}) {
  const currentUnit = settings.unit || 'px';
  const unitConfig = UNITS.find((u) => u.value === currentUnit) || UNITS[0];

  const handleUnitChange = (newUnit) => {
    if (newUnit === currentUnit) return;
    const newSize = convertUnit(settings.size, currentUnit, newUnit, 2);
    onChange({
      ...settings,
      unit: newUnit,
      size: newSize,
    });
  };

  const handleSizeChange = (val) => {
    const num = parseFloat(val);
    onChange({
      ...settings,
      size: isNaN(num) ? val : num,
    });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      onChange({
        ...settings,
        logo: reader.result,
        errorCorrection: settings.errorCorrection === 'L' || settings.errorCorrection === 'M' ? 'H' : settings.errorCorrection,
      });
    };
    reader.readAsDataURL(file);
  };

  const sizeSliderMin = unitConfig.min;
  const sizeSliderMax = unitConfig.max;

  return (
    <div className="space-y-6">
      {/* Unit Selector & Sizing Card */}
      <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Output Dimensions
            </span>
            <p className="text-[11px] text-slate-500">QR codes are strictly square (1:1 aspect ratio)</p>
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

        {/* Manual Size Number Input & Slider */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Square Size ({currentUnit})
            </label>
            <input
              type="number"
              step={unitConfig.step}
              min={unitConfig.min}
              max={unitConfig.max}
              value={settings.size}
              onChange={(e) => handleSizeChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          <div>
            <div className="flex justify-between items-center text-[11px] text-slate-500 mb-1">
              <span>Quick Size Slider</span>
              <span className="font-mono">{settings.size} {currentUnit}</span>
            </div>
            <input
              type="range"
              min={sizeSliderMin}
              max={sizeSliderMax}
              step={unitConfig.step}
              value={settings.size || sizeSliderMin}
              onChange={(e) => handleSizeChange(e.target.value)}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
        </div>

        {sizeError && (
          <p className="text-xs text-rose-500 font-medium flex items-center gap-1.5 mt-1">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{sizeError}</span>
          </p>
        )}
      </div>

      {/* Error Correction */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          Error Correction Level
        </label>
        <select
          value={settings.errorCorrection || 'Q'}
          onChange={(e) => onChange({ ...settings, errorCorrection: e.target.value })}
          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
        >
          {ERROR_CORRECTION_LEVELS.map((lvl) => (
            <option key={lvl.value} value={lvl.value}>
              {lvl.label}
            </option>
          ))}
        </select>
      </div>

      {/* Dot Style & Corner Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Dot Pattern Style
          </label>
          <select
            value={settings.dotStyle || 'rounded'}
            onChange={(e) => onChange({ ...settings, dotStyle: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
          >
            {DOT_STYLES.map((style) => (
              <option key={style.value} value={style.value}>
                {style.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Corner Style
          </label>
          <select
            value={settings.cornerStyle || 'extra-rounded'}
            onChange={(e) => onChange({ ...settings, cornerStyle: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
          >
            {CORNER_STYLES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Foreground Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={settings.foreground || '#0F172A'}
              onChange={(e) => onChange({ ...settings, foreground: e.target.value })}
              className="w-10 h-10 p-0.5 border border-slate-300 rounded-xl cursor-pointer bg-white"
            />
            <input
              type="text"
              value={settings.foreground || '#0F172A'}
              onChange={(e) => onChange({ ...settings, foreground: e.target.value })}
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
              onChange={(e) => onChange({ ...settings, background: e.target.value })}
              className="w-10 h-10 p-0.5 border border-slate-300 rounded-xl cursor-pointer bg-white"
            />
            <input
              type="text"
              value={settings.background || '#ffffff'}
              onChange={(e) => onChange({ ...settings, background: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Center Logo Upload */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          Center Brand Logo <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        {settings.logo ? (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={settings.logo}
                alt="Center logo"
                className="w-10 h-10 object-contain rounded-lg bg-white border border-slate-200 p-1"
              />
              <div>
                <p className="text-xs font-semibold text-slate-800">Logo attached</p>
                <p className="text-[11px] text-slate-500">Rendered in the center of the QR code</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange({ ...settings, logo: null })}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-slate-50/50 transition-colors">
            <Upload className="w-5 h-5 text-slate-400 mb-1" />
            <span className="text-xs font-medium text-slate-600">Click to upload brand logo</span>
            <span className="text-[11px] text-slate-400 mt-0.5">PNG, JPG or SVG (square works best)</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Optional Label Text */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          Custom Label Under Code <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={settings.label || ''}
          onChange={(e) => onChange({ ...settings, label: e.target.value })}
          placeholder="e.g. Scan to order online"
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
        />
      </div>
    </div>
  );
}
