<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $primaryKey = 'key';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'key',
        'value',
    ];

    /**
     * Get a setting by key with a fallback default.
     */
    public static function get(string $key, $default = null)
    {
        $setting = static::find($key);
        if (! $setting) {
            return $default;
        }

        return $setting->value;
    }

    /**
     * Get a setting value cast as boolean.
     */
    public static function getBool(string $key, bool $default = true): bool
    {
        $val = static::get($key);
        if ($val === null) {
            return $default;
        }

        return filter_var($val, FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * Set a setting value.
     */
    public static function set(string $key, $value): void
    {
        static::updateOrCreate(
            ['key' => $key],
            ['value' => is_bool($value) ? ($value ? '1' : '0') : (string) $value]
        );
    }
}
