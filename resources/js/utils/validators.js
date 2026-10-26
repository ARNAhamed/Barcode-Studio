/**
 * Format validators for Barcodes and QR codes.
 */

// Calculate EAN-13 check digit for 12 digits
export const calculateEan13CheckDigit = (digits12) => {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const num = parseInt(digits12[i], 10);
    sum += i % 2 === 0 ? num : num * 3;
  }
  return (10 - (sum % 10)) % 10;
};

// Calculate EAN-8 check digit for 7 digits
export const calculateEan8CheckDigit = (digits7) => {
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const num = parseInt(digits7[i], 10);
    sum += i % 2 === 0 ? num * 3 : num;
  }
  return (10 - (sum % 10)) % 10;
};

// Calculate UPC-A check digit for 11 digits
export const calculateUpcCheckDigit = (digits11) => {
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const num = parseInt(digits11[i], 10);
    sum += i % 2 === 0 ? num * 3 : num;
  }
  return (10 - (sum % 10)) % 10;
};

export const validateBarcode = (format, value) => {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    return { isValid: false, error: 'Value cannot be empty.' };
  }

  const trimmed = value.trim();

  switch (format) {
    case 'EAN13': {
      if (!/^\d{12,13}$/.test(trimmed)) {
        return { isValid: false, error: 'EAN-13 requires exactly 12 or 13 numeric digits.' };
      }
      if (trimmed.length === 13) {
        const expected = calculateEan13CheckDigit(trimmed.slice(0, 12));
        const actual = parseInt(trimmed[12], 10);
        if (expected !== actual) {
          return {
            isValid: false,
            error: `Invalid EAN-13 check digit. Expected ${expected} at the end, but got ${actual}.`,
          };
        }
      }
      return { isValid: true, error: null };
    }

    case 'EAN8': {
      if (!/^\d{7,8}$/.test(trimmed)) {
        return { isValid: false, error: 'EAN-8 requires exactly 7 or 8 numeric digits.' };
      }
      if (trimmed.length === 8) {
        const expected = calculateEan8CheckDigit(trimmed.slice(0, 7));
        const actual = parseInt(trimmed[7], 10);
        if (expected !== actual) {
          return {
            isValid: false,
            error: `Invalid EAN-8 check digit. Expected ${expected} at the end, but got ${actual}.`,
          };
        }
      }
      return { isValid: true, error: null };
    }

    case 'UPC': {
      if (!/^\d{11,12}$/.test(trimmed)) {
        return { isValid: false, error: 'UPC-A requires exactly 11 or 12 numeric digits.' };
      }
      if (trimmed.length === 12) {
        const expected = calculateUpcCheckDigit(trimmed.slice(0, 11));
        const actual = parseInt(trimmed[11], 10);
        if (expected !== actual) {
          return {
            isValid: false,
            error: `Invalid UPC check digit. Expected ${expected} at the end, but got ${actual}.`,
          };
        }
      }
      return { isValid: true, error: null };
    }

    case 'ITF14': {
      if (!/^\d{13,14}$/.test(trimmed)) {
        return { isValid: false, error: 'ITF-14 requires 13 or 14 numeric digits.' };
      }
      return { isValid: true, error: null };
    }

    case 'CODE39': {
      // CODE39 standard characters: 0-9, A-Z, space, -, ., $, /, +, %
      if (!/^[0-9A-Z\-.$/+% ]+$/i.test(trimmed)) {
        return {
          isValid: false,
          error: 'CODE39 only supports uppercase letters, numbers, and symbols (- . $ / + % space).',
        };
      }
      return { isValid: true, error: null };
    }

    case 'CODE128':
    default: {
      // CODE128 supports ASCII 0-127
      // eslint-disable-next-line no-control-regex
      if (!/^[\x00-\x7F]+$/.test(trimmed)) {
        return { isValid: false, error: 'CODE128 only supports standard ASCII characters.' };
      }
      return { isValid: true, error: null };
    }
  }
};

export const validateQr = (value) => {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    return { isValid: false, error: 'QR Code content cannot be empty.' };
  }
  return { isValid: true, error: null };
};
