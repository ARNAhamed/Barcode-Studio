<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\BarcodeNumberGenerator;
use App\Services\ProductCsvService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductController extends Controller
{
    /**
     * Display a listing of active products with search, sort, and pagination.
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
     * Get summary counts for stock metrics and trash bin.
     */
    public function summary(): JsonResponse
    {
        $total = Product::count();
        $outOfStock = Product::where('quantity', '<=', 0)->count();
        $lowStock = Product::where('quantity', '>', 0)
            ->whereColumn('quantity', '<=', 'low_stock_threshold')
            ->count();
        $trashCount = Product::onlyTrashed()->count();

        return response()->json([
            'total' => $total,
            'low' => $lowStock,
            'out' => $outOfStock,
            'trash' => $trashCount,
        ]);
    }

    /**
     * Quick lookup for autocomplete in code designer (excluding trashed).
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
    public function store(ProductRequest $request, BarcodeNumberGenerator $generator): JsonResponse
    {
        $data = $request->validated();

        if (empty($data['barcode_number']) && $request->boolean('auto_generate_barcode')) {
            $format = $request->input('auto_barcode_format', config('barcode.default_product_format', 'CODE128'));
            $data['barcode_number'] = $generator->generate($format);
        }

        unset($data['auto_generate_barcode'], $data['auto_barcode_format']);

        $product = Product::create($data);

        return (new ProductResource($product))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Bulk auto-generate unique barcode numbers for products with missing barcodes.
     */
    public function bulkGenerateBarcodes(Request $request, BarcodeNumberGenerator $generator): JsonResponse
    {
        $request->validate([
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer|exists:products,id',
            'format' => 'nullable|string|in:CODE128,EAN13,EAN8,UPC',
        ]);

        $format = $request->input('format', config('barcode.default_product_format', 'CODE128'));
        $productIds = $request->input('product_ids');

        $query = Product::where(function ($q) {
            $q->whereNull('barcode_number')
              ->orWhere('barcode_number', '');
        });

        if (!empty($productIds)) {
            $query->whereIn('id', $productIds);
        }

        $products = $query->get();
        $count = 0;

        DB::transaction(function () use ($products, $format, $generator, &$count) {
            foreach ($products as $product) {
                $newNumber = $generator->generate($format);
                $product->update(['barcode_number' => $newNumber]);
                $count++;
            }
        });

        return response()->json([
            'count' => $count,
            'message' => "{$count} barcodes generated.",
        ]);
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
     * Soft delete a product (moves to Recycle Bin).
     */
    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json([
            'message' => 'Product moved to Recycle Bin.',
            'product' => new ProductResource($product),
        ]);
    }

    /**
     * List all soft-deleted products in the Recycle Bin.
     */
    public function trash(Request $request): AnonymousResourceCollection
    {
        $query = Product::onlyTrashed()->withCount('codes');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode_number', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        $sort = $request->input('sort', '-deleted_at');
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $column = ltrim($sort, '-');

        $allowedSorts = ['id', 'name', 'sku', 'price', 'quantity', 'category', 'created_at', 'deleted_at'];
        if (in_array($column, $allowedSorts, true)) {
            $query->orderBy($column, $direction);
        } else {
            $query->orderBy('deleted_at', 'desc');
        }

        $perPage = (int) $request->input('per_page', 10);
        $trashedProducts = $query->paginate($perPage);

        return ProductResource::collection($trashedProducts);
    }

    /**
     * Restore a soft-deleted product from the Recycle Bin.
     */
    public function restore(int $id): JsonResponse
    {
        $product = Product::onlyTrashed()->findOrFail($id);
        $product->restore();

        return response()->json([
            'message' => "Product '{$product->name}' restored successfully.",
            'product' => new ProductResource($product),
        ]);
    }

    /**
     * Permanently delete a product from the database.
     */
    public function forceDelete(int $id): JsonResponse
    {
        $product = Product::onlyTrashed()->findOrFail($id);
        $product->forceDelete();

        return response()->json([
            'message' => 'Product permanently deleted.',
        ]);
    }

    /**
     * Restore all products currently in the Recycle Bin.
     */
    public function restoreAll(): JsonResponse
    {
        $count = Product::onlyTrashed()->count();
        Product::onlyTrashed()->restore();

        return response()->json([
            'message' => "{$count} products restored from Recycle Bin.",
        ]);
    }

    /**
     * Permanently delete all products currently in the Recycle Bin.
     */
    public function emptyTrash(): JsonResponse
    {
        $count = Product::onlyTrashed()->count();
        Product::onlyTrashed()->forceDelete();

        return response()->json([
            'message' => "Recycle Bin emptied ({$count} products permanently deleted).",
        ]);
    }

    /**
     * Export products as a CSV download.
     */
    public function export(Request $request, ProductCsvService $csvService): StreamedResponse
    {
        return $csvService->export($request);
    }

    /**
     * Download sample CSV template.
     */
    public function importTemplate(ProductCsvService $csvService): StreamedResponse
    {
        return $csvService->template();
    }

    /**
     * Preview and validate CSV import rows without saving.
     */
    public function importPreview(Request $request, ProductCsvService $csvService): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:5120'],
        ]);

        $result = $csvService->preview($request->file('file')->getRealPath());

        return response()->json($result);
    }

    /**
     * Commit CSV import in a database transaction.
     */
    public function importCommit(Request $request, ProductCsvService $csvService): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:5120'],
            'mode' => ['nullable', 'string', 'in:skip_existing,update_existing'],
            'auto_generate_barcodes' => ['nullable'],
        ]);

        $mode = $request->input('mode', 'update_existing');
        $autoGenerateBarcodes = $request->boolean('auto_generate_barcodes');

        $result = $csvService->commit(
            $request->file('file')->getRealPath(),
            $mode,
            $autoGenerateBarcodes
        );

        return response()->json($result);
    }
}

