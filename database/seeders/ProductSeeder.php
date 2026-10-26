<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $products = [
            [
                'name' => 'Wireless Noise-Canceling Headphones',
                'sku' => 'AUD-WNC-001',
                'barcode_number' => '8901234567890',
                'category' => 'Electronics',
                'price' => 149.99,
                'quantity' => 38,
                'low_stock_threshold' => 10,
                'description' => 'Over-ear Bluetooth headphones with active noise cancellation and 40h battery life.',
            ],
            [
                'name' => 'Ergonomic Mechanical Keyboard',
                'sku' => 'INP-EMK-002',
                'barcode_number' => '8901234567891',
                'category' => 'Electronics',
                'price' => 89.50,
                'quantity' => 15,
                'low_stock_threshold' => 10,
                'description' => 'Split layout mechanical keyboard with hot-swappable tactile switches.',
            ],
            [
                'name' => 'Precision Gaming Mouse',
                'sku' => 'INP-PGM-003',
                'barcode_number' => '8901234567892',
                'category' => 'Electronics',
                'price' => 49.99,
                'quantity' => 6, // Low stock (<= 10)
                'low_stock_threshold' => 10,
                'description' => 'Lightweight RGB optical mouse with programmable side macro buttons.',
            ],
            [
                'name' => 'Classic Cotton Crewneck T-Shirt (Navy, M)',
                'sku' => 'APP-CNT-004',
                'barcode_number' => '8901234567893',
                'category' => 'Apparel',
                'price' => 24.00,
                'quantity' => 120,
                'low_stock_threshold' => 15,
                'description' => '100% organic ring-spun cotton everyday crewneck t-shirt.',
            ],
            [
                'name' => 'Heavyweight Fleece Zip Hoodie (Grey, L)',
                'sku' => 'APP-HZH-005',
                'barcode_number' => '8901234567894',
                'category' => 'Apparel',
                'price' => 68.00,
                'quantity' => 4, // Low stock (<= 10)
                'low_stock_threshold' => 10,
                'description' => 'Cozy fleece zip hoodie featuring reinforced stitching and double-lined hood.',
            ],
            [
                'name' => 'Raw Denim Slim Fit Jeans (32x32)',
                'sku' => 'APP-RDJ-006',
                'barcode_number' => '8901234567895',
                'category' => 'Apparel',
                'price' => 95.00,
                'quantity' => 0, // Out of stock
                'low_stock_threshold' => 10,
                'description' => 'Japanese selvedge raw denim jeans with classic 5-pocket styling.',
            ],
            [
                'name' => 'Ceramic Pour-Over Coffee Dripper',
                'sku' => 'KIT-CCD-007',
                'barcode_number' => '8901234567896',
                'category' => 'Home & Living',
                'price' => 28.50,
                'quantity' => 45,
                'low_stock_threshold' => 10,
                'description' => 'Artisan ceramic cone dripper designed for optimal manual brew extraction.',
            ],
            [
                'name' => 'Double-Walled Insulated Tumbler 500ml',
                'sku' => 'KIT-DWT-008',
                'barcode_number' => '8901234567897',
                'category' => 'Home & Living',
                'price' => 19.99,
                'quantity' => 72,
                'low_stock_threshold' => 12,
                'description' => 'Vacuum insulated food-grade stainless steel tumbler keeping drinks cold 24h.',
            ],
            [
                'name' => 'Aromatherapy Soy Wax Candle (Lavender)',
                'sku' => 'HOM-ASW-009',
                'barcode_number' => '8901234567898',
                'category' => 'Home & Living',
                'price' => 16.00,
                'quantity' => 8, // Low stock (<= 10)
                'low_stock_threshold' => 10,
                'description' => 'Hand-poured pure soy wax candle with natural French lavender essential oils.',
            ],
            [
                'name' => 'Hardcover Dot Grid Journal (A5)',
                'sku' => 'OFC-HDG-010',
                'barcode_number' => '8901234567899',
                'category' => 'Office Supplies',
                'price' => 14.50,
                'quantity' => 95,
                'low_stock_threshold' => 15,
                'description' => '120gsm fountain pen friendly paper with ribbon marker and expandable back pocket.',
            ],
            [
                'name' => 'Aluminum Laptop Riser Stand',
                'sku' => 'OFC-ALR-011',
                'barcode_number' => '8901234567800',
                'category' => 'Office Supplies',
                'price' => 39.95,
                'quantity' => 22,
                'low_stock_threshold' => 8,
                'description' => 'Foldable heat-dissipating anodized aluminum laptop desk stand.',
            ],
            [
                'name' => 'Gel Ink Pen 0.5mm (Box of 12, Black)',
                'sku' => 'OFC-GIP-012',
                'barcode_number' => '8901234567801',
                'category' => 'Office Supplies',
                'price' => 12.99,
                'quantity' => 50,
                'low_stock_threshold' => 10,
                'description' => 'Quick-drying smooth writing black rollerball pens with comfortable grip.',
            ],
            [
                'name' => 'Organic Matcha Green Tea Powder 100g',
                'sku' => 'FNB-MGT-013',
                'barcode_number' => '8901234567802',
                'category' => 'Food & Beverage',
                'price' => 22.00,
                'quantity' => 30,
                'low_stock_threshold' => 10,
                'description' => 'Ceremonial grade stone-ground Japanese Uji matcha tea powder.',
            ],
            [
                'name' => 'Single Origin Whole Bean Coffee 250g',
                'sku' => 'FNB-SOB-014',
                'barcode_number' => '8901234567803',
                'category' => 'Food & Beverage',
                'price' => 17.50,
                'quantity' => 2, // Low stock (<= 10)
                'low_stock_threshold' => 10,
                'description' => 'Light roast Ethiopian Yirgacheffe coffee with floral and citrus notes.',
            ],
            [
                'name' => 'Cold Brew Glass Pitcher with Mesh Filter 1L',
                'sku' => 'KIT-CBP-015',
                'barcode_number' => '8901234567804',
                'category' => 'Food & Beverage',
                'price' => 32.00,
                'quantity' => 18,
                'low_stock_threshold' => 5,
                'description' => 'Borosilicate glass pitcher with ultra-fine stainless steel infusion core.',
            ],
        ];

        foreach ($products as $product) {
            Product::updateOrCreate(['sku' => $product['sku']], $product);
        }
    }
}
