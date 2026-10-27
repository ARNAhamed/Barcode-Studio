<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BarcodeSequence extends Model
{
    use HasFactory;

    protected $fillable = [
        'format',
        'last_number',
    ];

    protected $casts = [
        'last_number' => 'integer',
    ];
}
