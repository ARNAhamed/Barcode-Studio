<?php

namespace App\Http\Controllers;

use App\Models\PrintPreset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PrintPresetController extends Controller
{
    /**
     * List all saved print presets.
     */
    public function index(): JsonResponse
    {
        $presets = PrintPreset::latest()->get();

        return response()->json([
            'data' => $presets,
        ]);
    }

    /**
     * Save a new print preset.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'paper_size' => 'required|string|in:a4,letter',
            'orientation' => 'required|string|in:portrait,landscape',
            'columns' => 'required|integer|min:1|max:20',
            'rows' => 'required|integer|min:1|max:50',
            'label_width' => 'required|numeric|min:1',
            'label_height' => 'required|numeric|min:1',
            'margin_top' => 'nullable|numeric|min:0',
            'margin_left' => 'nullable|numeric|min:0',
            'gap_horizontal' => 'nullable|numeric|min:0',
            'gap_vertical' => 'nullable|numeric|min:0',
            'corner_radius' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|in:mm,cm,inch',
            'settings' => 'nullable|array',
        ]);

        $preset = PrintPreset::create([
            'name' => $validated['name'],
            'paper_size' => $validated['paper_size'],
            'orientation' => $validated['orientation'],
            'columns' => $validated['columns'],
            'rows' => $validated['rows'],
            'label_width' => $validated['label_width'],
            'label_height' => $validated['label_height'],
            'margin_top' => $validated['margin_top'] ?? 0,
            'margin_left' => $validated['margin_left'] ?? 0,
            'gap_horizontal' => $validated['gap_horizontal'] ?? 0,
            'gap_vertical' => $validated['gap_vertical'] ?? 0,
            'corner_radius' => $validated['corner_radius'] ?? 0,
            'unit' => $validated['unit'] ?? 'mm',
            'settings' => $validated['settings'] ?? null,
        ]);

        return response()->json([
            'message' => "Preset '{$preset->name}' saved successfully.",
            'data' => $preset,
        ], 201);
    }

    /**
     * Delete a saved print preset.
     */
    public function destroy(int $id): JsonResponse
    {
        $preset = PrintPreset::findOrFail($id);
        $name = $preset->name;
        $preset->delete();

        return response()->json([
            'message' => "Preset '{$name}' deleted successfully.",
        ]);
    }
}
