<?php

namespace App\Http\Controllers;

use App\Services\BarcodeNumberGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BarcodeController extends Controller
{
    public function __construct(
        protected BarcodeNumberGenerator $generator
    ) {}

    /**
     * Generate unique valid barcode number for requested format.
     */
    public function generate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'format' => 'nullable|string|in:CODE128,code128,EAN13,ean13,EAN-13,EAN8,ean8,EAN-8,UPC,upc,UPCA,upca,UPC-A',
        ]);

        $format = $validated['format'] ?? 'CODE128';
        $number = $this->generator->generate($format);
        $normalizedFormat = $this->generator->normalizeFormat($format);

        return response()->json([
            'number' => $number,
            'format' => $normalizedFormat,
        ]);
    }

    /**
     * Validate a barcode number and format with GS1 check digit.
     */
    public function validateCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'format' => 'required|string',
            'number' => 'required|string',
        ]);

        $details = $this->generator->validateDetails($validated['format'], $validated['number']);

        return response()->json($details);
    }
}
