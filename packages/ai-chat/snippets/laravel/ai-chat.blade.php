{{-- The proxy route injects the API key server-side. Blade never receives that key. --}}
<div id="ai-chat"></div>
<script type="module">
  import { createChatElement } from '/resources/js/modularcore/ai-chat/adapters/web/chat-element';

  const chat = createChatElement({
    apiKey: 'server-proxy-does-not-use-this-value',
    // `requestChatCompletionStream` appends `/chat/completions` itself.
    baseURL: '{{ url('/api') }}',
    models: ['openai/gpt-4o-mini'],
    headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '' },
  });
  const unmount = chat.mount(document.querySelector('#ai-chat'));
  window.addEventListener('pagehide', unmount, { once: true });
</script>
