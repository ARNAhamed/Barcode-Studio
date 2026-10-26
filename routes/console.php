<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Daily auto-cleanup for products & codes trashed > 30 days
Schedule::command('products:purge-trash')->daily();
Schedule::command('codes:purge-trash')->daily();
