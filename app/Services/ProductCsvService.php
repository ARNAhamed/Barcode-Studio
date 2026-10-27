<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductCsvService
{
    public function __construct(
        protected BarcodeNumberGenerator $barcodeGenerator
    ) {}

    /**
     * Export selected products as a CSV download with UTF-8 BOM.
     */
    public function export(Request $request): StreamedResponse
    {
        $allMatching = $request->boolean('all_matching');
        $ids = $request->input('ids');

        if (!$allMatching) {
            $request->validate([
                'ids' => ['required', 'array', 'min:1'],
                'ids.*' => ['integer', 'exists:products,id'],
            ]);
        }

        $query = Product::query(); // Excludes trashed by default

        if ($allMatching) {
            if ($search = $request->input('search')) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('barcode_number', 'like', "%{$search}%")
                        ->orWhere('category', 'like', "%{$search}%");
                });
            }

            if ($category = $request->input('category')) {
                $query->where('category', $category);
            }

            if ($status = $request->input('status')) {
                if ($status === 'out') {
                    $query->where('quantity', '<=', 0);
                } elseif ($status === 'low') {
                    $query->where('quantity', '>', 0)
                        ->whereColumn('quantity', '<=', 'low_stock_threshold');
                } elseif ($status === 'in') {
                    $query->whereColumn('quantity', '>', 'low_stock_threshold');
                }
            }
        } else {
            $query->whereIn('id', $ids);
        }

        $sort = $request->input('sort', '-created_at');
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $column = ltrim($sort, '-');
        $allowedSorts = ['id', 'name', 'sku', 'price', 'quantity', 'category', 'created_at'];

        if (in_array($column, $allowedSorts, true)) {
            $query->orderBy($column, $direction);
        } else {
            $query->latest();
        }

        $count = $query->count();
        $filename = "stock-selected-{$count}-" . now()->format('Y-m-d') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Access-Control-Expose-Headers' => 'Content-Disposition',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $columns = ['name', 'sku', 'barcode_number', 'category', 'price', 'quantity', 'low_stock_threshold', 'description'];

        return response()->stream(function () use ($query, $columns) {
            $handle = fopen('php://output', 'w');
            // Write UTF-8 BOM so Excel opens it with proper character encoding
            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, $columns);

            $query->chunk(500, function ($products) use ($handle) {
                foreach ($products as $p) {
                    fputcsv($handle, [
                        $p->name,
                        $p->sku,
                        $p->barcode_number ?? '',
                        $p->category ?? '',
                        number_format((float) $p->price, 2, '.', ''),
                        $p->quantity,
                        $p->low_stock_threshold ?? 10,
                        $p->description ?? '',
                    ]);
                }
            });

            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Download sample CSV template with standard headers and 2 example rows.
     */
    public function template(): StreamedResponse
    {
        $filename = 'products_import_template.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $columns = ['name', 'sku', 'barcode_number', 'category', 'price', 'quantity', 'low_stock_threshold', 'description'];

        return response()->stream(function () use ($columns) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, $columns);

            fputcsv($handle, [
                'Wireless Mouse',
                'ELEC-MOUSE-001',
                '2001000000018',
                'Electronics',
                '29.99',
                '50',
                '10',
                'Ergonomic wireless optical mouse',
            ]);

            fputcsv($handle, [
                'Mechanical Keyboard',
                'ELEC-KEY-002',
                '',
                'Electronics',
                '89.50',
                '20',
                '5',
                'Compact RGB mechanical keyboard',
            ]);

            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Parse and validate CSV file without saving.
     */
    public function preview(string $filePath): array
    {
        $parsed = $this->parseCsvFile($filePath);
        $rows = [];
        $seenSkus = [];
        $seenBarcodes = [];

        foreach ($parsed as $item) {
            $rowNum = $item['row'];
            $data = $item['data'];
            $errors = [];

            $name = trim($data['name'] ?? '');
            $sku = trim($data['sku'] ?? '');
            $barcode = trim($data['barcode_number'] ?? '');
            $priceRaw = trim($data['price'] ?? '');
            $qtyRaw = trim($data['quantity'] ?? '');
            $thresholdRaw = trim($data['low_stock_threshold'] ?? '');
            $category = trim($data['category'] ?? '');
            $description = trim($data['description'] ?? '');

            // 1. Required fields
            if ($name === '') {
                $errors[] = 'Name is required.';
            }

            if ($sku === '') {
                $errors[] = 'SKU is required.';
            }

            // 2. Numeric and non-negative checks
            if ($priceRaw !== '') {
                // Strip optional leading currency sign if present
                $cleanPrice = ltrim($priceRaw, '$€£');
                if (!is_numeric($cleanPrice) || (float) $cleanPrice < 0) {
                    $errors[] = 'Price must be a valid non-negative number.';
                } else {
                    $priceRaw = (string) (float) $cleanPrice;
                }
            }

            if ($qtyRaw !== '') {
                if (!is_numeric($qtyRaw) || (int) $qtyRaw < 0) {
                    $errors[] = 'Quantity must be a valid non-negative integer.';
                }
            }

            if ($thresholdRaw !== '') {
                if (!is_numeric($thresholdRaw) || (int) $thresholdRaw < 0) {
                    $errors[] = 'Low stock threshold must be a valid non-negative integer.';
                }
            }

            // 3. In-file duplicates
            if ($sku !== '') {
                if (isset($seenSkus[$sku])) {
                    $errors[] = "Duplicate SKU '{$sku}' found inside import file.";
                } else {
                    $seenSkus[$sku] = true;
                }
            }

            if ($barcode !== '') {
                if (isset($seenBarcodes[$barcode])) {
                    $errors[] = "Duplicate barcode '{$barcode}' found inside import file.";
                } else {
                    $seenBarcodes[$barcode] = true;
                }
            }

            // 4. Recycle Bin checks
            if ($sku !== '') {
                if (Product::onlyTrashed()->where('sku', $sku)->exists()) {
                    $errors[] = "SKU '{$sku}' belongs to a product in the Recycle Bin. Restore or delete it first.";
                }
            }

            if ($barcode !== '') {
                if (Product::onlyTrashed()->where('barcode_number', $barcode)->exists()) {
                    $errors[] = "Barcode '{$barcode}' belongs to a product in the Recycle Bin.";
                }
            }

            // 5. Existing active product check
            $existingProduct = null;
            if ($sku !== '') {
                $existingProduct = Product::where('sku', $sku)->first();
            }

            // 6. Barcode conflict check against other active products
            if ($barcode !== '') {
                $barcodeConflict = Product::where('barcode_number', $barcode)
                    ->when($existingProduct, fn($q) => $q->where('id', '!=', $existingProduct->id))
                    ->first();

                if ($barcodeConflict) {
                    $errors[] = "Barcode '{$barcode}' is already assigned to '{$barcodeConflict->name}' (SKU: {$barcodeConflict->sku}).";
                }
            }

            // Determine status
            if (!empty($errors)) {
                $status = 'error';
            } elseif ($existingProduct) {
                $status = 'update';
            } else {
                $status = 'new';
            }

            $rows[] = [
                'row' => $rowNum,
                'data' => [
                    'name' => $name,
                    'sku' => $sku,
                    'barcode_number' => $barcode,
                    'category' => $category,
                    'price' => $priceRaw !== '' ? $priceRaw : '0.00',
                    'quantity' => $qtyRaw !== '' ? $qtyRaw : '0',
                    'low_stock_threshold' => $thresholdRaw !== '' ? $thresholdRaw : '10',
                    'description' => $description,
                ],
                'status' => $status,
                'errors' => $errors,
            ];
        }

        $validCount = count(array_filter($rows, fn($r) => $r['status'] !== 'error'));
        $invalidCount = count(array_filter($rows, fn($r) => $r['status'] === 'error'));

        return [
            'total' => count($rows),
            'valid' => $validCount,
            'invalid' => $invalidCount,
            'rows' => $rows,
        ];
    }

    /**
     * Commit import inside a database transaction.
     */
    public function commit(
        string $filePath,
        string $mode = 'update_existing',
        bool $autoGenerateBarcodes = false
    ): array {
        $preview = $this->preview($filePath);

        return DB::transaction(function () use ($preview, $mode, $autoGenerateBarcodes) {
            $created = 0;
            $updated = 0;
            $skipped = 0;
            $failed = 0;

            foreach ($preview['rows'] as $row) {
                if ($row['status'] === 'error') {
                    $failed++;
                    continue;
                }

                $data = $row['data'];

                if ($row['status'] === 'new') {
                    $barcode = $data['barcode_number'];
                    if (empty($barcode) && $autoGenerateBarcodes) {
                        $format = config('barcode.default_product_format', 'CODE128');
                        $barcode = $this->barcodeGenerator->generate($format);
                    }

                    Product::create([
                        'name' => $data['name'],
                        'sku' => $data['sku'],
                        'barcode_number' => !empty($barcode) ? $barcode : null,
                        'category' => $data['category'] !== '' ? $data['category'] : null,
                        'price' => is_numeric($data['price']) ? (float) $data['price'] : 0.00,
                        'quantity' => is_numeric($data['quantity']) ? (int) $data['quantity'] : 0,
                        'low_stock_threshold' => is_numeric($data['low_stock_threshold']) ? (int) $data['low_stock_threshold'] : 10,
                        'description' => $data['description'] !== '' ? $data['description'] : null,
                    ]);

                    $created++;
                } elseif ($row['status'] === 'update') {
                    if ($mode === 'skip_existing') {
                        $skipped++;
                        continue;
                    }

                    $product = Product::where('sku', $data['sku'])->first();
                    if ($product) {
                        $product->name = $data['name'];
                        if ($data['category'] !== '') {
                            $product->category = $data['category'];
                        }
                        if ($data['price'] !== '' && is_numeric($data['price'])) {
                            $product->price = (float) $data['price'];
                        }
                        if ($data['quantity'] !== '' && is_numeric($data['quantity'])) {
                            $product->quantity = (int) $data['quantity'];
                        }
                        if ($data['low_stock_threshold'] !== '' && is_numeric($data['low_stock_threshold'])) {
                            $product->low_stock_threshold = (int) $data['low_stock_threshold'];
                        }
                        if ($data['description'] !== '') {
                            $product->description = $data['description'];
                        }

                        if (!empty($data['barcode_number'])) {
                            $product->barcode_number = $data['barcode_number'];
                        } elseif (empty($product->barcode_number) && $autoGenerateBarcodes) {
                            $format = config('barcode.default_product_format', 'CODE128');
                            $product->barcode_number = $this->barcodeGenerator->generate($format);
                        }

                        $product->save();
                        $updated++;
                    } else {
                        $failed++;
                    }
                }
            }

            return [
                'total' => $preview['total'],
                'created' => $created,
                'updated' => $updated,
                'skipped' => $skipped,
                'failed' => $failed,
            ];
        });
    }

    /**
     * Parse CSV file with auto delimiter detection (comma vs semicolon) and trimmed values.
     */
    public function parseCsvFile(string $filePath): array
    {
        if (!file_exists($filePath) || !is_readable($filePath)) {
            return [];
        }

        $handle = fopen($filePath, 'r');
        if (!$handle) {
            return [];
        }

        // Auto-detect delimiter by reading first line
        $firstLine = fgets($handle);
        if ($firstLine === false) {
            fclose($handle);
            return [];
        }

        $commaCount = substr_count($firstLine, ',');
        $semicolonCount = substr_count($firstLine, ';');
        $delimiter = ($semicolonCount > $commaCount) ? ';' : ',';

        // Rewind to start of file
        rewind($handle);

        // Read header row
        $headerRow = fgetcsv($handle, 0, $delimiter);
        if (!$headerRow) {
            fclose($handle);
            return [];
        }

        // Strip UTF-8 BOM if present on the first header
        $headerRow[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) $headerRow[0]);

        $headers = [];
        foreach ($headerRow as $h) {
            $key = str_replace([' ', '-'], '_', strtolower(trim((string) $h)));
            $headers[] = $key;
        }

        $parsedRows = [];
        $lineNumber = 1; // Header is line 1, data rows start at line 2

        while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
            $lineNumber++;

            // Skip empty rows
            $hasData = false;
            foreach ($row as $val) {
                if (trim((string) $val) !== '') {
                    $hasData = true;
                    break;
                }
            }
            if (!$hasData) {
                continue;
            }

            $rowData = [];
            foreach ($headers as $index => $headerName) {
                if ($headerName === '') continue;
                $val = $row[$index] ?? '';
                $rowData[$headerName] = is_string($val) ? trim($val) : $val;
            }

            $parsedRows[] = [
                'row' => $lineNumber,
                'data' => $rowData,
            ];
        }

        fclose($handle);
        return $parsedRows;
    }
}
