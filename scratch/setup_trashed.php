<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Product;

$p = Product::withTrashed()->firstOrNew(['sku' => 'PRD-TRASHED-SKU']);
$p->name = 'Existing Trashed Product';
$p->price = 25.00;
$p->quantity = 10;
$p->save();
$p->delete();

echo "Trashed SKU setup successfully: ID {$p->id}, SKU {$p->sku}, deleted_at: {$p->deleted_at}\n";
