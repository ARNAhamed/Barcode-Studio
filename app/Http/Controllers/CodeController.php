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
     * Remove the specified code from storage.
     */
    public function destroy(Code $code): JsonResponse
    {
        if ($code->preview_path && Storage::disk('public')->exists($code->preview_path)) {
            Storage::disk('public')->delete($code->preview_path);
        }

        $code->delete();

        return response()->json(['message' => 'Code deleted successfully.']);
    }
}
