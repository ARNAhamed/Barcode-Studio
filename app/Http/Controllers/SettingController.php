<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Get application settings.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'public_page_enabled' => Setting::getBool('public_page_enabled', true),
            'public_page_show_supplier' => Setting::getBool('public_page_show_supplier', true),
        ]);
    }

    /**
     * Update application settings.
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'public_page_enabled' => 'nullable|boolean',
            'public_page_show_supplier' => 'nullable|boolean',
        ]);

        if (array_key_exists('public_page_enabled', $validated)) {
            Setting::set('public_page_enabled', (bool) $validated['public_page_enabled']);
        }

        if (array_key_exists('public_page_show_supplier', $validated)) {
            Setting::set('public_page_show_supplier', (bool) $validated['public_page_show_supplier']);
        }

        return response()->json([
            'message' => 'Settings updated successfully.',
            'settings' => [
                'public_page_enabled' => Setting::getBool('public_page_enabled', true),
                'public_page_show_supplier' => Setting::getBool('public_page_show_supplier', true),
            ],
        ]);
    }
}
