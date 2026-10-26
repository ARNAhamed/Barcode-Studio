<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Code extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'product_id',
        'name',
        'type',
        'format',
        'value',
        'settings',
        'preview_path',
    ];

    protected $casts = [
        'settings' => 'array',
        'deleted_at' => 'datetime',
    ];

    protected $appends = [
        'preview_url',
        'days_left',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    public function getPreviewUrlAttribute(): ?string
    {
        if (! $this->preview_path) {
            return null;
        }

        return Storage::disk('public')->url($this->preview_path);
    }

    public function getDaysLeftAttribute(): ?int
    {
        if (! $this->deleted_at) {
            return null;
        }

        $purgeDate = $this->deleted_at->copy()->addDays(30);
        $diff = now()->diffInDays($purgeDate, false);

        return max(0, (int) ceil($diff));
    }
}
