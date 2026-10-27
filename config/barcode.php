<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Default Company Prefixes for GS1 Barcodes
    |--------------------------------------------------------------------------
    | The 200-299 range is reserved for internal restricted distribution
    | (in-store/internal inventory use) per GS1 specifications.
    */
    'company_prefix' => env('BARCODE_COMPANY_PREFIX', '200'),
    'ean8_prefix' => env('BARCODE_EAN8_PREFIX', '20'),
    'upc_prefix' => env('BARCODE_UPC_PREFIX', '02'),
    'code128_prefix' => env('BARCODE_CODE128_PREFIX', 'PRD-'),

    /*
    | Default format used when auto-generating barcodes on product create
    */
    'default_product_format' => env('BARCODE_DEFAULT_FORMAT', 'CODE128'),
];
