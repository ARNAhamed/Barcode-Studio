<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Setting;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;

class PublicProductController extends Controller
{
    /**
     * Public rate-limited endpoint to retrieve sanitized product and supplier details.
     */
    public function show(string $token): JsonResponse
    {
        // 1. Check if public product pages are enabled
        $enabled = Setting::getBool('public_page_enabled', true);
        if (! $enabled) {
            return response()->json([
                'enabled' => false,
                'message' => 'This page is not available.',
            ], 403);
        }

        // 2. Locate product by public token (excludes trashed products via SoftDeletes)
        $product = Product::where('public_token', $token)->first();

        if (! $product) {
            return response()->json([
                'message' => 'Product not found.',
            ], 404);
        }

        // 3. Stock availability status
        $statusMap = [
            'in' => 'In stock',
            'low' => 'Low stock',
            'out' => 'Out of stock',
        ];
        $availability = $statusMap[$product->stock_status] ?? 'In stock';

        $payload = [
            'enabled' => true,
            'product' => [
                'name' => $product->name,
                'barcode_number' => $product->barcode_number,
                'sku' => $product->sku,
                'price' => (float) $product->price,
                'category' => $product->category,
                'availability' => $availability,
                'stock_status' => $product->stock_status,
                'image' => null,
            ],
        ];

        // 4. Supplier details (strictly excluded if public_page_show_supplier is disabled)
        $showSupplier = Setting::getBool('public_page_show_supplier', true);

        if ($showSupplier) {
            if (! $product->supplier_id) {
                $payload['supplier'] = null;
            } else {
                $supplier = Supplier::withTrashed()->find($product->supplier_id);

                if (! $supplier || $supplier->trashed()) {
                    $payload['supplier'] = [
                        'unavailable' => true,
                        'name' => 'Supplier unavailable',
                    ];
                } else {
                    $addressParts = array_filter([
                        $supplier->address_line1,
                        $supplier->address_line2,
                        $supplier->city,
                        $supplier->postal_code,
                        $supplier->country,
                    ]);

                    $payload['supplier'] = [
                        'name' => $supplier->name,
                        'contact_person' => $supplier->contact_person,
                        'mobile' => $supplier->mobile,
                        'phone' => $supplier->phone,
                        'email' => $supplier->email,
                        'address' => count($addressParts) > 0 ? implode(', ', $addressParts) : null,
                        'address_line1' => $supplier->address_line1,
                        'address_line2' => $supplier->address_line2,
                        'city' => $supplier->city,
                        'postal_code' => $supplier->postal_code,
                        'country' => $supplier->country,
                        'payment_terms' => $supplier->payment_terms,
                    ];
                }
            }
        }

        return response()->json($payload);
    }
}
