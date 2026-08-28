<script lang="ts">
  import type { Snippet } from 'svelte';

  import { PLAYGROUNDS } from '$lib/playgrounds';

  import '../app.css';

  let { children }: { children: Snippet } = $props();
</script>

<div class="site">
  <header>
    <a class="brand" href="/">
      <img src="/logo.svg" alt="ModularCore Hub" height="76" />
    </a>
    <nav>
      <a class="nav-link" href="/">Catálogo</a>
      <details class="playgrounds-menu">
        <summary>Playgrounds</summary>
        <div class="playgrounds-list">
          {#each PLAYGROUNDS as playground (playground.component)}
            <a href={playground.href}>{playground.label}</a>
          {/each}
        </div>
      </details>
      <a class="nav-link" href="/cli">CLI</a>
      <a class="nav-link" href="/mcp-server">MCP</a>
    </nav>
  </header>
  <main>
    {@render children()}
  </main>
</div>

<style>
  .site {
    max-width: 960px;
    margin: 0 auto;
    padding: 1.5rem 1rem 4rem;
    font-family: var(--mc-font-body);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid var(--mc-neutral-200);
    margin-bottom: 2rem;
  }
  .brand {
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    color: inherit;
  }
  nav {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }
  .nav-link {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--mc-neutral-500);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .nav-link:hover {
    color: var(--mc-primary-600);
  }
  .playgrounds-menu {
    position: relative;
    color: var(--mc-neutral-500);
    font-size: 0.875rem;
    font-weight: 500;
  }
  summary {
    cursor: pointer;
  }
  .playgrounds-list {
    position: absolute;
    z-index: 10;
    top: calc(100% + 0.5rem);
    right: 0;
    display: grid;
    min-width: 11rem;
    padding: 0.5rem;
    border: 1px solid var(--mc-neutral-200);
    border-radius: 8px;
    background: var(--mc-neutral-0);
    box-shadow: 0 8px 20px rgb(15 23 42 / 12%);
  }
  .playgrounds-list a {
    padding: 0.4rem 0.5rem;
    border-radius: 4px;
    text-decoration: none;
  }
  .playgrounds-list a:hover {
    background: var(--mc-neutral-100);
  }
</style>
