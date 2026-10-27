/**
 * Unit conversion and sizing helpers for Barcode & QR Designer.
 *
 * Rules:
 * - 1 inch = 96 px
 * - 1 inch = 2.54 cm
 * - 1 cm = 10 mm
 */

export const UNITS = [
  { value: 'px', label: 'px', step: 1, min: 20, max: 2400 },
  { value: 'cm', label: 'cm', step: 0.1, min: 0.5, max: 60 },
  { value: 'mm', label: 'mm', step: 1, min: 5, max: 600 },
  { value: 'inch', label: 'inch', step: 0.1, min: 0.2, max: 25 },
];

export const DPIS = [72, 150, 300, 600];

// Convert any unit value to screen CSS pixels (96 DPI baseline)
export const toPx = (value, unit) => {
  const num = parseFloat(value);
  if (isNaN(num)) return 0;

  switch (unit) {
    case 'inch':
      return num * 96;
    case 'cm':
      return num * (96 / 2.54);
    case 'mm':
      return num * (96 / 25.4);
    case 'px':
    default:
      return num;
  }
};

// Convert screen CSS pixels (96 DPI baseline) to target unit
export const fromPx = (pxValue, unit, decimals = 2) => {
  const px = parseFloat(pxValue);
  if (isNaN(px)) return 0;

  let result = 0;
  switch (unit) {
    case 'inch':
      result = px / 96;
      break;
    case 'cm':
      result = px / (96 / 2.54);
      break;
    case 'mm':
      result = px / (96 / 25.4);
      break;
    case 'px':
    default:
      result = px;
      break;
  }

  return unit === 'px' ? Math.round(result) : parseFloat(result.toFixed(decimals));
};

// Convert value from one unit to another
export const convertUnit = (value, fromUnit, toUnit, decimals = 2) => {
  const px = toPx(value, fromUnit);
  return fromPx(px, toUnit, decimals);
};

// Calculate physical output pixels at target export DPI
export const calculateDpiPixels = (pxValue, dpi = 300) => {
  // pxValue is at 96 DPI. Scale factor = dpi / 96.
  return Math.round((parseFloat(pxValue) / 96) * dpi);
};

// Format human-readable output dimensions string
export const formatOutputDimensions = ({ widthPx, heightPx, unit = 'px', dpi = 300 }) => {
  const wUnit = fromPx(widthPx, unit, 2);
  const hUnit = fromPx(heightPx, unit, 2);

  const wDpiPx = calculateDpiPixels(widthPx, dpi);
  const hDpiPx = calculateDpiPixels(heightPx, dpi);

  if (unit === 'px') {
    return `${Math.round(widthPx)} × ${Math.round(heightPx)} px (${wDpiPx} × ${hDpiPx} px at ${dpi} DPI)`;
  }

  return `${wUnit.toFixed(2)} ${unit} × ${hUnit.toFixed(2)} ${unit} (${wDpiPx} × ${hDpiPx} px at ${dpi} DPI)`;
};

// Validate size value
export const validateDimension = (value, unit = 'px') => {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) {
    return 'Size must be a positive number greater than 0.';
  }

  const px = toPx(num, unit);
  if (px < 20) {
    return `Size is too small (minimum 20px / ~0.5cm).`;
  }
  if (px > 2400) {
    return `Size exceeds maximum limit (maximum 2400px / ~60cm).`;
  }

  return null;
};

export const ARTBOARD_PRESETS = [
  { id: 'auto', label: 'Auto (fit to code)', widthMm: null, heightMm: null },
  { id: 'small_label', label: 'Small label 50 × 25 mm', widthMm: 50, heightMm: 25 },
  { id: 'shelf_label', label: 'Shelf label 60 × 40 mm', widthMm: 60, heightMm: 40 },
  { id: 'product_label', label: 'Product label 100 × 50 mm', widthMm: 100, heightMm: 50 },
  { id: 'shipping_label', label: 'Shipping label 100 × 150 mm', widthMm: 100, heightMm: 150 },
  { id: 'a6', label: 'A6 (105 × 148 mm)', widthMm: 105, heightMm: 148 },
  { id: 'a5', label: 'A5 (148 × 210 mm)', widthMm: 148, heightMm: 210 },
  { id: 'a4', label: 'A4 (210 × 297 mm)', widthMm: 210, heightMm: 297 },
  { id: 'square_50', label: 'Square 50 × 50 mm', widthMm: 50, heightMm: 50 },
  { id: 'business_card', label: 'Business card 90 × 55 mm', widthMm: 90, heightMm: 55 },
  { id: 'custom', label: 'Custom size', widthMm: null, heightMm: null },
];

export const DEFAULT_ARTBOARD_SETTINGS = {
  preset: 'auto', // 'auto' | preset id | 'custom'
  unit: 'mm',
  width: 100,
  height: 50,
  orientation: 'landscape', // 'portrait' | 'landscape'
  lockAspectRatio: false,
  background: '#ffffff',
  border: {
    enabled: false,
    color: '#cbd5e1',
    width: 1, // in px
  },
  radius: 0, // in px
  alignment: 'center', // 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  padding: 5, // in current unit (or mm default)
  fit: 'original', // 'original' | 'fit' | 'fill-width'
  xOffset: 0, // in px
  yOffset: 0, // in px
  exportCodeOnly: false,
};

// Convert preset mm to active unit
export const getPresetDimensionsInUnit = (preset, targetUnit = 'mm') => {
  if (!preset || preset.widthMm == null || preset.heightMm == null) {
    return null;
  }
  const w = convertUnit(preset.widthMm, 'mm', targetUnit, 2);
  const h = convertUnit(preset.heightMm, 'mm', targetUnit, 2);
  return { width: w, height: h };
};

// Validate artboard dimension
export const validateArtboardDimension = (value, unit = 'mm') => {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) {
    return 'Artboard size must be a positive number greater than 0.';
  }

  const px = toPx(num, unit);
  if (px < 40) {
    return 'Artboard size is too small (minimum ~10mm / 40px).';
  }
  if (px > 4000) {
    return 'Artboard size exceeds maximum limit (~1000mm / 4000px).';
  }

  return null;
};
