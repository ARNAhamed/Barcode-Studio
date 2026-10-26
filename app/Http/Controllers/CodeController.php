<?php

namespace App\Http\Controllers;

use App\Http\Requests\CodeRequest;
use App\Http\Resources\CodeResource;
use App\Models\Code;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;

class CodeController extends Controller
{
    /**
     * Display a listing of codes with search and type filter.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Code::query()->with('product');

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

        $codes = $query->latest()->get();

        return CodeResource::collection($codes);
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
