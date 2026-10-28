<?php

namespace App\Http\Controllers;

use App\Http\Requests\SupplierRequest;
use App\Http\Resources\SupplierResource;
use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SupplierController extends Controller
{
    /**
     * Display a listing of suppliers with search, sort, status filter, and pagination.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Supplier::query()->withCount('products');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('contact_person', 'like', "%{$search}%")
                    ->orWhere('mobile', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            if (in_array($status, ['active', 'inactive'], true)) {
                $query->where('status', $status);
            }
        }

        if ($ids = $request->input('ids')) {
            if (is_array($ids)) {
                $query->whereIn('id', $ids);
            }
        }

        $sort = $request->input('sort', 'name');
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $column = ltrim($sort, '-');

        $allowedSorts = ['id', 'name', 'contact_person', 'city', 'status', 'created_at', 'products_count'];
        if (in_array($column, $allowedSorts, true)) {
            $query->orderBy($column, $direction);
        } else {
            $query->orderBy('name', 'asc');
        }

        $perPage = min(500, max(1, (int) $request->input('per_page', 10)));
        $suppliers = $query->paginate($perPage);

        return SupplierResource::collection($suppliers);
    }

    /**
     * Get summary metrics for suppliers page.
     */
    public function summary(): JsonResponse
    {
        $total = Supplier::count();
        $active = Supplier::where('status', 'active')->count();
        $noSupplierProducts = Product::whereNull('supplier_id')->count();

        return response()->json([
            'total' => $total,
            'active' => $active,
            'no_supplier_products' => $noSupplierProducts,
        ]);
    }

    /**
     * Quick lookup for dropdowns (active only, max 10).
     */
    public function lookup(Request $request): AnonymousResourceCollection
    {
        $query = Supplier::query()->where('status', 'active');

        if ($search = $request->input('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('contact_person', 'like', "%{$search}%")
                    ->orWhere('mobile', 'like', "%{$search}%");
            });
        }

        $suppliers = $query->orderBy('name')->limit(10)->get();

        return SupplierResource::collection($suppliers);
    }

    /**
     * Store a newly created supplier.
     */
    public function store(SupplierRequest $request): JsonResponse
    {
        $data = $request->validated();
        if (empty($data['status'])) {
            $data['status'] = 'active';
        }
        if (empty($data['country'])) {
            $data['country'] = 'Sri Lanka';
        }

        $supplier = Supplier::create($data);

        return (new SupplierResource($supplier->loadCount('products')))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified supplier with products.
     */
    public function show(Supplier $supplier): SupplierResource
    {
        $supplier->load(['products' => function ($q) {
            $q->latest();
        }]);
        $supplier->loadCount('products');

        return new SupplierResource($supplier);
    }

    /**
     * Update the specified supplier.
     */
    public function update(SupplierRequest $request, Supplier $supplier): SupplierResource
    {
        $data = $request->validated();
        $supplier->update($data);

        return new SupplierResource($supplier->loadCount('products'));
    }

    /**
     * Soft delete a supplier (moves to Recycle Bin).
     */
    public function destroy(Supplier $supplier): JsonResponse
    {
        $supplier->delete();

        return response()->json([
            'message' => 'Supplier moved to Recycle Bin.',
            'supplier' => new SupplierResource($supplier),
        ]);
    }

    /**
     * List trashed suppliers in Recycle Bin.
     */
    public function trash(Request $request): AnonymousResourceCollection
    {
        $query = Supplier::onlyTrashed()->withCount('products');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('contact_person', 'like', "%{$search}%")
                    ->orWhere('mobile', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%");
            });
        }

        $sort = $request->input('sort', '-deleted_at');
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $column = ltrim($sort, '-');

        $allowedSorts = ['id', 'name', 'contact_person', 'city', 'deleted_at', 'created_at'];
        if (in_array($column, $allowedSorts, true)) {
            $query->orderBy($column, $direction);
        } else {
            $query->orderBy('deleted_at', 'desc');
        }

        $perPage = (int) $request->input('per_page', 10);
        $trashed = $query->paginate($perPage);

        return SupplierResource::collection($trashed);
    }

    /**
     * Restore a soft-deleted supplier.
     */
    public function restore(int $id): JsonResponse
    {
        $supplier = Supplier::onlyTrashed()->findOrFail($id);
        $supplier->restore();

        return response()->json([
            'message' => "Supplier '{$supplier->name}' restored successfully.",
            'supplier' => new SupplierResource($supplier->loadCount('products')),
        ]);
    }

    /**
     * Permanently delete a supplier. Sets supplier_id to null on products.
     */
    public function forceDelete(int $id): JsonResponse
    {
        $supplier = Supplier::onlyTrashed()->findOrFail($id);
        Product::where('supplier_id', $supplier->id)->update(['supplier_id' => null]);
        $supplier->forceDelete();

        return response()->json([
            'message' => 'Supplier permanently deleted.',
        ]);
    }

    /**
     * Restore all trashed suppliers.
     */
    public function restoreAll(): JsonResponse
    {
        $count = Supplier::onlyTrashed()->count();
        Supplier::onlyTrashed()->restore();

        return response()->json([
            'message' => "{$count} suppliers restored from Recycle Bin.",
        ]);
    }

    /**
     * Permanently delete all trashed suppliers.
     */
    public function emptyTrash(): JsonResponse
    {
        $trashedIds = Supplier::onlyTrashed()->pluck('id');
        Product::whereIn('supplier_id', $trashedIds)->update(['supplier_id' => null]);
        $count = Supplier::onlyTrashed()->forceDelete();

        return response()->json([
            'message' => "Recycle Bin emptied ({$count} suppliers permanently deleted).",
        ]);
    }

    /**
     * Export selected suppliers as CSV with UTF-8 BOM.
     */
    public function export(Request $request): StreamedResponse
    {
        $allMatching = $request->boolean('all_matching');
        $ids = $request->input('ids');

        if (!$allMatching) {
            $request->validate([
                'ids' => ['required', 'array', 'min:1'],
                'ids.*' => ['integer', 'exists:suppliers,id'],
            ]);
        }

        $query = Supplier::query()->withCount('products');

        if ($allMatching) {
            if ($search = $request->input('search')) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('contact_person', 'like', "%{$search}%")
                        ->orWhere('mobile', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('city', 'like', "%{$search}%");
                });
            }

            if ($status = $request->input('status')) {
                if (in_array($status, ['active', 'inactive'], true)) {
                    $query->where('status', $status);
                }
            }
        } else {
            $query->whereIn('id', $ids);
        }

        $count = $query->count();
        $filename = "suppliers-selected-{$count}-" . now()->format('Y-m-d') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Access-Control-Expose-Headers' => 'Content-Disposition',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $columns = [
            'Name',
            'Contact Person',
            'Mobile',
            'Phone',
            'Email',
            'Address Line 1',
            'Address Line 2',
            'City',
            'Postal Code',
            'Country',
            'Website',
            'Payment Terms',
            'Notes',
            'Status',
            'Products Count',
        ];

        return response()->stream(function () use ($query, $columns) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, $columns);

            $query->chunk(500, function ($suppliers) use ($handle) {
                foreach ($suppliers as $s) {
                    fputcsv($handle, [
                        $s->name,
                        $s->contact_person ?? '',
                        $s->mobile,
                        $s->phone ?? '',
                        $s->email ?? '',
                        $s->address_line1 ?? '',
                        $s->address_line2 ?? '',
                        $s->city ?? '',
                        $s->postal_code ?? '',
                        $s->country ?? 'Sri Lanka',
                        $s->website ?? '',
                        $s->payment_terms ?? '',
                        $s->notes ?? '',
                        $s->status,
                        $s->products_count ?? 0,
                    ]);
                }
            });

            fclose($handle);
        }, 200, $headers);
    }
}
