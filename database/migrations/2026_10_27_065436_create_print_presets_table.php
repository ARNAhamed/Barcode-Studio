<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('print_presets', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('paper_size')->default('a4');
            $table->enum('orientation', ['portrait', 'landscape'])->default('portrait');
            $table->integer('columns');
            $table->integer('rows');
            $table->decimal('label_width', 8, 2);
            $table->decimal('label_height', 8, 2);
            $table->decimal('margin_top', 8, 2)->default(0);
            $table->decimal('margin_left', 8, 2)->default(0);
            $table->decimal('gap_horizontal', 8, 2)->default(0);
            $table->decimal('gap_vertical', 8, 2)->default(0);
            $table->decimal('corner_radius', 8, 2)->default(0);
            $table->string('unit')->default('mm');
            $table->json('settings')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('print_presets');
    }
};
