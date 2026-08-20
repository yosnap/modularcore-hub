<script lang="ts">
  import { ALLOWED_MODELS } from '$lib/chat-config';
  import { createPlaygroundChat } from '$lib/playground-chat.svelte';

  const chat = createPlaygroundChat();
  let draft = $state('');

  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;
    draft = '';
    await chat.send(content);
  }
</script>

<a href="/">&larr; Volver al catálogo</a>

<h1>Playground: AI Chat</h1>
<p>
  Demo en vivo de <code>@modularcore/ai-chat</code>. La conversación pasa por
  <code>/api/chat</code>, un proxy server-side que inyecta la API key del dueño — el navegador
  nunca ve la key. Cambiar de proveedor (OpenRouter, OpenAI, etc.) es solo cambiar
  <code>baseURL</code> en ese proxy, no el código de este componente.
</p>

<label class="mb-4 block text-sm font-medium">
  Modelo:
  <select
    value={chat.model}
    onchange={(e) => chat.setModel(e.currentTarget.value as (typeof ALLOWED_MODELS)[number])}
    class="rounded-md border border-input bg-background px-2 py-1 text-sm"
  >
    {#each ALLOWED_MODELS as model (model)}
      <option value={model}>{model}</option>
    {/each}
  </select>
</label>

<ul class="messages">
  {#each chat.messages as message, index (index)}
    <li class={message.role}>
      <strong>{message.role}:</strong>
      {message.content}
    </li>
  {/each}
</ul>

{#if chat.error}
  <p class="error">{chat.error}</p>
{/if}

<form onsubmit={handleSubmit}>
  <input
    type="text"
    bind:value={draft}
    placeholder="Escribe un mensaje..."
    disabled={chat.status === 'streaming'}
    class="rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
  />
  <button
    type="submit"
    disabled={chat.status === 'streaming' || draft.trim().length === 0}
    class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
  >
    Enviar
  </button>
</form>

<style>
  .messages {
    list-style: none;
    padding: 0;
    display: grid;
    gap: 0.5rem;
    margin: 1rem 0;
  }
  .messages li {
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    background: var(--mc-neutral-50);
  }
  .messages li.user {
    background: var(--mc-primary-100);
  }
  .error {
    color: var(--mc-danger);
  }
  form {
    display: flex;
    gap: 0.5rem;
  }
  input {
    flex: 1;
    padding: 0.5rem;
  }
</style>
