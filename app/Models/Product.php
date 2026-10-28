<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'supplier_id',
        'public_token',
        'name',
        'sku',
        'barcode_number',
        'category',
        'price',
        'quantity',
        'low_stock_threshold',
        'description',
    ];

    protected $casts = [
        'supplier_id' => 'integer',
        'price' => 'decimal:2',
        'quantity' => 'integer',
        'low_stock_threshold' => 'integer',
        'deleted_at' => 'datetime',
    ];

    protected $appends = [
        'stock_status',
        'days_left',
        'public_url',
    ];

    protected static function booted(): void
    {
        static::creating(function (Product $product) {
            if (empty($product->public_token)) {
                $product->public_token = Str::lower(Str::random(16));
            }
        });
    }

    public function getPublicUrlAttribute(): string
    {
        $appUrl = rtrim(config('app.url') ?: url('/'), '/');
        return $appUrl . '/p/' . ($this->public_token ?? '');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class)->withTrashed();
    }

    public function codes(): HasMany
    {
        return $this->hasMany(Code::class);
    }

    public function getStockStatusAttribute(): string
    {
        if ($this->quantity <= 0) {
            return 'out';
        }
        if ($this->quantity <= $this->low_stock_threshold) {
            return 'low';
        }
        return 'in';
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
