<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<div class="site">
  <header>
    <a class="brand" href="/">ModularCore Hub</a>
    <nav>
      <a href="/">Catálogo</a>
      <a href="/playground/ai-chat">Playground: AI Chat</a>
      <a href="/playground/media-picker">Playground: Media Picker</a>
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
    padding: 1rem;
    font-family: system-ui, sans-serif;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #ddd;
    margin-bottom: 1.5rem;
  }
  .brand {
    font-weight: 700;
    text-decoration: none;
    color: inherit;
  }
  nav {
    display: flex;
    gap: 1rem;
  }
</style>
