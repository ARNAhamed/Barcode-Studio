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

        $replacements = [
            '{name}' => (string) ($get('name') ?? ''),
            '{sku}' => (string) ($get('sku') ?? ''),
            '{category}' => (string) ($get('category') ?? ''),
            '{barcode}' => (string) ($get('barcode_number') ?? $get('barcode') ?? ''),
            '{quantity}' => $get('quantity') !== null ? (string) $get('quantity') : '',
            '{price}' => $get('price') !== null ? '$' . number_format((float) $get('price'), 2, '.', '') : '',
        ];

        return strtr($pattern, $replacements);
    }
}
