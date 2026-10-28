import React, { useState, useRef, useEffect } from 'react';
import {
  Wand2,
  Plus,
  ArrowLeftRight,
  ChevronDown,
  Lock,
  Unlock,
  Check,
  ExternalLink,
} from 'lucide-react';
import {
  AVAILABLE_PLACEHOLDERS,
  PRESET_SUPPLIER_LABEL,
  fillPlaceholders,
} from '../../utils/placeholders';
import {
  UNITS,
  ARTBOARD_PRESETS,
  convertUnit,
  toPx,
  fromPx,
} from '../../utils/units';

const BARCODE_FORMATS = [
  { value: 'CODE128', label: 'CODE128' },
  { value: 'EAN13', label: 'EAN-13' },
  { value: 'EAN8', label: 'EAN-8' },
  { value: 'UPC', label: 'UPC-A' },
  { value: 'CODE39', label: 'CODE39' },
  { value: 'ITF14', label: 'ITF-14' },
];

export default function DesignGroupControls({
  type = 'barcode', // 'barcode' | 'qr'
  value = '',
  onChangeValue,
  format = 'CODE128',
  onChangeFormat,
  onGenerateValidNumber,
  isGeneratingValue = false,
  selectedProduct = null,
  linkToProductPage = true,
  onToggleLinkToProductPage,
  // Label
  settings = {},
  onChangeSettings,
  // Artboard & Sizing
  artboardSettings = {},
  onChangeArtboard,
  // Colors
  onSwapColors,
  labelInputRef,
}) {
  const [isInsertMenuOpen, setIsInsertMenuOpen] = useState(false);
  const insertMenuRef = useRef(null);

  // Close insert menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (insertMenuRef.current && !insertMenuRef.current.contains(e.target)) {
        setIsInsertMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine current Size Preset chip: 'auto' | 'small' | 'medium' | 'large' | 'custom'
  const currentPreset = artboardSettings?.preset || 'auto';
  let activeSizeChip = 'auto';
  if (currentPreset === 'auto') activeSizeChip = 'auto';
  else if (currentPreset === 'small_label' || (artboardSettings.width === 50 && artboardSettings.height === 25)) activeSizeChip = 'small';
  else if (currentPreset === 'shelf_label' || (artboardSettings.width === 60 && artboardSettings.height === 40)) activeSizeChip = 'medium';
  else if (currentPreset === 'product_label' || (artboardSettings.width === 100 && artboardSettings.height === 50)) activeSizeChip = 'large';
  else activeSizeChip = 'custom';

  const handleSelectSizeChip = (chip) => {
    const currentUnit = artboardSettings?.unit || 'mm';
    if (chip === 'auto') {
      onChangeArtboard({
        ...artboardSettings,
        preset: 'auto',
      });
      return;
    }

    if (chip === 'small') {
      onChangeArtboard({
        ...artboardSettings,
        preset: 'small_label',
        unit: 'mm',
        width: 50,
        height: 25,
        orientation: 'landscape',
      });
      return;
    }

    if (chip === 'medium') {
      onChangeArtboard({
        ...artboardSettings,
        preset: 'shelf_label',
        unit: 'mm',
        width: 60,
        height: 40,
        orientation: 'landscape',
      });
      return;
    }

    if (chip === 'large') {
      onChangeArtboard({
        ...artboardSettings,
        preset: 'product_label',
        unit: 'mm',
        width: 100,
        height: 50,
        orientation: 'landscape',
      });
      return;
    }

    if (chip === 'custom') {
      onChangeArtboard({
        ...artboardSettings,
        preset: 'custom',
        width: artboardSettings.width || 60,
        height: artboardSettings.height || 40,
        unit: currentUnit,
      });
    }
  };

  const handleCustomWidthChange = (val) => {
    const num = parseFloat(val);
    const updates = {
      preset: 'custom',
      width: isNaN(num) ? val : num,
    };
    if (artboardSettings.lockAspectRatio && !isNaN(num) && num > 0) {
      const ratio = (artboardSettings.width && artboardSettings.height && artboardSettings.height > 0)
        ? artboardSettings.width / artboardSettings.height
        : 2;
      updates.height = fromPx(toPx(num, artboardSettings.unit) / ratio, artboardSettings.unit, 2);
    }
    onChangeArtboard({ ...artboardSettings, ...updates });
  };

  const handleCustomHeightChange = (val) => {
    const num = parseFloat(val);
    const updates = {
      preset: 'custom',
      height: isNaN(num) ? val : num,
    };
    if (artboardSettings.lockAspectRatio && !isNaN(num) && num > 0) {
      const ratio = (artboardSettings.width && artboardSettings.height && artboardSettings.height > 0)
        ? artboardSettings.width / artboardSettings.height
        : 2;
      updates.width = fromPx(toPx(num, artboardSettings.unit) * ratio, artboardSettings.unit, 2);
    }
    onChangeArtboard({ ...artboardSettings, ...updates });
  };

  const handleCustomUnitChange = (newUnit) => {
    const currentUnit = artboardSettings?.unit || 'mm';
    if (newUnit === currentUnit) return;
    const newW = convertUnit(artboardSettings.width || 60, currentUnit, newUnit, 2);
    const newH = convertUnit(artboardSettings.height || 40, currentUnit, newUnit, 2);
    onChangeArtboard({
      ...artboardSettings,
      unit: newUnit,
      width: newW,
      height: newH,
    });
  };

  // Label text insertion
  const handleInsertPlaceholder = (token) => {
    const current = settings.label || '';
    const input = labelInputRef?.current;
    if (!input) {
      const nextVal = current ? `${current} ${token}` : token;
      onChangeSettings({ ...settings, label: nextVal });
      setIsInsertMenuOpen(false);
      return;
    }

    const start = input.selectionStart ?? current.length;
    const end = input.selectionEnd ?? current.length;
    const nextVal = current.substring(0, start) + token + current.substring(end);
    onChangeSettings({ ...settings, label: nextVal });
    setIsInsertMenuOpen(false);

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + token.length, start + token.length);
    }, 10);
  };

  // Color values
  const codeColor = type === 'barcode' ? (settings.lineColor || '#000000') : (settings.foreground || '#0F172A');
  const bgColor = settings.background || '#ffffff';

  const handleCodeColorChange = (newColor) => {
    if (type === 'barcode') {
      onChangeSettings({ ...settings, lineColor: newColor });
    } else {
      onChangeSettings({ ...settings, foreground: newColor });
    }
  };

  const handleBgColorChange = (newColor) => {
    onChangeSettings({ ...settings, background: newColor });
    // Also harmonize with artboard if desired
    if (artboardSettings?.preset !== 'auto') {
      onChangeArtboard({ ...artboardSettings, background: newColor });
    }
  };

  const isMultiLine = Boolean(settings.label && settings.label.includes('\n'));

  return (
    <div className="space-y-4">
      {/* 1. Value Field */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label className="text-xs font-medium text-gray-800">Value</label>

          <div className="flex items-center gap-2">
            {type === 'qr' && selectedProduct && (
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-gray-600 hover:text-gray-900">
                <input
                  type="checkbox"
                  checked={linkToProductPage}
                  onChange={(e) => onToggleLinkToProductPage(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 cursor-pointer"
                />
                <span className="font-medium">Link to product page</span>
              </label>
            )}

            {type === 'barcode' && ['EAN13', 'EAN8', 'UPC', 'CODE128'].includes(format) && (
              <button
                type="button"
                onClick={onGenerateValidNumber}
                disabled={isGeneratingValue}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer disabled:opacity-50"
                title={`Generate valid ${format} number`}
              >
                <Wand2 className="w-3 h-3 stroke-[1.5]" />
                <span>{isGeneratingValue ? 'Generating...' : 'Generate'}</span>
              </button>
            )}
          </div>
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => onChangeValue(e.target.value)}
          placeholder={type === 'barcode' ? 'Enter barcode digits or SKU' : 'https://... or text'}
          className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
        />
      </div>

      {/* 2. Format (Barcode mode only) */}
      {type === 'barcode' && (
        <div>
          <label className="block text-xs font-medium text-gray-800 mb-1.5">Format</label>
          <div className="relative">
            <select
              value={format}
              onChange={(e) => onChangeFormat(e.target.value)}
              className="w-full h-9 pl-3 pr-8 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer transition-colors"
            >
              {BARCODE_FORMATS.map((fmt) => (
                <option key={fmt.value} value={fmt.value}>
                  {fmt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[1.5]" />
          </div>
        </div>
      )}

      {/* 3. Label text with Insert popover menu */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label className="text-xs font-medium text-gray-800">Label text</label>

          {/* Insert Dropdown Popover */}
          <div className="relative" ref={insertMenuRef}>
            <button
              type="button"
              onClick={() => setIsInsertMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100/70 px-2 py-0.5 rounded-md transition-colors cursor-pointer border border-indigo-100"
            >
              <Plus className="w-3 h-3 stroke-[2]" />
              <span>Insert</span>
              <ChevronDown className="w-2.5 h-2.5 stroke-[1.5]" />
            </button>

            {isInsertMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Product Fields
                </div>
                {AVAILABLE_PLACEHOLDERS.slice(0, 4).map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => handleInsertPlaceholder(item.tag)}
                    className="w-full px-3 py-1 text-left text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center justify-between cursor-pointer"
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px] font-mono text-gray-400">{item.tag}</span>
                  </button>
                ))}

                <div className="h-px bg-gray-100 my-1" />
                <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Supplier Fields
                </div>
                {AVAILABLE_PLACEHOLDERS.slice(6, 11).map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => handleInsertPlaceholder(item.tag)}
                    className="w-full px-3 py-1 text-left text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center justify-between cursor-pointer"
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px] font-mono text-gray-400">{item.tag}</span>
                  </button>
                ))}

                <div className="h-px bg-gray-100 my-1" />
                <button
                  type="button"
                  onClick={() => handleInsertPlaceholder(PRESET_SUPPLIER_LABEL)}
                  className="w-full px-3 py-1 text-left text-xs font-medium text-indigo-600 hover:bg-indigo-50 flex items-center justify-between cursor-pointer"
                >
                  <span>Supplier & Mobile preset</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {isMultiLine ? (
          <textarea
            ref={labelInputRef}
            rows={2}
            value={settings.label || ''}
            onChange={(e) => onChangeSettings({ ...settings, label: e.target.value })}
            placeholder="e.g. {name} • {price}"
            className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors resize-none leading-relaxed"
          />
        ) : (
          <input
            ref={labelInputRef}
            type="text"
            value={settings.label || ''}
            onChange={(e) => onChangeSettings({ ...settings, label: e.target.value })}
            placeholder="e.g. {name} • {price}"
            className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          />
        )}
      </div>

      {/* 4. Size Quick Chips */}
      <div>
        <label className="block text-xs font-medium text-gray-800 mb-1.5">Size</label>
        <div className="grid grid-cols-5 gap-1 p-0.5 bg-gray-100/90 rounded-lg border border-gray-200">
          {[
            { id: 'auto', label: 'Auto', desc: 'Fit to code' },
            { id: 'small', label: 'Small', desc: '50 × 25 mm' },
            { id: 'medium', label: 'Medium', desc: '60 × 40 mm' },
            { id: 'large', label: 'Large', desc: '100 × 50 mm' },
            { id: 'custom', label: 'Custom', desc: 'Specify dimensions' },
          ].map((chip) => {
            const isSelected = activeSizeChip === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleSelectSizeChip(chip.id)}
                title={chip.desc}
                className={`h-8 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center justify-center ${
                  isSelected
                    ? 'bg-white text-indigo-700 font-semibold shadow-xs border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* When Custom is selected, show width, height, and unit switch */}
        {activeSizeChip === 'custom' && (
          <div className="mt-2.5 p-3 bg-gray-50/80 border border-gray-200 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700">Custom Dimensions</span>
              <div className="inline-flex p-0.5 bg-gray-200/70 rounded border border-gray-300 text-[11px]">
                {['mm', 'cm', 'inch', 'px'].map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => handleCustomUnitChange(u)}
                    className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                      (artboardSettings?.unit || 'mm') === u
                        ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="block text-[11px] text-gray-500 mb-1">
                  Width ({artboardSettings?.unit || 'mm'})
                </span>
                <input
                  type="number"
                  step="0.5"
                  min="5"
                  value={artboardSettings.width || 60}
                  onChange={(e) => handleCustomWidthChange(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs font-mono text-gray-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <span className="block text-[11px] text-gray-500 mb-1">
                  Height ({artboardSettings?.unit || 'mm'})
                </span>
                <input
                  type="number"
                  step="0.5"
                  min="5"
                  value={artboardSettings.height || 40}
                  onChange={(e) => handleCustomHeightChange(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs font-mono text-gray-900 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Colors: Two swatches + Swap button */}
      <div>
        <label className="block text-xs font-medium text-gray-800 mb-1.5">Colors</label>
        <div className="flex items-center gap-2">
          {/* Code Color Swatch */}
          <div className="flex-1 flex items-center gap-2 h-9 px-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
            <input
              type="color"
              value={codeColor}
              onChange={(e) => handleCodeColorChange(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border border-gray-200 p-0"
              title="Code color"
            />
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] text-gray-400 uppercase leading-none">Code</span>
              <span className="text-xs font-mono text-gray-800 uppercase truncate">
                {codeColor}
              </span>
            </div>
          </div>

          {/* Swap Button */}
          <button
            type="button"
            onClick={onSwapColors}
            className="w-9 h-9 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-600 hover:text-gray-900 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            title="Swap code and background colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>

          {/* Background Color Swatch */}
          <div className="flex-1 flex items-center gap-2 h-9 px-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
            <input
              type="color"
              value={bgColor}
              onChange={(e) => handleBgColorChange(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border border-gray-200 p-0"
              title="Background color"
            />
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] text-gray-400 uppercase leading-none">Background</span>
              <span className="text-xs font-mono text-gray-800 uppercase truncate">
                {bgColor}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
