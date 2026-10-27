<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PrintPreset extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'paper_size',
        'orientation',
        'columns',
        'rows',
        'label_width',
        'label_height',
        'margin_top',
        'margin_left',
        'gap_horizontal',
        'gap_vertical',
        'corner_radius',
        'unit',
        'settings',
    ];

    protected $casts = [
        'columns' => 'integer',
        'rows' => 'integer',
        'label_width' => 'decimal:2',
        'label_height' => 'decimal:2',
        'margin_top' => 'decimal:2',
        'margin_left' => 'decimal:2',
        'gap_horizontal' => 'decimal:2',
        'gap_vertical' => 'decimal:2',
        'corner_radius' => 'decimal:2',
        'settings' => 'array',
    ];
}
