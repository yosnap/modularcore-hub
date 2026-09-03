<script lang="ts">
  // Pie del sitio: repite los accesos a documentación y repositorio de la cabecera y deja
  // explícitas las dos versiones, que no coinciden (la doc se publica por su cuenta).
  import GithubLink from '$lib/components/GithubLink.svelte';
  import { APP_VERSION, DOCS_URL, DOCS_VERSION, REPO_URL } from '$lib/site-links';
</script>

<footer class="site-footer">
  <nav class="footer-links" aria-label="Enlaces del sitio">
    <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">
      Documentación <span class="badge">v{DOCS_VERSION}</span>
    </a>
    <a href={REPO_URL} target="_blank" rel="noopener noreferrer">Repositorio</a>
  </nav>

  <div class="footer-meta">
    <span>ModularCore Hub v{APP_VERSION} · Documentación v{DOCS_VERSION}</span>
    <GithubLink />
  </div>
</footer>

<style>
  .site-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 3rem;
    padding: 1.5rem 0 2rem;
    border-top: 1px solid var(--ui-glass-border);
    font-size: 0.85rem;
    color: hsl(var(--muted-foreground));
  }
  .footer-links {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
  }
  .footer-links a {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: inherit;
    text-decoration: none;
    transition: color 0.18s var(--ui-ease-out);
  }
  .footer-links a:hover {
    color: hsl(var(--accent-foreground));
  }
  .badge {
    padding: 0.05rem 0.45rem;
    border-radius: 999px;
    border: 1px solid var(--ui-glass-border);
    background: hsl(var(--muted) / 0.6);
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
  }
  .footer-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-variant-numeric: tabular-nums;
  }
</style>
