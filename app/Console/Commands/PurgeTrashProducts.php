<?php

namespace App\Console\Commands;

use App\Models\Code;
use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class PurgeTrashProducts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'products:purge-trash';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Permanently delete products, suppliers and designs that have been in the Recycle Bin for more than 30 days';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $cutoffDate = now()->subDays(30);

        // Purge expired products
        $productCount = Product::onlyTrashed()
            ->where('deleted_at', '<=', $cutoffDate)
            ->forceDelete();

        // Purge expired suppliers
        $supplierCount = Supplier::onlyTrashed()
            ->where('deleted_at', '<=', $cutoffDate)
            ->forceDelete();

        // Purge expired codes and their preview files
        $trashedCodes = Code::onlyTrashed()
            ->where('deleted_at', '<=', $cutoffDate)
            ->get();

        $codeCount = $trashedCodes->count();
        foreach ($trashedCodes as $code) {
            if ($code->preview_path && Storage::disk('public')->exists($code->preview_path)) {
                Storage::disk('public')->delete($code->preview_path);
            }
            $code->forceDelete();
        }

        $this->info("Successfully purged {$productCount} products, {$supplierCount} suppliers, and {$codeCount} designs from the Recycle Bin.");

        return Command::SUCCESS;
    }
}
