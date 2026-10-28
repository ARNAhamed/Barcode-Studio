<?php

namespace App\Http\Controllers;

use App\Http\Requests\CodeRequest;
use App\Http\Resources\CodeResource;
use App\Models\Code;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class CodeController extends Controller
{
    /**
     * Display a listing of codes with search and type filter.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Code::query()->with(['product', 'template']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('value', 'like', "%{$search}%")
                    ->orWhere('format', 'like', "%{$search}%")
                    ->orWhereHas('product', function ($pq) use ($search) {
                        $pq->where('name', 'like', "%{$search}%")
                            ->orWhere('sku', 'like', "%{$search}%");
                    });
            });
        }

        if ($type = $request->input('type')) {
            if (in_array($type, ['barcode', 'qr'], true)) {
                $query->where('type', $type);
            }
        }

        if ($filter = $request->input('filter')) {
            if ($filter === 'last_bulk') {
                $latestBatchId = Code::whereNotNull('batch_id')->latest('generated_at')->value('batch_id');
                if ($latestBatchId) {
                    $query->where('batch_id', $latestBatchId);
                } else {
                    $query->whereRaw('1 = 0');
                }
            }
        }

        if ($batchId = $request->input('batch_id')) {
            $query->where('batch_id', $batchId);
        }

        $codes = $query->latest()->get();

        return CodeResource::collection($codes);
    }

    /**
     * Store multiple codes in bulk (up to 25 items per request).
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $request->validate([
            'codes' => 'required|array|min:1|max:25',
            'batch_id' => 'nullable|string|max:64',
        ]);

        $batchId = $request->input('batch_id') ?: (string) Str::uuid();
        $generatedAt = now();
        $items = $request->input('codes');
        $files = $request->file('codes') ?? [];

        $results = [];
        $createdCount = 0;
        $failedCount = 0;

        foreach ($items as $index => $rawItem) {
            // In multipart/form-data, settings might be a JSON string
            if (isset($rawItem['settings']) && is_string($rawItem['settings'])) {
                $decoded = json_decode($rawItem['settings'], true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $rawItem['settings'] = $decoded;
                }
            }

            // Check if preview file is provided in request files array
            $file = null;
            if (isset($files[$index]['preview'])) {
                $file = $files[$index]['preview'];
            } elseif ($request->file("codes.{$index}.preview")) {
                $file = $request->file("codes.{$index}.preview");
            }

            // Validator for this individual item
            $validator = Validator::make($rawItem, [
                'name' => 'required|string|max:255',
                'type' => 'required|in:barcode,qr',
                'format' => 'required|string|max:50',
                'value' => 'required|string',
                'product_id' => 'nullable|integer',
                'template_id' => 'nullable|integer',
                'settings' => 'nullable|array',
                'replace_existing' => 'nullable',
            ]);

            if ($validator->fails()) {
                $failedCount++;
                $results[] = [
                    'index' => $index,
                    'success' => false,
                    'name' => $rawItem['name'] ?? "Item #{$index}",
                    'error' => implode(' ', $validator->errors()->all()),
                ];
                continue;
            }

            $validated = $validator->validated();

            DB::beginTransaction();
            try {
                // Check if product exists and is not trashed (if product_id specified)
                $productId = $validated['product_id'] ?? null;
                if ($productId) {
                    $product = Product::whereNull('deleted_at')->find($productId);
                    if (!$product) {
                        throw new \RuntimeException('Product was moved to Recycle Bin or deleted.');
                    }
                }

                // If replace_existing is requested, soft-delete existing codes for this product
                $shouldReplace = filter_var($validated['replace_existing'] ?? false, FILTER_VALIDATE_BOOLEAN);
                if ($shouldReplace && $productId) {
                    Code::where('product_id', $productId)->delete();
                }

                $previewPath = null;
                // Handle uploaded file if present
                if ($file && $file->isValid()) {
                    $previewPath = $file->store('previews', 'public');
                } elseif (!empty($rawItem['preview']) && is_string($rawItem['preview']) && str_starts_with($rawItem['preview'], 'data:image')) {
                    // Handle base64 data URI
                    $dataUri = $rawItem['preview'];
                    if (preg_match('/^data:image\/(\w+);base64,/', $dataUri, $typeMatch)) {
                        $imageData = substr($dataUri, strpos($dataUri, ',') + 1);
                        $decoded = base64_decode($imageData);
                        if ($decoded !== false) {
                            $ext = strtolower($typeMatch[1]) === 'jpeg' ? 'jpg' : strtolower($typeMatch[1]);
                            $filename = 'previews/' . Str::uuid() . '.' . ($ext ?: 'png');
                            Storage::disk('public')->put($filename, $decoded);
                            $previewPath = $filename;
                        }
                    }
                }

                $code = Code::create([
                    'product_id' => $productId,
                    'template_id' => $validated['template_id'] ?? null,
                    'batch_id' => $batchId,
                    'name' => $validated['name'],
                    'type' => $validated['type'],
                    'format' => $validated['format'],
                    'value' => $validated['value'],
                    'settings' => $validated['settings'] ?? null,
                    'preview_path' => $previewPath,
                    'generated_at' => $generatedAt,
                ]);

                DB::commit();

                $createdCount++;
                $results[] = [
                    'index' => $index,
                    'success' => true,
                    'id' => $code->id,
                    'name' => $code->name,
                    'batch_id' => $batchId,
                ];
            } catch (\Throwable $e) {
                DB::rollBack();
                $failedCount++;
                $results[] = [
                    'index' => $index,
                    'success' => false,
                    'name' => $rawItem['name'] ?? "Item #{$index}",
                    'error' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'batch_id' => $batchId,
            'total' => count($items),
            'created_count' => $createdCount,
            'failed_count' => $failedCount,
            'results' => $results,
        ]);
    }

    /**
     * Store a newly created code in storage.
     */
    public function store(CodeRequest $request): JsonResponse
    {
        $data = $request->validated();

        if ($request->hasFile('preview')) {
            $path = $request->file('preview')->store('previews', 'public');
            $data['preview_path'] = $path;
        }

        unset($data['preview']);

        $code = Code::create($data);
        $code->load('product');

        return (new CodeResource($code))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified code.
     */
    public function show(Code $code): CodeResource
    {
        return new CodeResource($code->load('product'));
    }

    /**
     * Update the specified code in storage.
     */
    public function update(CodeRequest $request, Code $code): CodeResource
    {
        $data = $request->validated();

        if ($request->hasFile('preview')) {
            if ($code->preview_path && Storage::disk('public')->exists($code->preview_path)) {
                Storage::disk('public')->delete($code->preview_path);
            }
            $data['preview_path'] = $request->file('preview')->store('previews', 'public');
        }

        unset($data['preview']);

        $code->update($data);
        $code->load('product');

        return new CodeResource($code);
    }

    /**
     * Soft delete the specified code (move to Recycle Bin).
     */
    public function destroy(Code $code): JsonResponse
    {
        $code->delete();

        return response()->json(['message' => 'Design moved to Recycle Bin.']);
    }

    /**
     * Display a paginated listing of trashed codes.
     */
    public function trash(Request $request): AnonymousResourceCollection
    {
        $query = Code::onlyTrashed()->with('product');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('value', 'like', "%{$search}%")
                    ->orWhere('format', 'like', "%{$search}%")
                    ->orWhereHas('product', function ($pq) use ($search) {
                        $pq->where('name', 'like', "%{$search}%")
                            ->orWhere('sku', 'like', "%{$search}%");
                    });
            });
        }

        if ($type = $request->input('type')) {
            if (in_array($type, ['barcode', 'qr'], true)) {
                $query->where('type', $type);
            }
        }

        $sort = $request->input('sort', '-deleted_at');
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $column = ltrim($sort, '-');

        $allowedSorts = ['id', 'name', 'type', 'format', 'created_at', 'deleted_at'];
        if (in_array($column, $allowedSorts, true)) {
            $query->orderBy($column, $direction);
        } else {
            $query->orderBy('deleted_at', 'desc');
        }

        $perPage = (int) $request->input('per_page', 10);
        $trashedCodes = $query->paginate($perPage);

        return CodeResource::collection($trashedCodes);
    }

    /**
     * Restore a soft-deleted code from the Recycle Bin.
     */
    public function restore(int $id): JsonResponse
    {
        $code = Code::onlyTrashed()->findOrFail($id);
        $code->restore();
        $code->load('product');

        return response()->json([
            'message' => "Design '{$code->name}' restored successfully.",
            'code' => new CodeResource($code),
        ]);
    }

    /**
     * Permanently delete a code and remove its preview image from storage.
     */
    public function forceDelete(int $id): JsonResponse
    {
        $code = Code::onlyTrashed()->findOrFail($id);

        if ($code->preview_path && Storage::disk('public')->exists($code->preview_path)) {
            Storage::disk('public')->delete($code->preview_path);
        }

        $code->forceDelete();

        return response()->json([
            'message' => 'Design permanently deleted.',
        ]);
    }

    /**
     * Restore all codes currently in the Recycle Bin.
     */
    public function restoreAll(): JsonResponse
    {
        $count = Code::onlyTrashed()->count();
        Code::onlyTrashed()->restore();

        return response()->json([
            'message' => "{$count} designs restored from Recycle Bin.",
        ]);
    }

    /**
     * Permanently delete all codes in the Recycle Bin and delete their preview images.
     */
    public function emptyTrash(): JsonResponse
    {
        $trashed = Code::onlyTrashed()->get();
        $count = $trashed->count();

        foreach ($trashed as $code) {
            if ($code->preview_path && Storage::disk('public')->exists($code->preview_path)) {
                Storage::disk('public')->delete($code->preview_path);
            }
            $code->forceDelete();
        }

        return response()->json([
            'message' => "Recycle Bin emptied ({$count} designs permanently deleted).",
        ]);
    }
}
