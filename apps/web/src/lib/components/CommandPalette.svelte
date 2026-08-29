<script lang="ts">
  import { tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { focusInitialElement, restoreFocus, trapFocus } from '$lib/focus-management';

  export interface CommandItem {
    label: string;
    href: string;
    group: string;
    hint?: string;
  }

  let { items, open = $bindable(false) }: { items: CommandItem[]; open?: boolean } = $props();

  let query = $state('');
  let activeIndex = $state(0);
  let paletteEl = $state<HTMLElement | null>(null);
  let openerEl = $state<HTMLElement | null>(null);

  let results = $derived(
    query.trim()
      ? items.filter((item) =>
          `${item.label} ${item.group} ${item.hint ?? ''}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        )
      : items,
  );

  // Keep the highlighted row in range as the result set shrinks/grows.
  $effect(() => {
    if (activeIndex >= results.length) activeIndex = Math.max(0, results.length - 1);
  });

  // Reset + focus the input whenever the palette opens, no matter how it was opened (⌘K, the
  // navbar button, or any other trigger binding `open`).
  $effect(() => {
    if (open) {
      openerEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      query = '';
      activeIndex = 0;
      void tick().then(() => {
        if (paletteEl) focusInitialElement(paletteEl);
      });
    }
  });

  function close(): void {
    open = false;
    void tick().then(() => restoreFocus(openerEl));
  }

  function select(item: CommandItem | undefined): void {
    if (!item) return;
    close();
    void goto(item.href);
  }

  function onGlobalKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (open) close();
      else open = true;
    } else if (event.key === 'Escape' && open) {
      close();
    }
  }

  function onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = (activeIndex + 1) % Math.max(1, results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = (activeIndex - 1 + results.length) % Math.max(1, results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      select(results[activeIndex]);
    }
  }

  function onDialogKeydown(event: KeyboardEvent): void {
    if (paletteEl) trapFocus(event, paletteEl);
  }
</script>

<svelte:window onkeydown={onGlobalKeydown} />

{#if open}
  <!-- Backdrop: click closes; keyboard users close via the global Escape handler (svelte:window). -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="overlay" role="presentation" onclick={close}>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class="palette"
      role="dialog"
      aria-modal="true"
      aria-label="Buscar y navegar"
      tabindex="-1"
      bind:this={paletteEl}
      onkeydown={onDialogKeydown}
      onclick={(event) => event.stopPropagation()}
    >
      <div class="search-row">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.7" />
          <path d="M20 20l-3.2-3.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
        </svg>
        <input
          bind:value={query}
          onkeydown={onInputKeydown}
          type="text"
          placeholder="Buscar secciones, componentes, playgrounds…"
          aria-label="Buscar"
          autocomplete="off"
          spellcheck="false"
        />
        <kbd>esc</kbd>
      </div>

      <ul class="results">
        {#each results as item, index (item.href)}
          <li>
            <button
              class="result"
              class:active={index === activeIndex}
              onmouseenter={() => (activeIndex = index)}
              onclick={() => select(item)}
            >
              <span class="result-group">{item.group}</span>
              <span class="result-label">{item.label}</span>
              {#if item.hint}
                <span class="result-hint">{item.hint}</span>
              {/if}
            </button>
          </li>
        {:else}
          <li class="no-results">Sin resultados para “{query}”.</li>
        {/each}
      </ul>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 12vh 1rem 1rem;
    background: rgb(2 2 8 / 55%);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    animation: overlay-in 0.15s var(--ui-ease-out);
  }
  .palette {
    width: min(100%, 40rem);
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--ui-glass-border);
    border-radius: var(--ui-radius-2xl);
    background: hsl(var(--popover));
    box-shadow: var(--ui-shadow-lg);
    animation: palette-in 0.18s var(--ui-ease-out);
  }

  .search-row {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.9rem 1.1rem;
    border-bottom: 1px solid var(--ui-glass-border);
  }
  .search-icon {
    width: 1.15rem;
    height: 1.15rem;
    color: hsl(var(--muted-foreground));
    flex-shrink: 0;
  }
  .search-row input {
    flex: 1;
    border: 0;
    background: transparent;
    color: hsl(var(--foreground));
    font-size: 1rem;
    outline: none;
  }
  .search-row input::placeholder {
    color: hsl(var(--muted-foreground));
  }
  kbd {
    font-family: var(--mc-font-mono);
    font-size: 0.7rem;
    color: hsl(var(--muted-foreground));
    padding: 0.15rem 0.4rem;
    border: 1px solid var(--ui-glass-border);
    border-radius: 5px;
  }

  .results {
    list-style: none;
    margin: 0;
    padding: 0.4rem;
    overflow-y: auto;
  }
  .result {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.6rem 0.7rem;
    border: 0;
    border-radius: var(--ui-radius-xl);
    background: transparent;
    color: hsl(var(--foreground));
    text-align: left;
    cursor: pointer;
    transition: background-color 0.12s var(--ui-ease-out);
  }
  .result.active {
    background: hsl(var(--primary) / 0.14);
  }
  .result-group {
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: hsl(var(--muted-foreground));
    min-width: 6.5rem;
  }
  .result-label {
    font-size: 0.92rem;
    font-weight: 500;
    flex: 1;
  }
  .result-hint {
    font-family: var(--mc-font-mono);
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
  }
  .no-results {
    padding: 1.25rem;
    text-align: center;
    color: hsl(var(--muted-foreground));
    font-size: 0.9rem;
  }

  @keyframes overlay-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes palette-in {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .overlay,
    .palette {
      animation: none;
    }
  }
</style>
