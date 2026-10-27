<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ProductCsvTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test GET /api/products/export returns CSV with UTF-8 BOM, excludes trashed, and respects filters.
     */
    public function test_export_products_csv(): void
    {
        // 1. Create active products
        $p1 = Product::create([
            'name' => 'Active Product 1',
            'sku' => 'SKU-ACT-1',
            'barcode_number' => '111111111111',
            'category' => 'Electronics',
            'price' => 19.99,
            'quantity' => 25,
            'low_stock_threshold' => 5,
            'description' => 'First product',
        ]);

        $p2 = Product::create([
            'name' => 'Active Product 2',
            'sku' => 'SKU-ACT-2',
            'barcode_number' => '222222222222',
            'category' => 'Clothing',
            'price' => 45.00,
            'quantity' => 2,
            'low_stock_threshold' => 10,
            'description' => 'Second product',
        ]);

        $p3 = Product::create([
            'name' => 'Active Product 3',
            'sku' => 'SKU-ACT-3',
            'barcode_number' => '444444444444',
            'category' => 'Electronics',
            'price' => 12.00,
            'quantity' => 15,
            'low_stock_threshold' => 5,
        ]);

        // 2. Create trashed product (should be excluded)
        $trashed = Product::create([
            'name' => 'Trashed Product',
            'sku' => 'SKU-TRASH-1',
            'barcode_number' => '333333333333',
            'category' => 'Electronics',
            'price' => 9.99,
            'quantity' => 10,
        ]);
        $trashed->delete();

        // 3. Test POST export with 3 selected IDs
        $response = $this->postJson('/api/products/export', [
            'ids' => [$p1->id, $p2->id, $p3->id],
        ]);

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $this->assertMatchesRegularExpression(
            '/stock-selected-3-\d{4}-\d{2}-\d{2}\.csv/',
            $response->headers->get('Content-Disposition')
        );

        $content = $response->streamedContent();

        // Check UTF-8 BOM
        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);

        // Check header row
        $this->assertStringContainsString('name,sku,barcode_number,category,price,quantity,low_stock_threshold,description', $content);

        // Check all 3 products present
        $this->assertStringContainsString('Active Product 1', $content);
        $this->assertStringContainsString('Active Product 2', $content);
        $this->assertStringContainsString('Active Product 3', $content);

        // Check trashed product excluded
        $this->assertStringNotContainsString('Trashed Product', $content);
        $this->assertStringNotContainsString('SKU-TRASH-1', $content);

        // 4. Test validation error when no IDs are selected and all_matching is false
        $emptyResponse = $this->postJson('/api/products/export', ['ids' => []]);
        $emptyResponse->assertStatus(422);

        // 5. Test all_matching flag with filter
        $filterResponse = $this->postJson('/api/products/export', [
            'all_matching' => true,
            'category' => 'Clothing',
        ]);
        $filterResponse->assertOk();
        $this->assertMatchesRegularExpression(
            '/stock-selected-1-\d{4}-\d{2}-\d{2}\.csv/',
            $filterResponse->headers->get('Content-Disposition')
        );
        $filterContent = $filterResponse->streamedContent();
        $this->assertStringContainsString('Active Product 2', $filterContent);
        $this->assertStringNotContainsString('Active Product 1', $filterContent);
    }

    /**
     * Test GET /api/products/import/template returns sample CSV with UTF-8 BOM and headers.
     */
    public function test_import_template_download(): void
    {
        $response = $this->get('/api/products/import/template');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('products_import_template.csv', $response->headers->get('Content-Disposition'));

        $content = $response->streamedContent();

        // BOM check
        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);

        // Header check
        $this->assertStringContainsString('name,sku,barcode_number,category,price,quantity,low_stock_threshold,description', $content);

        // Sample rows check
        $this->assertStringContainsString('Wireless Mouse', $content);
        $this->assertStringContainsString('Mechanical Keyboard', $content);
    }

    /**
     * Test POST /api/products/import/preview with a sample file containing:
     * - valid rows
     * - duplicate SKUs
     * - a missing name
     * - a negative price
     * - a trashed SKU
     */
    public function test_import_preview_with_mixed_sample_file(): void
    {
        // Pre-create an active product for SKU update test
        Product::create([
            'name' => 'Existing Active Item',
            'sku' => 'SKU-EXIST-01',
            'barcode_number' => '100000000001',
            'price' => 10.00,
            'quantity' => 5,
        ]);

        // Pre-create a trashed product
        $trashed = Product::create([
            'name' => 'Item in Trash',
            'sku' => 'SKU-TRASH-99',
            'barcode_number' => '999999999999',
            'price' => 20.00,
            'quantity' => 1,
        ]);
        $trashed->delete();

        // CSV content containing all test scenarios
        $csvContent = implode("\n", [
            'name,sku,barcode_number,category,price,quantity,low_stock_threshold,description',
            // Row 2: Valid new item
            'Valid New Widget,SKU-NEW-01,500000000001,Hardware,15.50,40,8,A brand new item',
            // Row 3: Valid update item (matches existing active SKU)
            'Updated Existing Item,SKU-EXIST-01,100000000001,Hardware,12.50,15,5,Updated description',
            // Row 4: Duplicate SKU inside file (SKU-NEW-01 used again)
            'Duplicate Widget,SKU-NEW-01,500000000002,Hardware,15.50,10,5,Duplicate SKU',
            // Row 5: Missing name
            ',SKU-NONAME-01,500000000003,Hardware,25.00,10,5,Has no name',
            // Row 6: Negative price
            'Negative Price Item,SKU-NEGPRICE-01,500000000004,Hardware,-10.00,5,5,Negative price error',
            // Row 7: SKU belongs to Recycle Bin
            'Trashed Item In Import,SKU-TRASH-99,500000000005,Hardware,30.00,10,5,In recycle bin',
        ]);

        $file = UploadedFile::fake()->createWithContent('products_test.csv', $csvContent);

        $response = $this->postJson('/api/products/import/preview', [
            'file' => $file,
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'total',
            'valid',
            'invalid',
            'rows' => [
                '*' => ['row', 'data', 'status', 'errors'],
            ],
        ]);

        $data = $response->json();
        $this->assertSame(6, $data['total']);
        $this->assertSame(2, $data['valid']);
        $this->assertSame(4, $data['invalid']);

        $rows = $data['rows'];

        // Row 2: status "new"
        $this->assertSame(2, $rows[0]['row']);
        $this->assertSame('new', $rows[0]['status']);
        $this->assertEmpty($rows[0]['errors']);

        // Row 3: status "update"
        $this->assertSame(3, $rows[1]['row']);
        $this->assertSame('update', $rows[1]['status']);
        $this->assertEmpty($rows[1]['errors']);

        // Row 4: error due to duplicate SKU in file
        $this->assertSame(4, $rows[2]['row']);
        $this->assertSame('error', $rows[2]['status']);
        $this->assertStringContainsString('Duplicate SKU', implode(' ', $rows[2]['errors']));

        // Row 5: error due to missing name
        $this->assertSame(5, $rows[3]['row']);
        $this->assertSame('error', $rows[3]['status']);
        $this->assertStringContainsString('Name is required', implode(' ', $rows[3]['errors']));

        // Row 6: error due to negative price
        $this->assertSame(6, $rows[4]['row']);
        $this->assertSame('error', $rows[4]['status']);
        $this->assertStringContainsString('Price must be a valid non-negative number', implode(' ', $rows[4]['errors']));

        // Row 7: error due to trashed SKU
        $this->assertSame(7, $rows[5]['row']);
        $this->assertSame('error', $rows[5]['status']);
        $this->assertStringContainsString('Recycle Bin', implode(' ', $rows[5]['errors']));
    }

    /**
     * Test POST /api/products/import/commit creates valid new products and updates or skips existing ones.
     */
    public function test_import_commit_with_options(): void
    {
        // 1. Existing product
        $existing = Product::create([
            'name' => 'Original Name',
            'sku' => 'SKU-001',
            'barcode_number' => '111111111111',
            'price' => 10.00,
            'quantity' => 5,
        ]);

        $csvContent = implode("\n", [
            'name,sku,barcode_number,category,price,quantity,low_stock_threshold,description',
            'New Product A,SKU-002,,Tools,25.00,10,2,Brand new item',
            'Modified Product,SKU-001,111111111111,Tools,15.00,20,5,Updated item',
            ',SKU-INVALID,,,10.00,5,2,', // Error row
        ]);

        $file = UploadedFile::fake()->createWithContent('import.csv', $csvContent);

        // Commit with update_existing and auto_generate_barcodes
        $response = $this->postJson('/api/products/import/commit', [
            'file' => $file,
            'mode' => 'update_existing',
            'auto_generate_barcodes' => true,
        ]);

        $response->assertOk();
        $response->assertJson([
            'total' => 3,
            'created' => 1,
            'updated' => 1,
            'skipped' => 0,
            'failed' => 1,
        ]);

        // Verify database: SKU-002 was created and has auto-generated barcode
        $newProduct = Product::where('sku', 'SKU-002')->first();
        $this->assertNotNull($newProduct);
        $this->assertSame('New Product A', $newProduct->name);
        $this->assertNotEmpty($newProduct->barcode_number);

        // Verify database: SKU-001 was updated
        $existing->refresh();
        $this->assertSame('Modified Product', $existing->name);
        $this->assertEquals(15.00, (float) $existing->price);
        $this->assertSame(20, $existing->quantity);
    }

    /**
     * Test commit with mode "skip_existing".
     */
    public function test_import_commit_skip_existing(): void
    {
        Product::create([
            'name' => 'Original Item',
            'sku' => 'SKU-KEEP',
            'price' => 10.00,
            'quantity' => 5,
        ]);

        $csvContent = implode("\n", [
            'name,sku,barcode_number,category,price,quantity,low_stock_threshold,description',
            'New Item,SKU-NEW,,Tools,20.00,10,5,',
            'Should Not Change,SKU-KEEP,,Tools,99.00,50,5,',
        ]);

        $file = UploadedFile::fake()->createWithContent('import.csv', $csvContent);

        $response = $this->postJson('/api/products/import/commit', [
            'file' => $file,
            'mode' => 'skip_existing',
            'auto_generate_barcodes' => false,
        ]);

        $response->assertOk();
        $response->assertJson([
            'total' => 2,
            'created' => 1,
            'updated' => 0,
            'skipped' => 1,
            'failed' => 0,
        ]);

        $kept = Product::where('sku', 'SKU-KEEP')->first();
        $this->assertSame('Original Item', $kept->name);
        $this->assertEquals(10.00, (float) $kept->price);
    }

    /**
     * Test semicolon delimiter support.
     */
    public function test_import_with_semicolon_delimiter(): void
    {
        $csvContent = implode("\n", [
            'name;sku;barcode_number;category;price;quantity;low_stock_threshold;description',
            'Semicolon Item;SKU-SEMI-01;;Office;12.50;100;10;Delimited with semicolons',
        ]);

        $file = UploadedFile::fake()->createWithContent('semi.csv', $csvContent);

        $response = $this->postJson('/api/products/import/preview', [
            'file' => $file,
        ]);

        $response->assertOk();
        $this->assertSame(1, $response->json('total'));
        $this->assertSame(1, $response->json('valid'));
        $this->assertSame('Semicolon Item', $response->json('rows.0.data.name'));
        $this->assertSame('SKU-SEMI-01', $response->json('rows.0.data.sku'));
    }
}
