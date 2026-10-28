import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Wand2,
  Plus,
  Minus,
  ArrowLeftRight,
  ChevronDown,
  Lock,
  Unlock,
  Check,
  Package,
} from 'lucide-react';
import {
  AVAILABLE_PLACEHOLDERS,
  PRESET_SUPPLIER_LABEL,
  fillPlaceholders,
  hasPlaceholders,
} from '../../utils/placeholders';
import {
  UNITS,
  ARTBOARD_PRESETS,
  convertUnit,
  toPx,
  fromPx,
  validateArtboardDimension,
} from '../../utils/units';

const BARCODE_FORMATS = [
  { value: 'CODE128', label: 'CODE128' },
  { value: 'EAN13', label: 'EAN-13' },
  { value: 'EAN8', label: 'EAN-8' },
  { value: 'UPC', label: 'UPC-A' },
  { value: 'CODE39', label: 'CODE39' },
  { value: 'ITF14', label: 'ITF-14' },
];

const SAMPLE_PRODUCT = {
  name: 'Wireless Headphones',
  sku: 'AUD-WNC-001',
  price: '89.00',
  category: 'Audio',
  barcode_number: '9312345678907',
  quantity: '42',
  supplier: {
    name: 'Apex Audio Co.',
    contact_person: 'John Doe',
    mobile: '+61 400 123 456',
    phone: '(03) 9000 1122',
    email: 'orders@apexaudio.com',
    city: 'Melbourne',
  },
};

