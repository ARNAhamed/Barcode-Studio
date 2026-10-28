<?php

namespace App\Http\Controllers;

use App\Http\Requests\TemplateRequest;
use App\Http\Resources\TemplateResource;
use App\Models\Template;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TemplateController extends Controller
{
    /**
     * Display a listing of templates with search and type filter.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Template::query()->withCount('codes');

        if ($type = $request->input('type')) {
            if (in_array($type, ['barcode', 'qr'], true)) {
                $query->where('type', $type);
            }
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('settings->format', 'like', "%{$search}%");
            });
        }

        $templates = $query
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get();

        return TemplateResource::collection($templates);
    }

    /**
     * Store a newly created template in storage.
     */
    public function store(TemplateRequest $request): JsonResponse
    {
        $data = $request->validated();

        // Ensure settings does not contain encoded value
        if (isset($data['settings']) && is_array($data['settings'])) {
            unset($data['settings']['value']);
        }

        if ($request->hasFile('thumbnail')) {
            $path = $request->file('thumbnail')->store('templates', 'public');
            $data['thumbnail_path'] = $path;
        }

        unset($data['thumbnail']);

        $isDefault = (bool) ($data['is_default'] ?? false);
        if ($isDefault) {
            Template::where('type', $data['type'])->where('is_default', true)->update(['is_default' => false]);
            $data['is_default'] = true;
        } else {
            $data['is_default'] = false;
        }

        $template = Template::create($data);
        $template->loadCount('codes');

        return (new TemplateResource($template))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified template.
     */
    public function show(Template $template): TemplateResource
    {
        return new TemplateResource($template->loadCount('codes'));
    }

    /**
     * Update the specified template in storage.
     */
    public function update(TemplateRequest $request, Template $template): TemplateResource
    {
        $data = $request->validated();

        if (isset($data['settings']) && is_array($data['settings'])) {
            unset($data['settings']['value']);
        }

        if ($request->hasFile('thumbnail')) {
            if ($template->thumbnail_path && Storage::disk('public')->exists($template->thumbnail_path)) {
                Storage::disk('public')->delete($template->thumbnail_path);
            }
            $data['thumbnail_path'] = $request->file('thumbnail')->store('templates', 'public');
        }

        unset($data['thumbnail']);

        if (isset($data['is_default'])) {
            $isDefault = (bool) $data['is_default'];
            if ($isDefault) {
                Template::where('type', $template->type)
                    ->where('id', '!=', $template->id)
                    ->where('is_default', true)
                    ->update(['is_default' => false]);
                $data['is_default'] = true;
            }
        }

        $template->update($data);
        $template->loadCount('codes');

        return new TemplateResource($template);
    }

    /**
     * Soft delete the specified template.
     */
    public function destroy(Template $template): JsonResponse
    {
        $template->delete();

        return response()->json([
            'message' => 'Template deleted successfully.',
        ]);
    }

    /**
     * Duplicate a template with a unique name.
     */
    public function duplicate(Template $template): JsonResponse
    {
        // Find a unique name
        $baseName = $template->name;
        $candidate = "{$baseName} (Copy)";
        $counter = 2;

        while (Template::where('type', $template->type)->where('name', $candidate)->exists()) {
            $candidate = "{$baseName} (Copy {$counter})";
            $counter++;
        }

        $newThumbnailPath = null;
        if ($template->thumbnail_path && Storage::disk('public')->exists($template->thumbnail_path)) {
            $extension = pathinfo($template->thumbnail_path, PATHINFO_EXTENSION) ?: 'png';
            $newThumbnailPath = 'templates/' . Str::random(40) . '.' . $extension;
            Storage::disk('public')->copy($template->thumbnail_path, $newThumbnailPath);
        }

        $clone = Template::create([
            'name' => $candidate,
            'type' => $template->type,
            'description' => $template->description,
            'settings' => $template->settings,
            'thumbnail_path' => $newThumbnailPath,
            'is_default' => false,
        ]);

        $clone->loadCount('codes');

        return (new TemplateResource($clone))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Set a template as default for its type (only one default per type).
     */
    public function setDefault(Template $template): TemplateResource
    {
        Template::where('type', $template->type)
            ->where('id', '!=', $template->id)
            ->where('is_default', true)
            ->update(['is_default' => false]);

        $template->update(['is_default' => true]);
        $template->loadCount('codes');

        return new TemplateResource($template);
    }
}
