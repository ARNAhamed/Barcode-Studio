<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Supplier extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'contact_person',
        'mobile',
        'phone',
        'email',
        'address_line1',
        'address_line2',
        'city',
        'postal_code',
        'country',
        'website',
        'payment_terms',
        'notes',
        'status',
    ];

    protected $casts = [
        'deleted_at' => 'datetime',
    ];

    protected $appends = [
        'days_left',
    ];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
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
