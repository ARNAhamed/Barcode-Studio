<?php

namespace App\Console\Commands;

use App\Models\Code;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class PurgeTrashCodes extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'codes:purge-trash';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Permanently delete designs (barcodes and QR codes) that have been in the Recycle Bin for more than 30 days';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $cutoffDate = now()->subDays(30);

        $trashedCodes = Code::onlyTrashed()
            ->where('deleted_at', '<=', $cutoffDate)
            ->get();

        $count = $trashedCodes->count();
        foreach ($trashedCodes as $code) {
            if ($code->preview_path && Storage::disk('public')->exists($code->preview_path)) {
                Storage::disk('public')->delete($code->preview_path);
            }
            $code->forceDelete();
        }

        $this->info("Successfully purged {$count} expired designs from the Recycle Bin.");

        return Command::SUCCESS;
    }
}
