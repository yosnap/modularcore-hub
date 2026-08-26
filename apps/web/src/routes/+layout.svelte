<script lang="ts">
  import type { Snippet } from 'svelte';

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
      <a class="nav-link" href="/playground/ai-chat">Playground: AI Chat</a>
      <a class="nav-link" href="/playground/media-picker">Playground: Media Picker</a>
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
</style>
