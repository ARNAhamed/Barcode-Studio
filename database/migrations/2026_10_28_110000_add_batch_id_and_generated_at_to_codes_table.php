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
        Schema::table('codes', function (Blueprint $table) {
            $table->uuid('batch_id')->nullable()->after('template_id')->index();
            $table->timestamp('generated_at')->nullable()->after('preview_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('codes', function (Blueprint $table) {
            $table->dropIndex(['batch_id']);
            $table->dropColumn(['batch_id', 'generated_at']);
        });
    }
};
