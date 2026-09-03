<script lang="ts">
  // Enlace al repositorio con la marca de GitHub, reutilizado en la cabecera y en el pie.
  import { REPO_URL } from '$lib/site-links';

  let { label = 'Repositorio en GitHub' }: { label?: string } = $props();
</script>

<a class="github-link" href={REPO_URL} target="_blank" rel="noopener noreferrer" aria-label={label}>
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path
      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
    />
  </svg>
</a>

<style>
  .github-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 999px;
    border: 1px solid var(--ui-glass-border);
    background: hsl(var(--muted) / 0.5);
    color: hsl(var(--muted-foreground));
    transition:
      border-color 0.18s var(--ui-ease-out),
      background-color 0.18s var(--ui-ease-out),
      color 0.18s var(--ui-ease-out);
  }
  .github-link:hover {
    border-color: hsl(var(--primary) / 0.45);
    background: hsl(var(--muted) / 0.8);
    color: hsl(var(--foreground));
  }
  .github-link svg {
    width: 1.15rem;
    height: 1.15rem;
  }
</style>
