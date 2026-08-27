<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

final class ChatCompletionController
{
    public function __invoke(Request $request)
    {
        $this->authorize('useAiChat', $request->user());
        $input = $request->validate([
            'model' => ['required', 'string', 'in:openai/gpt-4o-mini'],
            'messages' => ['required', 'array', 'max:50'],
            'messages.*.role' => ['required', 'string', 'in:user,assistant,system'],
            'messages.*.content' => ['nullable', 'string', 'max:8000'],
            'stream' => ['required', 'boolean', 'in:true'],
        ]);
        $contentLength = array_sum(array_map(
            static fn ($message) => strlen((string) ($message['content'] ?? '')),
            $input['messages'],
        ));
        abort_if($contentLength > 32000, 422, 'Conversation is too large.');
        $payload = ['model' => $input['model'], 'messages' => $input['messages'], 'stream' => true, 'max_tokens' => 512];

        return response()->stream(function () use ($payload): void {
            $status = 0;
            $reported = false;
            $curl = curl_init('https://openrouter.ai/api/v1/chat/completions');
            curl_setopt_array($curl, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($payload, JSON_THROW_ON_ERROR),
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer '.config('services.openrouter.key'),
                    'Content-Type: application/json',
                    'Accept: text/event-stream',
                ],
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_TIMEOUT => 65,
                CURLOPT_HEADERFUNCTION => static function ($curl, string $header) use (&$status): int {
                    if (preg_match('/^HTTP\\/\\S+\\s+(\\d{3})/', $header, $m)) $status = (int) $m[1];
                    return strlen($header);
                },
                CURLOPT_WRITEFUNCTION => static function ($curl, string $chunk) use (&$status, &$reported): int {
                    if (connection_aborted()) return 0;
                    if ($status < 200 || $status >= 300) {
                        if (!$reported) { echo "event: error\ndata: {\"message\":\"The upstream chat provider rejected the request\"}\n\n"; $reported = true; }
                    } else echo $chunk;
                    if (ob_get_level() > 0) ob_flush();
                    flush();
                    return strlen($chunk);
                },
            ]);
            $completed = curl_exec($curl);
            $failedStatus = $status < 200 || $status >= 300;
            if ($completed === false && !connection_aborted() && !$reported) {
                echo "event: error\ndata: {\"message\":\"The upstream chat provider is unavailable\"}\n\n";
            } elseif ($failedStatus && !$reported) {
                echo "event: error\ndata: {\"message\":\"The upstream chat provider rejected the request\"}\n\n";
            }
            if (($completed === false || $failedStatus) && !connection_aborted()) {
                if (ob_get_level() > 0) ob_flush();
                flush();
            }
            curl_close($curl);
        }, 200, ['Content-Type' => 'text/event-stream', 'Cache-Control' => 'no-cache', 'X-Accel-Buffering' => 'no']);
    }
}
