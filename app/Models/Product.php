<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
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
        'price' => 'decimal:2',
        'quantity' => 'integer',
        'low_stock_threshold' => 'integer',
        'deleted_at' => 'datetime',
    ];

    protected $appends = [
        'stock_status',
        'days_left',
    ];

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
