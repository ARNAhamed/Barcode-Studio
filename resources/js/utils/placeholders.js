export const AVAILABLE_PLACEHOLDERS = [
  { tag: '{name}', label: 'Name' },
  { tag: '{sku}', label: 'SKU' },
  { tag: '{price}', label: 'Price' },
  { tag: '{category}', label: 'Category' },
  { tag: '{barcode}', label: 'Barcode' },
  { tag: '{quantity}', label: 'Quantity' },
];

/**
 * Replaces known placeholders ({name}, {sku}, {price}, {category}, {barcode}, {quantity})
 * with product data. Unknown placeholders remain unchanged as plain text.
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

  const replacements = {
    '{name}': product.name ?? '',
    '{sku}': product.sku ?? '',
    '{category}': product.category ?? '',
    '{barcode}': product.barcode_number ?? product.barcode ?? '',
    '{quantity}': product.quantity !== undefined && product.quantity !== null ? String(product.quantity) : '',
    '{price}': priceVal,
  };

  return pattern.replace(/\{(\w+)\}/g, (match) => {
    if (Object.prototype.hasOwnProperty.call(replacements, match)) {
      return replacements[match];
    }
    return match;
  });
}

/**
 * Check if a string contains any supported placeholder tokens.
 */
export function hasPlaceholders(text) {
  if (!text || typeof text !== 'string') return false;
  return /\{(name|sku|price|category|barcode|quantity)\}/.test(text);
}