// Stepper component for compact size & gap row
function CompactStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  shiftStep = 10,
  unit = '',
}) {
  const handleKeyDown = (e) => {
    const current = parseFloat(value) || 0;
    const delta = e.shiftKey ? shiftStep : step;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(max, current + delta));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(min, current - delta));
    }
  };

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-[11px] font-medium text-gray-600 shrink-0">{label}:</span>
      <div className="flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/20 h-7">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, (parseFloat(value) || 0) - step))}
          disabled={parseFloat(value) <= min}
          className="w-5 h-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors shrink-0"
          tabIndex={-1}
        >
          <Minus className="w-2.5 h-2.5 stroke-[2]" />
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange(isNaN(v) ? min : v);
          }}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          step={step}
          className="w-10 sm:w-12 h-full text-center text-xs font-mono text-gray-900 border-x border-gray-200 focus:outline-none px-0.5 appearance-none [moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, (parseFloat(value) || 0) + step))}
          disabled={parseFloat(value) >= max}
          className="w-5 h-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors shrink-0"
          tabIndex={-1}
        >
          <Plus className="w-2.5 h-2.5 stroke-[2]" />
        </button>
      </div>
      {unit && <span className="text-[10px] text-gray-400 font-mono shrink-0">{unit}</span>}
    </div>
  );
}

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
  // Label settings
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
  const [openUpward, setOpenUpward] = useState(false);
  const insertMenuRef = useRef(null);
  const insertButtonRef = useRef(null);

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

  const handleToggleInsertMenu = () => {
    if (!isInsertMenuOpen && insertButtonRef.current) {
      const rect = insertButtonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 320);
    }
    setIsInsertMenuOpen((prev) => !prev);
  };

  // Determine current Size Preset chip: 'auto' | 'small' | 'medium' | 'large' | 'custom'
  const currentPreset = artboardSettings?.preset || 'auto';
  let activeSizeChip = 'auto';
  if (currentPreset === 'auto') {
    activeSizeChip = 'auto';
  } else if (currentPreset === 'custom') {
    activeSizeChip = 'custom';
  } else if (currentPreset === 'small_label' && artboardSettings.width === 50 && artboardSettings.height === 25) {
    activeSizeChip = 'small';
  } else if (currentPreset === 'shelf_label' && artboardSettings.width === 60 && artboardSettings.height === 40) {
    activeSizeChip = 'medium';
  } else if (currentPreset === 'product_label' && artboardSettings.width === 100 && artboardSettings.height === 50) {
    activeSizeChip = 'large';
  } else {
    activeSizeChip = 'custom';
  }

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
      // Pre-fill with current artboard width/height or defaults
      const curW = artboardSettings.width || 60;
      const curH = artboardSettings.height || 40;
      onChangeArtboard({
        ...artboardSettings,
        preset: 'custom',
        width: curW,
        height: curH,
        unit: currentUnit,
      });
    }
  };

  // Custom size width / height inputs: typing applies live and switches to custom
  const handleCustomWidthChange = (val) => {
    const num = parseFloat(val);
    const updates = {
      preset: 'custom',
      width: isNaN(num) ? '' : num,
    };
    if (artboardSettings.lockAspectRatio && !isNaN(num) && num > 0) {
      const ratio =
        artboardSettings.width && artboardSettings.height && artboardSettings.height > 0
          ? artboardSettings.width / artboardSettings.height
          : 2;
      updates.height = fromPx(toPx(num, artboardSettings.unit || 'mm') / ratio, artboardSettings.unit || 'mm', 2);
    }
    onChangeArtboard({ ...artboardSettings, ...updates });
  };

  const handleCustomHeightChange = (val) => {
    const num = parseFloat(val);
    const updates = {
      preset: 'custom',
      height: isNaN(num) ? '' : num,
    };
    if (artboardSettings.lockAspectRatio && !isNaN(num) && num > 0) {
      const ratio =
        artboardSettings.width && artboardSettings.height && artboardSettings.height > 0
          ? artboardSettings.width / artboardSettings.height
          : 2;
      updates.width = fromPx(toPx(num, artboardSettings.unit || 'mm') * ratio, artboardSettings.unit || 'mm', 2);
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
      preset: 'custom',
      unit: newUnit,
      width: newW,
      height: newH,
    });
  };

  const toggleAspectLock = () => {
    onChangeArtboard({
      ...artboardSettings,
      preset: 'custom',
      lockAspectRatio: !artboardSettings.lockAspectRatio,
    });
  };

  // Label text insertion at cursor position
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
      const pos = start + token.length;
      input.setSelectionRange(pos, pos);
    }, 10);
  };

  // Live preview text for label
  const previewProduct = selectedProduct || SAMPLE_PRODUCT;
  const resolvedLabelPreview = useMemo(() => {
    if (!settings.label) return '';
    return fillPlaceholders(settings.label, previewProduct);
  }, [settings.label, previewProduct]);

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
    if (artboardSettings?.preset !== 'auto') {
      onChangeArtboard({ ...artboardSettings, background: newColor });
    }
  };

  const isMultiLine = Boolean(settings.label && settings.label.includes('\n'));
  const dimensionError =
    activeSizeChip === 'custom'
      ? validateArtboardDimension(artboardSettings.width, artboardSettings.unit) ||
        validateArtboardDimension(artboardSettings.height, artboardSettings.unit)
      : null;

  return (
    <div className="space-y-4 min-w-0">
      {/* 1. Value Field */}
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
          <label className="text-xs font-medium text-gray-800">Value</label>

          <div className="flex items-center gap-2">
            {type === 'qr' && (
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
        <div className="min-w-0">
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

      {/* 3. Label text with Insert popover menu + Size & Gap Quick Steppers */}
      <div className="min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-medium text-gray-800">Label text</label>

          {/* Insert Dropdown Popover */}
          <div className="relative" ref={insertMenuRef}>
            <button
              ref={insertButtonRef}
              type="button"
              onClick={handleToggleInsertMenu}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100/70 px-2 py-0.5 rounded-md transition-colors cursor-pointer border border-indigo-100"
            >
              <Plus className="w-3 h-3 stroke-[2]" />
              <span>Insert</span>
              <ChevronDown className={`w-2.5 h-2.5 stroke-[1.5] transition-transform ${isInsertMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isInsertMenuOpen && (
              <div
                className={`absolute right-0 ${
                  openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                } w-64 sm:w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto divide-y divide-gray-100 [scrollbar-width:thin]`}
              >
                {/* Header note */}
                <div className="p-2.5 bg-gray-50/80">
                  <p className="text-[11px] font-medium text-gray-600 leading-tight">
                    Fills in automatically from the selected product.
                  </p>
                </div>

                {/* Product Placeholders */}
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Product
                  </div>
                  {AVAILABLE_PLACEHOLDERS.slice(0, 6).map((item) => {
                    const sampleVal = fillPlaceholders(item.tag, previewProduct);
                    return (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => handleInsertPlaceholder(item.tag)}
                        className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                      >
                        <span className="font-medium shrink-0">{item.label}</span>
                        <span className="text-[11px] font-mono text-gray-400 truncate text-right">
                          {sampleVal || item.tag}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Supplier Placeholders */}
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Supplier
                  </div>
                  {AVAILABLE_PLACEHOLDERS.slice(6).map((item) => {
                    const sampleVal = fillPlaceholders(item.tag, previewProduct);
                    return (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => handleInsertPlaceholder(item.tag)}
                        className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                      >
                        <span className="font-medium shrink-0">{item.label}</span>
                        <span className="text-[11px] font-mono text-gray-400 truncate text-right">
                          {sampleVal || item.tag}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Supplier & Mobile Preset Button */}
                <div className="p-1.5 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => handleInsertPlaceholder(PRESET_SUPPLIER_LABEL)}
                    className="w-full px-2.5 py-1.5 text-left text-xs font-medium text-indigo-700 hover:bg-indigo-50 rounded-md border border-indigo-200 flex items-center justify-between cursor-pointer transition-colors bg-white shadow-2xs"
                  >
                    <span>Supplier & Mobile preset</span>
                    <span className="text-[10px] font-mono text-indigo-500">{PRESET_SUPPLIER_LABEL}</span>
                  </button>
                </div>
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

        {/* Quick Size and Gap Row */}
        <div className="flex items-center justify-between gap-3 p-1.5 bg-gray-50 rounded-lg border border-gray-200 flex-wrap">
          <CompactStepper
            label="Size"
            value={settings.labelFontSize || 11}
            onChange={(val) => onChangeSettings({ ...settings, labelFontSize: val })}
            min={6}
            max={72}
            step={1}
            shiftStep={10}
            unit={settings.labelFontUnit || 'pt'}
          />

          <CompactStepper
            label="Gap"
            value={settings.labelGap !== undefined ? settings.labelGap : 4}
            onChange={(val) => onChangeSettings({ ...settings, labelGap: val })}
            min={0}
            max={40}
            step={1}
            shiftStep={10}
            unit="px"
          />
        </div>

        {/* Live Resolved Label Preview Line */}
        {settings.label && (
          <div className="text-[11px] text-gray-600 font-mono truncate bg-gray-50/80 px-2.5 py-1 rounded border border-gray-200">
            <span className="text-gray-400 font-sans mr-1.5 select-none font-medium">Preview:</span>
            <span>{resolvedLabelPreview || '—'}</span>
          </div>
        )}
      </div>

      {/* 4. Size Quick Chips */}
      <div className="min-w-0">
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
                className={`h-8 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center justify-center truncate ${
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

        {/* When Custom is selected (or active), show width, height, aspect lock, and unit switch */}
        {activeSizeChip === 'custom' && (
          <div className="mt-2.5 p-3 bg-gray-50/90 border border-gray-200 rounded-lg space-y-2.5 min-w-0">
            <div className="flex items-center justify-between text-xs flex-wrap gap-1">
              <span className="font-semibold text-gray-800">Custom Dimensions</span>
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

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              {/* Width */}
              <div className="sm:col-span-5 min-w-0">
                <span className="block text-[11px] text-gray-500 mb-1 truncate">
                  Width ({artboardSettings?.unit || 'mm'})
                </span>
                <input
                  type="number"
                  step="0.5"
                  min="5"
                  max="1000"
                  value={artboardSettings.width || ''}
                  onChange={(e) => handleCustomWidthChange(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs font-mono text-gray-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Aspect Ratio Lock */}
              <div className="sm:col-span-2 flex justify-center pt-2 sm:pt-4">
                <button
                  type="button"
                  onClick={toggleAspectLock}
                  className={`w-8 h-8 rounded border flex items-center justify-center cursor-pointer transition-colors ${
                    artboardSettings.lockAspectRatio
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-600'
                      : 'bg-white border-gray-300 text-gray-400 hover:text-gray-700'
                  }`}
                  title={artboardSettings.lockAspectRatio ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                >
                  {artboardSettings.lockAspectRatio ? (
                    <Lock className="w-3.5 h-3.5 stroke-[1.5]" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 stroke-[1.5]" />
                  )}
                </button>
              </div>

              {/* Height */}
              <div className="sm:col-span-5 min-w-0">
                <span className="block text-[11px] text-gray-500 mb-1 truncate">
                  Height ({artboardSettings?.unit || 'mm'})
                </span>
                <input
                  type="number"
                  step="0.5"
                  min="5"
                  max="1000"
                  value={artboardSettings.height || ''}
                  onChange={(e) => handleCustomHeightChange(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs font-mono text-gray-900 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {dimensionError && (
              <p className="text-[11px] text-red-600 font-medium">
                {dimensionError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 5. Colors: Two swatches + Swap button */}
      <div className="min-w-0">
        <label className="block text-xs font-medium text-gray-800 mb-1.5">Colors</label>
        <div className="flex items-center gap-2">
          {/* Code Color Swatch */}
          <div className="flex-1 flex items-center gap-2 h-9 px-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors min-w-0">
            <input
              type="color"
              value={codeColor}
              onChange={(e) => handleCodeColorChange(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border border-gray-200 p-0 shrink-0"
              title="Code color"
            />
            <div className="min-w-0 flex-1 truncate">
              <span className="block text-[10px] text-gray-400 uppercase leading-none truncate">Code</span>
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
          <div className="flex-1 flex items-center gap-2 h-9 px-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors min-w-0">
            <input
              type="color"
              value={bgColor}
              onChange={(e) => handleBgColorChange(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border border-gray-200 p-0 shrink-0"
              title="Background color"
            />
            <div className="min-w-0 flex-1 truncate">
              <span className="block text-[10px] text-gray-400 uppercase leading-none truncate">Background</span>
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
