<?php

use App\Http\Controllers\BarcodeController;
use App\Http\Controllers\BinController;
use App\Http\Controllers\CodeController;
use App\Http\Controllers\ProductController;
use Illuminate\Support\Facades\Route;

// Unified Recycle Bin Summary
Route::get('/bin/summary', [BinController::class, 'summary']);

// Barcode Generation & Validation API
Route::post('/barcodes/generate', [BarcodeController::class, 'generate']);
Route::post('/barcodes/validate', [BarcodeController::class, 'validateCode']);

// Products API - Trash & Recycle Bin
Route::get('/products/summary', [ProductController::class, 'summary']);
Route::get('/products/lookup', [ProductController::class, 'lookup']);
Route::get('/products/trash', [ProductController::class, 'trash']);
Route::post('/products/trash/restore-all', [ProductController::class, 'restoreAll']);
Route::delete('/products/trash/empty', [ProductController::class, 'emptyTrash']);
Route::post('/products/bulk-generate-barcodes', [ProductController::class, 'bulkGenerateBarcodes']);
Route::post('/products/{id}/restore', [ProductController::class, 'restore']);
Route::delete('/products/{id}/force', [ProductController::class, 'forceDelete']);

// Products CSV Import & Export
Route::match(['get', 'post'], '/products/export', [ProductController::class, 'export']);
Route::get('/products/import/template', [ProductController::class, 'importTemplate']);
Route::post('/products/import/preview', [ProductController::class, 'importPreview']);
Route::post('/products/import/commit', [ProductController::class, 'importCommit']);

// Products CRUD
Route::apiResource('products', ProductController::class);

// Codes API - Trash & Recycle Bin
Route::get('/codes/trash', [CodeController::class, 'trash']);
Route::post('/codes/trash/restore-all', [CodeController::class, 'restoreAll']);
Route::delete('/codes/trash/empty', [CodeController::class, 'emptyTrash']);
Route::post('/codes/{id}/restore', [CodeController::class, 'restore']);
Route::delete('/codes/{id}/force', [CodeController::class, 'forceDelete']);

// Codes CRUD
Route::apiResource('codes', CodeController::class);
// Allow POST to update for multipart form-data requests with file updates
Route::post('/codes/{code}', [CodeController::class, 'update']);
