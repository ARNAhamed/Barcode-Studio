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
