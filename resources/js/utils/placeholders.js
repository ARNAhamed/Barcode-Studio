export const AVAILABLE_PLACEHOLDERS = [
  { tag: '{name}', label: 'Name' },
  { tag: '{item_code}', label: 'Item code' },
  { tag: '{price}', label: 'Price' },
  { tag: '{category}', label: 'Category' },
  { tag: '{barcode}', label: 'Barcode' },
  { tag: '{quantity}', label: 'Quantity' },
  { tag: '{supplier}', label: 'Supplier' },
  { tag: '{supplier_contact}', label: 'Contact' },
  { tag: '{supplier_mobile}', label: 'Mobile' },
  { tag: '{supplier_phone}', label: 'Phone' },
  { tag: '{supplier_email}', label: 'Email' },
  { tag: '{supplier_city}', label: 'City' },
];

export const PRESET_SUPPLIER_LABEL = '{supplier} • {supplier_mobile}';

/**
 * Remove blank lines and dangling separators (•, -, |, :) left behind by missing placeholders.
 *
 * @param {string} text
 * @returns {string}
 */
export function cleanPlaceholderLines(text) {
  if (!text) return '';

  const lines = text.split(/\r?\n/);
  const clean = [];

  for (const line of lines) {
    let trimmed = line.trim();
    if (!trimmed) continue;

    // Strip leading separators: "• ", "- ", "| ", ": "
    trimmed = trimmed.replace(/^[\s•\-|:,]+/, '').trim();
    // Strip trailing separators: " •", " -", " |", " :"
    trimmed = trimmed.replace(/[\s•\-|:,]+$/, '').trim();
    // Collapse duplicate adjacent separators
    trimmed = trimmed.replace(/([•\-|:])\s*[\1•\-|:]+/g, '$1').trim();

    // If non-empty and contains at least one alphanumeric character
    if (trimmed && !/^[•\-|:,.\s]+$/.test(trimmed)) {
      clean.push(trimmed);
    }
  }

  return clean.join('\n');
}

/**
 * Replaces known placeholders ({name}, {sku}, {price}, {category}, {barcode}, {quantity},
 * {supplier}, {supplier_contact}, {supplier_mobile}, {supplier_phone}, {supplier_email}, {supplier_city})
 * with product and supplier data. Unknown placeholders remain unchanged as plain text.
 * Missing placeholder values become empty strings, and empty lines are pruned.
 *
 * @param {string} pattern
 * @param {object|null} product
 * @returns {string}
 */
export function fillPlaceholders(pattern, product) {
  if (!pattern) return '';
  if (!product) return pattern;

  const priceVal =
    product.price !== undefined && product.price !== null && product.price !== ''
      ? `$${parseFloat(product.price).toFixed(2)}`
      : '';

  const supplier = product.supplier || null;

  const replacements = {
    '{name}': product.name ?? '',
    '{item_code}': product.sku ?? '',
    '{sku}': product.sku ?? '',
    '{category}': product.category ?? '',
    '{barcode}': product.barcode_number ?? product.barcode ?? '',
    '{quantity}': product.quantity !== undefined && product.quantity !== null ? String(product.quantity) : '',
    '{price}': priceVal,
    '{supplier}': supplier?.name ?? '',
    '{supplier_contact}': supplier?.contact_person ?? '',
    '{supplier_mobile}': supplier?.mobile ?? '',
    '{supplier_phone}': supplier?.phone ?? '',
    '{supplier_email}': supplier?.email ?? '',
    '{supplier_city}': supplier?.city ?? '',
  };

  const filled = pattern.replace(/\{(\w+)\}/g, (match) => {
    if (Object.prototype.hasOwnProperty.call(replacements, match)) {
      return replacements[match];
    }
    return match;
  });

  return cleanPlaceholderLines(filled);
}

/**
 * Check if a string contains any supported placeholder tokens.
 */
export function hasPlaceholders(text) {
  if (!text || typeof text !== 'string') return false;
  return /\{(name|item_code|sku|price|category|barcode|quantity|supplier|supplier_contact|supplier_mobile|supplier_phone|supplier_email|supplier_city)\}/.test(
    text
  );
}
