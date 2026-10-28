<?php

namespace App\Http\Controllers;

use App\Models\Code;
use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;

class BinController extends Controller
{
    /**
     * Get recycle bin summary counts for products, codes, suppliers, and total.
     */
    public function summary(): JsonResponse
    {
        $products = Product::onlyTrashed()->count();
        $codes = Code::onlyTrashed()->count();
        $suppliers = Supplier::onlyTrashed()->count();

        return response()->json([
            'products' => $products,
            'codes' => $codes,
            'suppliers' => $suppliers,
            'total' => $products + $suppliers + $codes,
        ]);
    }
}
