<?php

namespace App\Services;

class PlaceholderHelper
{
    public const AVAILABLE_PLACEHOLDERS = [
        '{name}' => 'Product Name',
        '{sku}' => 'SKU',
        '{price}' => 'Price',
        '{category}' => 'Category',
        '{barcode}' => 'Barcode Number',
        '{quantity}' => 'Stock Quantity',
        '{supplier}' => 'Supplier Name',
        '{supplier_contact}' => 'Supplier Contact',
        '{supplier_mobile}' => 'Supplier Mobile',
        '{supplier_phone}' => 'Supplier Phone',
        '{supplier_email}' => 'Supplier Email',
        '{supplier_city}' => 'Supplier City',
    ];

    /**
     * Replace placeholders in a pattern using product data.
     * Unknown placeholders are left unchanged.
     */
    public static function fill(?string $pattern, $product): string
    {
        if (! $pattern) {
            return '';
        }

        if (! $product) {
            return $pattern;
        }

        $get = function (string $key) use ($product) {
            if (is_array($product)) {
                return $product[$key] ?? null;
            }

            return $product->{$key} ?? null;
        };

        $supplier = null;
        if (is_array($product)) {
            $supplier = $product['supplier'] ?? null;
        } elseif (is_object($product)) {
            $supplier = $product->supplier ?? null;
        }

        $getSupplier = function (string $key) use ($supplier) {
            if (! $supplier) {
                return '';
            }
            if (is_array($supplier)) {
                return (string) ($supplier[$key] ?? '');
            }
            return (string) ($supplier->{$key} ?? '');
        };

        $replacements = [
            '{name}' => (string) ($get('name') ?? ''),
            '{sku}' => (string) ($get('sku') ?? ''),
            '{category}' => (string) ($get('category') ?? ''),
            '{barcode}' => (string) ($get('barcode_number') ?? $get('barcode') ?? ''),
            '{quantity}' => $get('quantity') !== null ? (string) $get('quantity') : '',
            '{price}' => $get('price') !== null ? '$' . number_format((float) $get('price'), 2, '.', '') : '',
            '{supplier}' => $getSupplier('name'),
            '{supplier_contact}' => $getSupplier('contact_person'),
            '{supplier_mobile}' => $getSupplier('mobile'),
            '{supplier_phone}' => $getSupplier('phone'),
            '{supplier_email}' => $getSupplier('email'),
            '{supplier_city}' => $getSupplier('city'),
        ];

        $filled = strtr($pattern, $replacements);

        return static::cleanLines($filled);
    }

    /**
     * Remove blank lines and dangling separators left by missing placeholders.
     */
    public static function cleanLines(string $text): string
    {
        $lines = preg_split('/\r\n|\r|\n/', $text);
        $cleanLines = [];

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === '') {
                continue;
            }

            // Remove leading dangling separators like "• ", "- ", "| "
            $trimmed = preg_replace('/^[\s•\-|:,]+/', '', $trimmed);
            // Remove trailing dangling separators like " •", " -", " |"
            $trimmed = preg_replace('/[\s•\-|:,]+$/', '', $trimmed);
            // Collapse multiple consecutive separators e.g. "• •"
            $trimmed = preg_replace('/([•\-|:])\s*[\1•\-|:]+/', '$1', $trimmed);
            $trimmed = trim($trimmed);

            // If line is now empty or consists purely of punctuation, skip it
            if ($trimmed !== '' && ! preg_match('/^[•\-|:,.\s]+$/u', $trimmed)) {
                $cleanLines[] = $trimmed;
            }
        }

        return implode("\n", $cleanLines);
    }
}
