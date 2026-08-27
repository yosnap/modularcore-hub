<?php

use App\Http\Controllers\ChatCompletionController;
use Illuminate\Support\Facades\Route;

// Keep this in the `web` middleware group: auth + CSRF protect provider spend. Add `throttle`
// according to the application's budget and user plan.
Route::post('/api/chat/completions', ChatCompletionController::class)
    ->middleware(['auth', 'throttle:10,1'])
    ->name('ai-chat.completions');
