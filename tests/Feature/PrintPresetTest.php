<?php

namespace Tests\Feature;

use App\Models\PrintPreset;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PrintPresetTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_print_presets(): void
    {
        PrintPreset::create([
            'name' => 'Avery 3x8 Test',
            'paper_size' => 'a4',
            'orientation' => 'portrait',
            'columns' => 3,
            'rows' => 8,
            'label_width' => 63.5,
            'label_height' => 33.9,
            'margin_top' => 13.0,
            'margin_left' => 7.2,
            'gap_horizontal' => 2.5,
            'gap_vertical' => 0,
            'corner_radius' => 1.5,
            'unit' => 'mm',
        ]);

        $response = $this->getJson('/api/print-presets');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Avery 3x8 Test');
    }

    public function test_can_create_print_preset(): void
    {
        $payload = [
            'name' => 'Custom 2x5 Sheet',
            'paper_size' => 'letter',
            'orientation' => 'landscape',
            'columns' => 2,
            'rows' => 5,
            'label_width' => 100.0,
            'label_height' => 45.0,
            'margin_top' => 10.0,
            'margin_left' => 10.0,
            'gap_horizontal' => 5.0,
            'gap_vertical' => 5.0,
            'corner_radius' => 2.0,
            'unit' => 'mm',
            'settings' => ['fit' => 'fit', 'padding' => 2],
        ];

        $response = $this->postJson('/api/print-presets', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Custom 2x5 Sheet')
            ->assertJsonPath('data.columns', 2)
            ->assertJsonPath('data.rows', 5);

        $this->assertDatabaseHas('print_presets', [
            'name' => 'Custom 2x5 Sheet',
            'columns' => 2,
            'rows' => 5,
        ]);
    }

    public function test_can_delete_print_preset(): void
    {
        $preset = PrintPreset::create([
            'name' => 'Preset To Delete',
            'paper_size' => 'a4',
            'orientation' => 'portrait',
            'columns' => 3,
            'rows' => 7,
            'label_width' => 60.0,
            'label_height' => 35.0,
            'margin_top' => 10.0,
            'margin_left' => 10.0,
            'gap_horizontal' => 2.0,
            'gap_vertical' => 2.0,
            'unit' => 'mm',
        ]);

        $response = $this->deleteJson("/api/print-presets/{$preset->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('print_presets', ['id' => $preset->id]);
    }
}
