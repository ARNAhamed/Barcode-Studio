<?php

use App\Http\Controllers\PublicProductController;
use Illuminate\Support\Facades\Route;

Route::get('/public/products/{token}', [PublicProductController::class, 'show'])->middleware('throttle:60,1');
Route::view('/{any?}', 'app')->where('any', '^(?!api).*$');