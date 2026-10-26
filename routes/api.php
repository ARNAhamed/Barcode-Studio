<?php

use App\Http\Controllers\CodeController;
use App\Http\Controllers\ProductController;
use Illuminate\Support\Facades\Route;

// Products API
Route::get('/products/summary', [ProductController::class, 'summary']);
Route::get('/products/lookup', [ProductController::class, 'lookup']);
Route::apiResource('products', ProductController::class);

// Codes API
Route::apiResource('codes', CodeController::class);
// Allow POST to update for multipart form-data requests with file updates
Route::post('/codes/{code}', [CodeController::class, 'update']);
