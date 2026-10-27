<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BarcodeGenerationApiTest extends TestCase
{
    use RefreshDatabase;
    /**
     * Test generating barcodes for all supported formats.
     */
    public function test_can_generate_barcodes_for_all_formats(): void
    {
        // 1. EAN-13
        $res = $this->postJson('/api/barcodes/generate', ['format' => 'EAN13']);
        $res->assertOk()
            ->assertJsonStructure(['number', 'format'])
            ->assertJson(['format' => 'EAN13']);
        $this->assertSame(13, strlen($res->json('number')));

        // 2. EAN-8
        $res = $this->postJson('/api/barcodes/generate', ['format' => 'EAN8']);
        $res->assertOk()
            ->assertJson(['format' => 'EAN8']);
        $this->assertSame(8, strlen($res->json('number')));

        // 3. UPC-A
        $res = $this->postJson('/api/barcodes/generate', ['format' => 'UPC']);
        $res->assertOk()
            ->assertJson(['format' => 'UPC']);
        $this->assertSame(12, strlen($res->json('number')));

        // 4. CODE128
        $res = $this->postJson('/api/barcodes/generate', ['format' => 'CODE128']);
        $res->assertOk()
            ->assertJson(['format' => 'CODE128']);
        $this->assertStringStartsWith('PRD-', $res->json('number'));
    }

    /**
     * Test sequential generation produces different numbers and never duplicates.
     */
    public function test_sequential_generation_produces_unique_numbers(): void
    {
        $res1 = $this->postJson('/api/barcodes/generate', ['format' => 'EAN13']);
        $res2 = $this->postJson('/api/barcodes/generate', ['format' => 'EAN13']);

        $this->assertNotSame($res1->json('number'), $res2->json('number'));
    }

    /**
     * Test validation endpoint with known valid and invalid barcodes.
     */
    public function test_validate_barcode_endpoint(): void
    {
        // Known valid EAN-13
        $res = $this->postJson('/api/barcodes/validate', [
            'format' => 'EAN13',
            'number' => '4006381333931',
        ]);
        $res->assertOk()->assertJson(['valid' => true]);

        // Known invalid check digit
        $res = $this->postJson('/api/barcodes/validate', [
            'format' => 'EAN13',
            'number' => '4006381333932',
        ]);
        $res->assertOk()
            ->assertJson(['valid' => false])
            ->assertJsonFragment(['suggested_check_digit' => '1']);

        // 12-digit partial EAN-13
        $res = $this->postJson('/api/barcodes/validate', [
            'format' => 'EAN13',
            'number' => '400638133393',
        ]);
        $res->assertOk()
            ->assertJson(['valid' => false])
            ->assertJsonFragment([
                'suggested_check_digit' => '1',
                'suggested_full_number' => '4006381333931',
            ]);
    }

    /**
     * Test auto-generating barcode on product create when left blank.
     */
    public function test_product_creation_auto_generates_barcode_if_requested(): void
    {
        $uniqueSku = 'TEST-AUTO-' . uniqid();
        $res = $this->postJson('/api/products', [
            'name' => 'Auto Barcode Product',
            'sku' => $uniqueSku,
            'price' => 19.99,
            'quantity' => 50,
            'auto_generate_barcode' => true,
            'auto_barcode_format' => 'EAN13',
        ]);

        $res->assertCreated();
        $this->assertNotEmpty($res->json('data.barcode_number'));
        $this->assertSame(13, strlen($res->json('data.barcode_number')));

        // Clean up
        Product::where('sku', $uniqueSku)->forceDelete();
    }

    /**
     * Test bulk barcode generation for missing barcodes.
     */
    public function test_bulk_generate_barcodes(): void
    {
        $sku1 = 'BULK-TEST-1-' . uniqid();
        $sku2 = 'BULK-TEST-2-' . uniqid();

        $p1 = Product::create([
            'name' => 'Bulk Product 1',
            'sku' => $sku1,
            'barcode_number' => null,
            'price' => 10,
            'quantity' => 5,
        ]);

        $p2 = Product::create([
            'name' => 'Bulk Product 2',
            'sku' => $sku2,
            'barcode_number' => '',
            'price' => 10,
            'quantity' => 5,
        ]);

        $res = $this->postJson('/api/products/bulk-generate-barcodes', [
            'product_ids' => [$p1->id, $p2->id],
            'format' => 'CODE128',
        ]);

        $res->assertOk()->assertJson(['count' => 2]);

        $p1->refresh();
        $p2->refresh();

        $this->assertNotEmpty($p1->barcode_number);
        $this->assertNotEmpty($p2->barcode_number);
        $this->assertNotSame($p1->barcode_number, $p2->barcode_number);

        // Clean up
        $p1->forceDelete();
        $p2->forceDelete();
    }
}
