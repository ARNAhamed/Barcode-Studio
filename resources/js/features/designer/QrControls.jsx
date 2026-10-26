import React from 'react';
import { Upload, X } from 'lucide-react';

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
}) {
  const handleSettingChange = (field, value) => {
    onChange({ ...settings, [field]: value });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      handleSettingChange('logo', reader.result);
      // Auto upgrade error correction to Q or H if low
      if (settings.errorCorrection === 'L' || settings.errorCorrection === 'M') {
        handleSettingChange('errorCorrection', 'H');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5">
      {/* Sizing & Error Correction */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              QR Size
            </label>
            <span className="text-xs font-mono text-slate-500">{settings.size || 220}px</span>
          </div>
          <input
            type="range"
            min="160"
            max="340"
            step="10"
            value={settings.size || 220}
            onChange={(e) => handleSettingChange('size', parseInt(e.target.value, 10))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Error Correction
          </label>
          <select
            value={settings.errorCorrection || 'Q'}
            onChange={(e) => handleSettingChange('errorCorrection', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
          >
            {ERROR_CORRECTION_LEVELS.map((lvl) => (
              <option key={lvl.value} value={lvl.value}>
                {lvl.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dot Style & Corner Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Dot Pattern Style
          </label>
          <select
            value={settings.dotStyle || 'rounded'}
            onChange={(e) => handleSettingChange('dotStyle', e.target.value)}
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
            onChange={(e) => handleSettingChange('cornerStyle', e.target.value)}
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
              onChange={(e) => handleSettingChange('foreground', e.target.value)}
              className="w-10 h-10 p-0.5 border border-slate-300 rounded-xl cursor-pointer bg-white"
            />
            <input
              type="text"
              value={settings.foreground || '#0F172A'}
              onChange={(e) => handleSettingChange('foreground', e.target.value)}
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
                <p className="text-[11px] text-slate-500">Will render in the center of the QR code</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSettingChange('logo', null)}
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
          onChange={(e) => handleSettingChange('label', e.target.value)}
          placeholder="e.g. Scan to order online"
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
        />
      </div>
    </div>
  );
}
