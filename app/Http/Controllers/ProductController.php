<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductController extends Controller
{
    /**
     * Display a listing of products with search, sort, and pagination.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Product::query()->withCount('codes');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode_number', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        $sort = $request->input('sort', '-created_at');
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $column = ltrim($sort, '-');

        $allowedSorts = ['id', 'name', 'sku', 'price', 'quantity', 'category', 'created_at'];
        if (in_array($column, $allowedSorts, true)) {
            $query->orderBy($column, $direction);
        } else {
            $query->latest();
        }

        $perPage = (int) $request->input('per_page', 10);
        $products = $query->paginate($perPage);

        return ProductResource::collection($products);
    }

    /**
     * Get summary counts for stock metrics.
     */
    public function summary(): JsonResponse
    {
        $total = Product::count();
        $outOfStock = Product::where('quantity', '<=', 0)->count();
        $lowStock = Product::where('quantity', '>', 0)
            ->whereColumn('quantity', '<=', 'low_stock_threshold')
            ->count();

        return response()->json([
            'total' => $total,
            'low' => $lowStock,
            'out' => $outOfStock,
        ]);
    }

    /**
     * Quick lookup for autocomplete in code designer.
     */
    public function lookup(Request $request): AnonymousResourceCollection
    {
        $query = Product::query();

        if ($search = $request->input('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode_number', 'like', "%{$search}%");
            });
        }

        $products = $query->latest()->limit(10)->get();

        return ProductResource::collection($products);
    }

    /**
     * Store a newly created product in storage.
     */
    public function store(ProductRequest $request): JsonResponse
    {
        $product = Product::create($request->validated());

        return (new ProductResource($product))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified product.
     */
    public function show(Product $product): ProductResource
    {
        return new ProductResource($product->loadCount('codes'));
    }

    /**
     * Update the specified product in storage.
     */
    public function update(ProductRequest $request, Product $product): ProductResource
    {
        $product->update($request->validated());

        return new ProductResource($product);
    }

    /**
     * Remove the specified product from storage.
     */
    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json(['message' => 'Product deleted successfully.']);
    }
}
