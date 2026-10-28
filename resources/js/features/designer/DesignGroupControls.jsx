import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Wand2,
  Plus,
  Minus,
  ArrowLeftRight,
  ChevronDown,
  Lock,
  Unlock,
  AlertTriangle,
  RotateCw,
  Sparkles,
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
  validateDimension,
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
  max = 200,
  step = 1,
  shiftStep = 10,
  unit = '',
  className = '',
}) {
  const handleKeyDown = (e) => {
    const current = parseFloat(value) || 0;
    const delta = e.shiftKey ? shiftStep : step;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(max, parseFloat((current + delta).toFixed(2))));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(min, parseFloat((current - delta).toFixed(2))));
    }
  };

  return (
    <div className={`flex items-center gap-1.5 min-w-0 ${className}`}>
      {label && <span className="text-[11px] font-medium text-gray-600 shrink-0">{label}:</span>}
      <div className="flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/20 h-7.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, parseFloat(((parseFloat(value) || 0) - step).toFixed(2))))}
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
          className="w-12 h-full text-center text-xs font-mono text-gray-900 border-x border-gray-200 focus:outline-none px-0.5 appearance-none [moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, parseFloat(((parseFloat(value) || 0) + step).toFixed(2))))}
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
  // Settings & Units
  settings = {},
  onChangeSettings,
  onChangeUnit,
  // Artboard
  artboardSettings = {},
  onChangeArtboard,
  // Colors
  onSwapColors,
  labelInputRef,
}) {
  const activeUnit = settings.unit || artboardSettings.unit || 'mm';

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

  // -------------------------------------------------------------
  // CODE SIZE CHIPS (Small, Medium, Large, Auto, Custom)
  // -------------------------------------------------------------
  // Preset values in mm:
  // Barcode: Small 30x10, Medium 45x15, Large 60x20
  // QR: Small 15, Medium 25, Large 40
  const getPresetCodeDimsInUnit = (presetKey) => {
    if (type === 'barcode') {
      const presetsMm = {
        small: { width: 30, height: 10 },
        medium: { width: 45, height: 15 },
        large: { width: 60, height: 20 },
      };
      const p = presetsMm[presetKey];
      if (!p) return null;
      return {
        width: convertUnit(p.width, 'mm', activeUnit, 1),
        height: convertUnit(p.height, 'mm', activeUnit, 1),
      };
    } else {
      const presetsMm = {
        small: 15,
        medium: 25,
        large: 40,
      };
      const s = presetsMm[presetKey];
      if (!s) return null;
      return { size: convertUnit(s, 'mm', activeUnit, 1) };
    }
  };

  // Determine current active chip: 'auto' | 'small' | 'medium' | 'large' | 'custom'
  const activeCodeSizeChip = useMemo(() => {
    if (settings.sizePreset === 'auto') return 'auto';
    if (settings.sizePreset === 'custom') return 'custom';

    // Check if current dimensions match small/medium/large
    const smallDims = getPresetCodeDimsInUnit('small');
    const medDims = getPresetCodeDimsInUnit('medium');
    const lrgDims = getPresetCodeDimsInUnit('large');

    if (type === 'barcode') {
      const curW = Number(settings.width);
      const curH = Number(settings.height);
      if (smallDims && Math.abs(curW - smallDims.width) < 0.2 && Math.abs(curH - smallDims.height) < 0.2) return 'small';
      if (medDims && Math.abs(curW - medDims.width) < 0.2 && Math.abs(curH - medDims.height) < 0.2) return 'medium';
      if (lrgDims && Math.abs(curW - lrgDims.width) < 0.2 && Math.abs(curH - lrgDims.height) < 0.2) return 'large';
    } else {
      const curS = Number(settings.size);
      if (smallDims && Math.abs(curS - smallDims.size) < 0.2) return 'small';
      if (medDims && Math.abs(curS - medDims.size) < 0.2) return 'medium';
      if (lrgDims && Math.abs(curS - lrgDims.size) < 0.2) return 'large';
    }

    return settings.sizePreset || 'custom';
  }, [type, settings, activeUnit]);

  // Calculate largest code size that fits in fixed artboard
  const calculateAutoCodeSize = () => {
    if (artboardSettings.preset === 'auto') {
      // Medium defaults
      return getPresetCodeDimsInUnit('medium');
    }

    const artW = Number(artboardSettings.width || 60);
    const artH = Number(artboardSettings.height || 40);
    const pad = Number(artboardSettings.padding !== undefined ? artboardSettings.padding : 5);
    const availW = Math.max(10, artW - 2 * pad);
    const availH = Math.max(10, artH - 2 * pad);

    // Approximate label height in active unit
    const labelH = settings.label ? convertUnit(8, 'mm', activeUnit, 1) : 0;
    const maxCodeH = Math.max(5, availH - labelH);

    if (type === 'barcode') {
      // Barcode aspect ratio ~ 2.5:1
      const targetW = Math.min(availW, maxCodeH * 2.5);
      const targetH = targetW / 2.5;
      return {
        width: parseFloat(targetW.toFixed(1)),
        height: parseFloat(targetH.toFixed(1)),
      };
    } else {
      // QR is strictly square
      const s = Math.min(availW, maxCodeH);
      return { size: parseFloat(s.toFixed(1)) };
    }
  };

  const handleSelectCodeSizeChip = (chip) => {
    if (chip === 'auto') {
      const autoDims = calculateAutoCodeSize();
      onChangeSettings({
        ...settings,
        ...autoDims,
        sizePreset: 'auto',
      });
      return;
    }

    if (['small', 'medium', 'large'].includes(chip)) {
      const dims = getPresetCodeDimsInUnit(chip);
      onChangeSettings({
        ...settings,
        ...dims,
        sizePreset: chip,
      });
      return;
    }

    if (chip === 'custom') {
      onChangeSettings({
        ...settings,
        sizePreset: 'custom',
      });
    }
  };

  // Custom barcode width/height
  const handleCustomWidthChange = (val) => {
    const num = parseFloat(val);
    const updates = {
      width: isNaN(num) ? '' : num,
      sizePreset: 'custom',
    };
    if (settings.lockAspectRatio && !isNaN(num) && num > 0) {
      const ratio = settings.aspectRatio || (settings.width && settings.height ? settings.width / settings.height : 2.5);
      updates.height = parseFloat((num / ratio).toFixed(1));
    }
    onChangeSettings({ ...settings, ...updates });
  };

  const handleCustomHeightChange = (val) => {
    const num = parseFloat(val);
    const updates = {
      height: isNaN(num) ? '' : num,
      sizePreset: 'custom',
    };
    if (settings.lockAspectRatio && !isNaN(num) && num > 0) {
      const ratio = settings.aspectRatio || (settings.width && settings.height ? settings.width / settings.height : 2.5);
      updates.width = parseFloat((num * ratio).toFixed(1));
    }
    onChangeSettings({ ...settings, ...updates });
  };

  const handleCustomQrSizeChange = (val) => {
    const num = parseFloat(val);
    onChangeSettings({
      ...settings,
      size: isNaN(num) ? '' : num,
      sizePreset: 'custom',
    });
  };

  // -------------------------------------------------------------
  // ARTBOARD SELECT & WARNING
  // -------------------------------------------------------------
  const artboardPresetKey = artboardSettings.preset || 'auto';

  const handleArtboardSelectChange = (presetId) => {
    if (presetId === 'auto') {
      onChangeArtboard({
        ...artboardSettings,
        preset: 'auto',
      });
      return;
    }

    if (presetId === 'custom') {
      onChangeArtboard({
        ...artboardSettings,
        preset: 'custom',
      });
      return;
    }

    const preset = ARTBOARD_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const w = convertUnit(preset.widthMm, 'mm', activeUnit, 1);
    const h = convertUnit(preset.heightMm, 'mm', activeUnit, 1);
    const isPortrait = h > w;

    onChangeArtboard({
      ...artboardSettings,
      preset: presetId,
      width: w,
      height: h,
      orientation: isPortrait ? 'portrait' : 'landscape',
    });
  };

  const handleSwapArtboardOrientation = () => {
    const curW = artboardSettings.width || 60;
    const curH = artboardSettings.height || 40;
    onChangeArtboard({
      ...artboardSettings,
      width: curH,
      height: curW,
      orientation: artboardSettings.orientation === 'portrait' ? 'landscape' : 'portrait',
    });
  };

  // Check if code + label exceed artboard
  const codeExceedsArtboard = useMemo(() => {
    if (artboardSettings.preset === 'auto') return false;
    const codeW = toPx(settings.width || settings.size || 35, activeUnit);
    const codeH = toPx(settings.height || settings.size || 35, activeUnit);
    const artW = toPx(artboardSettings.width || 60, activeUnit);
    const artH = toPx(artboardSettings.height || 40, activeUnit);
    const pad = toPx(artboardSettings.padding !== undefined ? artboardSettings.padding : 5, activeUnit);
    return codeW > artW - 2 * pad || codeH > artH - 2 * pad;
  }, [artboardSettings, settings, activeUnit]);

  // Fix actions when code exceeds artboard
  const handleShrinkCodeToFit = () => {
    const autoDims = calculateAutoCodeSize();
    onChangeSettings({
      ...settings,
      ...autoDims,
      sizePreset: 'auto',
    });
  };

  const handleEnlargeArtboard = () => {
    onChangeArtboard({
      ...artboardSettings,
      preset: 'auto',
    });
  };

  // -------------------------------------------------------------
  // LABEL INSERTION & RESOLUTION
  // -------------------------------------------------------------
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
  const resolvedLabelPreview = useMemo(() => {
    if (!settings.label) return '';
    if (selectedProduct) {
      return fillPlaceholders(settings.label, selectedProduct);
    }
    // Before product is picked, resolve against sample product or show raw
    return fillPlaceholders(settings.label, SAMPLE_PRODUCT);
  }, [settings.label, selectedProduct]);

  // Scannability warning
  const scannableWarning = useMemo(() => {
    const minW = type === 'barcode' ? 20 : 10;
    const minWInUnit = convertUnit(minW, 'mm', activeUnit, 1);
    const curVal = type === 'barcode' ? Number(settings.width) : Number(settings.size);
    if (curVal > 0 && curVal < minWInUnit) {
      return `Below recommended scannable minimum (${minWInUnit} ${activeUnit})`;
    }
    return null;
  }, [type, settings, activeUnit]);

  // Color values
  const codeColor = type === 'barcode' ? (settings.lineColor || '#000000') : (settings.foreground || '#0F172A');
  const bgColor = settings.background || '#ffffff';
  const labelColor = settings.labelColor || (settings.label && typeof settings.label === 'object' ? settings.label.color : null) || codeColor;

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

  const handleLabelColorChange = (newColor) => {
    onChangeSettings({ ...settings, labelColor: newColor });
  };

  const handleMatchCodeColor = () => {
    onChangeSettings({ ...settings, labelColor: codeColor });
  };

  const isMultiLine = Boolean(settings.label && settings.label.includes('\n'));

  return (
    <div className="space-y-4 min-w-0">
      {/* 1. Value Field */}
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
          <label className="text-xs font-semibold text-gray-800">Value</label>

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
          placeholder={type === 'barcode' ? 'Enter barcode digits or item code' : 'https://... or text'}
          className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
        />
      </div>

      {/* 2. Format (Barcode mode only) */}
      {type === 'barcode' && (
        <div className="min-w-0">
          <label className="block text-xs font-semibold text-gray-800 mb-1.5">Format</label>
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

      {/* 3. Label text with Insert popover menu + Size & Gap Steppers */}
      <div className="min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-semibold text-gray-800">Label text</label>

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
                    const sampleVal = fillPlaceholders(item.tag, selectedProduct || SAMPLE_PRODUCT);
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
                    const sampleVal = fillPlaceholders(item.tag, selectedProduct || SAMPLE_PRODUCT);
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
            <span className={selectedProduct ? 'text-gray-900 font-medium' : 'text-gray-500 italic'}>
              {resolvedLabelPreview || '—'}
            </span>
          </div>
        )}
      </div>

      {/* 4. CODE SIZE BLOCK (Units Switch + Code Size Chips + Integrated Artboard Row) */}
      <div className="min-w-0 space-y-2.5 pt-1">
        {/* Title row with global Unit Switch */}
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-semibold text-gray-800">
            {type === 'barcode' ? 'Barcode size' : 'QR code size'}
          </label>

          {/* Global Units Segmented Control */}
          <div className="inline-flex p-0.5 bg-gray-100 rounded-md border border-gray-300 text-[10px]">
            {['mm', 'cm', 'inch', 'px'].map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => onChangeUnit(u)}
                className={`px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  activeUnit === u
                    ? 'bg-white text-indigo-700 font-semibold shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title={`Use ${u} as length unit`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Code Size Quick Chips */}
        <div className="grid grid-cols-5 gap-1 p-0.5 bg-gray-100/90 rounded-lg border border-gray-200">
          {[
            { id: 'auto', label: 'Auto', desc: 'Fit to artboard' },
            { id: 'small', label: 'Small', desc: type === 'barcode' ? '30 × 10 mm' : '15 mm' },
            { id: 'medium', label: 'Medium', desc: type === 'barcode' ? '45 × 15 mm' : '25 mm' },
            { id: 'large', label: 'Large', desc: type === 'barcode' ? '60 × 20 mm' : '40 mm' },
            { id: 'custom', label: 'Custom', desc: 'Specify exact dimensions' },
          ].map((chip) => {
            const isSelected = activeCodeSizeChip === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleSelectCodeSizeChip(chip.id)}
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

        {/* Custom Code Dimension Controls */}
        {activeCodeSizeChip === 'custom' && (
          <div className="p-2.5 bg-gray-50/90 border border-gray-200 rounded-lg space-y-2 min-w-0">
            {type === 'barcode' ? (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                {/* Width */}
                <div className="sm:col-span-5 min-w-0">
                  <span className="block text-[11px] text-gray-500 mb-1 truncate">
                    Width ({activeUnit})
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="10"
                    max="600"
                    value={settings.width || ''}
                    onChange={(e) => handleCustomWidthChange(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs font-mono text-gray-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                {/* Aspect Lock */}
                <div className="sm:col-span-2 flex justify-center pt-2 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => onChangeSettings({ ...settings, lockAspectRatio: !settings.lockAspectRatio })}
                    className={`w-8 h-8 rounded border flex items-center justify-center cursor-pointer transition-colors ${
                      settings.lockAspectRatio
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-600'
                        : 'bg-white border-gray-300 text-gray-400 hover:text-gray-700'
                    }`}
                    title={settings.lockAspectRatio ? 'Lock aspect ratio' : 'Unlock aspect ratio'}
                  >
                    {settings.lockAspectRatio ? (
                      <Lock className="w-3.5 h-3.5 stroke-[1.5]" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 stroke-[1.5]" />
                    )}
                  </button>
                </div>

                {/* Height */}
                <div className="sm:col-span-5 min-w-0">
                  <span className="block text-[11px] text-gray-500 mb-1 truncate">
                    Height ({activeUnit})
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="5"
                    max="400"
                    value={settings.height || ''}
                    onChange={(e) => handleCustomHeightChange(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs font-mono text-gray-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-gray-700">QR code size ({activeUnit})</span>
                <input
                  type="number"
                  step="0.5"
                  min="5"
                  max="300"
                  value={settings.size || ''}
                  onChange={(e) => handleCustomQrSizeChange(e.target.value)}
                  className="w-24 h-8 px-2.5 bg-white border border-gray-300 rounded text-xs font-mono text-gray-900 focus:outline-none focus:border-indigo-600 text-center"
                />
              </div>
            )}

            {scannableWarning && (
              <p className="text-[11px] text-amber-600 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3 h-3 shrink-0 stroke-[1.5]" />
                <span>{scannableWarning}</span>
              </p>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ARTBOARD ROW (Integrated inside Size block) */}
        {/* ------------------------------------------------------------- */}
        <div className="pt-2 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold text-gray-800">Artboard</label>
            {artboardPresetKey !== 'auto' && artboardPresetKey !== 'custom' && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-gray-400">
                  {artboardSettings.width} × {artboardSettings.height} {activeUnit}
                </span>
                <button
                  type="button"
                  onClick={handleSwapArtboardOrientation}
                  className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Swap orientation (Landscape / Portrait)"
                >
                  <RotateCw className="w-3.5 h-3.5 stroke-[1.5]" />
                </button>
              </div>
            )}
          </div>

          {/* Artboard Select */}
          <div className="relative">
            <select
              value={artboardPresetKey}
              onChange={(e) => handleArtboardSelectChange(e.target.value)}
              className="w-full h-8.5 pl-3 pr-8 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer transition-colors"
            >
              <option value="auto">Fit to code (default)</option>
              <option value="small_label">Small label (50 × 25 mm)</option>
              <option value="shelf_label">Shelf label (60 × 40 mm)</option>
              <option value="product_label">Product label (100 × 50 mm)</option>
              <option value="shipping_label">Shipping label (100 × 150 mm)</option>
              <option value="square_50">Square (50 × 50 mm)</option>
              <option value="a6">A6 (105 × 148 mm)</option>
              <option value="a5">A5 (148 × 210 mm)</option>
              <option value="a4">A4 (210 × 297 mm)</option>
              <option value="business_card">Business card (90 × 55 mm)</option>
              <option value="custom">Custom...</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[1.5]" />
          </div>

          {/* If Custom Artboard Selected, show dimensions */}
          {artboardPresetKey === 'custom' && (
            <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <span className="block text-[10px] text-gray-500 mb-0.5">Width ({activeUnit})</span>
                <input
                  type="number"
                  step="0.5"
                  value={artboardSettings.width || ''}
                  onChange={(e) => onChangeArtboard({ ...artboardSettings, preset: 'custom', width: parseFloat(e.target.value) || 0 })}
                  className="w-full h-8 px-2 bg-white border border-gray-300 rounded text-xs font-mono"
                />
              </div>

              <div className="col-span-2 flex justify-center pt-3">
                <button
                  type="button"
                  onClick={handleSwapArtboardOrientation}
                  className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
                  title="Swap orientation"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="col-span-5">
                <span className="block text-[10px] text-gray-500 mb-0.5">Height ({activeUnit})</span>
                <input
                  type="number"
                  step="0.5"
                  value={artboardSettings.height || ''}
                  onChange={(e) => onChangeArtboard({ ...artboardSettings, preset: 'custom', height: parseFloat(e.target.value) || 0 })}
                  className="w-full h-8 px-2 bg-white border border-gray-300 rounded text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* Warning Banner if Code Exceeds Artboard with Quick Actions */}
          {codeExceedsArtboard && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-amber-800 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 stroke-[1.5]" />
                <span>Code exceeds artboard boundaries</span>
              </div>
              <div className="flex items-center gap-2 pl-5">
                <button
                  type="button"
                  onClick={handleShrinkCodeToFit}
                  className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded text-[11px] font-semibold cursor-pointer transition-colors"
                >
                  Shrink code to fit
                </button>
                <button
                  type="button"
                  onClick={handleEnlargeArtboard}
                  className="px-2 py-0.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded text-[11px] font-medium cursor-pointer transition-colors"
                >
                  Enlarge artboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Colors: Two swatches + Swap button */}
      <div className="min-w-0">
        <label className="block text-xs font-semibold text-gray-800 mb-1.5">Colors</label>
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

      {/* 6. Label Color Control */}
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label className="text-xs font-semibold text-gray-800">Label color</label>
          {labelColor.toLowerCase() !== codeColor.toLowerCase() && (
            <button
              type="button"
              onClick={handleMatchCodeColor}
              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer transition-colors"
              title="Reset label color to match code color"
            >
              Match code color
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 h-9 px-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors min-w-0">
            <input
              type="color"
              value={labelColor}
              onChange={(e) => handleLabelColorChange(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border border-gray-200 p-0 shrink-0"
              title="Label text color"
            />
            <div className="min-w-0 flex-1 truncate">
              <span className="block text-[10px] text-gray-400 uppercase leading-none truncate">Label text</span>
              <span className="text-xs font-mono text-gray-800 uppercase truncate">
                {labelColor}
              </span>
            </div>
          </div>
          {labelColor.toLowerCase() === codeColor.toLowerCase() && (
            <span className="text-[11px] text-gray-400 px-2 select-none shrink-0">
              Matches code
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
