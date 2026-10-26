<?php

namespace App\Http\Controllers;

use App\Models\Code;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class BinController extends Controller
{
    /**
     * Get recycle bin summary counts for products, codes, and total.
     */
    public function summary(): JsonResponse
    {
        $products = Product::onlyTrashed()->count();
        $codes = Code::onlyTrashed()->count();

        return response()->json([
            'products' => $products,
            'codes' => $codes,
            'total' => $products + $codes,
        ]);
    }
}
