# @modularcore/ai-chat

Headless AI chat core — OpenAI-compatible streaming, model fallback, token usage tracking,
function calling with human-in-the-loop confirmation, and local/backend history — with thin
React, Svelte, Vue 3, Angular standalone and framework-free Web adapters on top.

**BYOK (Bring Your Own Key).** The core never hardcodes or reads an API key from the
environment itself: your app passes `apiKey` (and optionally `baseURL`) into `ChatConfig`. This
lets you point at OpenRouter (the default), OpenAI directly, or any other OpenAI-compatible
`/chat/completions` endpoint — including your own server-side proxy, so the key never reaches
the browser.

## What's in this package

- `core/client.ts` — thin `fetch`-based OpenAI-compatible client (`requestChatCompletionStream`).
- `core/stream.ts` — real SSE parser over the raw `ReadableStream<Uint8Array>` fetch returns.
- `core/chat.ts` — `Chat`, the headless orchestrator (streaming, tool-call loop, history).
- `core/fallback.ts` — tries an ordered list of models, falling back on failure.
- `core/tokens.ts` — parses provider `usage` payloads.
- `core/tools.ts` — function-calling registry + human-in-the-loop dispatch.
- `core/history/*` — pluggable conversation history (local storage or your own backend).
- `ui/markdown.ts` — dependency-free Markdown → HTML renderer that escapes all untrusted text
  before adding any formatting markup, so its output is safe to assign to `innerHTML`/`{@html}`.
- `adapters/react`, `adapters/svelte`, `adapters/vanilla` — thin bindings over `Chat` for each
  framework (Svelte adapter uses Svelte 5 runes).
- `adapters/vue`, `adapters/angular` — per-component Composition API/signals bindings with
  lifecycle cleanup; they do not share conversation state globally.

## Laravel / Blade

`snippets/laravel/` contains a Blade mount point and a server-side OpenAI-compatible proxy
reference. Keep the provider key in Laravel configuration, authenticate and rate-limit the route,
and retain the model allowlist; never inject a provider key into a Blade template.

## Basic usage (Svelte 5)

```ts
import { createChat } from '@modularcore/ai-chat/svelte';

const chat = createChat({
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY, // or proxy through your own backend
  models: ['openai/gpt-4o-mini'],
});

await chat.send('Hello!');
```

For a public-facing playground, never ship a real key to the client — proxy requests through a
server-side endpoint that injects the key (see `apps/web/src/routes/api/chat/+server.ts` in this
monorepo for a hardened example: rate limiting, a model allowlist, a max-tokens cap, tools
disabled, and real streaming passthrough).

## More docs

- [`docs/backend-history-contract.md`](./docs/backend-history-contract.md) — the contract your
  backend must implement if you use `core/history/backend.ts` instead of local storage.
