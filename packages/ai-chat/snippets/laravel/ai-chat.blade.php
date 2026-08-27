{{-- Import ./modularcore/ai-chat/entry from resources/js/app.js (served with @vite there). --}}
{{-- The proxy route injects the API key server-side. Blade never receives that key. --}}
<div
  data-modularcore-ai-chat
  data-base-url="{{ url('/api') }}"
  data-model="openai/gpt-4o-mini"
></div>
