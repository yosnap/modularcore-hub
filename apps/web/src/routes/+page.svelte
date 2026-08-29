<script lang="ts">
  import { PLAYGROUNDS, playgroundFor } from '$lib/playgrounds';

  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let category = $state('all');
  let categories = $derived(
    [...new Set(data.components.map((component) => component.category))].sort(),
  );
  let filteredComponents = $derived(
    category === 'all'
      ? data.components
      : data.components.filter((component) => component.category === category),
  );

  // Rotate a small accent palette across categories so each badge reads distinctly without
  // straying from the brand family (indigo / violet / cyan / emerald).
  const accents = ['var(--mc-primary-500)', 'var(--mc-accent-violet)', 'var(--mc-accent-cyan)', 'var(--mc-accent-emerald)'];
  function accentFor(name: string): string {
    const index = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % accents.length;
    return accents[index] ?? accents[0]!;
  }
</script>

<section class="hero">
  <h1>Catálogo de <span class="grad">componentes</span></h1>
  <p class="lede">
    Componentes headless multi-proveedor publicados en el registry
    (<code>/registry/index.json</code>). Instálalos manualmente o vía CLI — cada uno con su página
    de detalle y playground en vivo.
  </p>
</section>

<div class="filter-bar" role="group" aria-label="Filtrar por tipo de componente">
  <button class="pill" class:active={category === 'all'} onclick={() => (category = 'all')}>
    Todos
  </button>
  {#each categories as item (item)}
    <button class="pill" class:active={category === item} onclick={() => (category = item)}>
      <span class="pill-dot" style="background: {accentFor(item)}"></span>
      {item}
    </button>
  {/each}
</div>

<ul class="cards">
  {#each filteredComponents as component (component.name)}
    {@const playground = playgroundFor(component.name)}
    <li class="card">
      <div class="card-body">
        <div class="meta">
          <span class="badge" style="--accent: {accentFor(component.category)}">
            <span class="badge-dot"></span>
            {component.category}
          </span>
          <span class="ver">v{component.version}</span>
        </div>
        <h2><a href={`/c/${component.name}`}>{component.title}</a></h2>
        <p class="frameworks">{component.frameworks.join(' · ')}</p>
        {#if component.description}
          <p class="desc">{component.description}</p>
        {/if}
        <div class="actions">
          <a class="action primary" href={`/c/${component.name}`}>
            Ver detalles
            <span class="arrow" aria-hidden="true">→</span>
          </a>
          {#if playground}
            <a class="action" href={playground.href}>Abrir playground</a>
          {/if}
        </div>
      </div>
    </li>
  {:else}
    <li class="empty">No hay componentes del tipo seleccionado.</li>
  {/each}
</ul>

<section class="tools">
  <h2 class="section-title">Herramientas</h2>
  <p class="section-lede">
    A diferencia de los componentes de arriba, lo siguiente <strong
      >no se copia a tu proyecto ni se instala vía CLI</strong
    >: se registra en la configuración de tu cliente y se ejecuta bajo demanda.
  </p>
  <ul class="cards">
    <li class="card">
      <div class="card-body">
        <div class="meta">
          <span class="badge" style="--accent: var(--mc-accent-cyan)">
            <span class="badge-dot"></span>
            npx
          </span>
          <span class="ver">@modularcore/mcp-server@0.3.1</span>
        </div>
        <h3><a href="/mcp-server">MCP Server</a></h3>
        <p class="desc">
          Servidor MCP (stdio) que expone el registry a clientes como Cursor, Claude Code o VS Code
          — búsqueda, instalación con confirmación y chequeo de actualizaciones vía tools MCP.
        </p>
        <div class="actions">
          <a class="action primary" href="/mcp-server">
            Ver detalles
            <span class="arrow" aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </li>
  </ul>
  <p class="playground-summary">
    Demos disponibles: {PLAYGROUNDS.map((playground) => playground.label).join(', ')}.
  </p>
</section>

<style>
  .hero {
    margin-bottom: 2rem;
  }
  h1 {
    font-size: clamp(2.1rem, 5vw, 3.1rem);
    line-height: 1.05;
    letter-spacing: -0.03em;
    margin: 0 0 0.75rem;
  }
  .grad {
    color: hsl(var(--primary));
  }
  .lede {
    max-width: 46rem;
    font-size: 1.05rem;
    color: hsl(var(--muted-foreground));
  }
  .lede code {
    font-size: 0.9em;
    padding: 0.05rem 0.35rem;
    border-radius: 5px;
    background: hsl(var(--muted));
    color: hsl(var(--foreground));
  }

  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0 0 1.75rem;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.85rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
    background: var(--ui-glass-bg);
    border: 1px solid var(--ui-glass-border);
    border-radius: 999px;
    cursor: pointer;
    text-transform: capitalize;
    transition:
      color 0.18s var(--ui-ease-out),
      border-color 0.18s var(--ui-ease-out),
      transform 0.18s var(--ui-ease-spring);
  }
  .pill:hover {
    color: hsl(var(--foreground));
    transform: translateY(-1px);
  }
  .pill.active {
    color: hsl(var(--primary-foreground));
    background: var(--ui-gradient-brand);
    border-color: transparent;
    box-shadow: var(--ui-glow);
  }
  .pill-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
  }
  .pill.active .pill-dot {
    background: rgb(255 255 255 / 90%) !important;
  }

  .cards {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 1.1rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .card {
    position: relative;
    border-radius: var(--ui-radius-2xl);
    background: var(--ui-glass-bg);
    border: 1px solid var(--ui-glass-border);
    box-shadow: var(--ui-shadow-sm);
    overflow: hidden;
    transition:
      transform 0.28s var(--ui-ease-out),
      box-shadow 0.28s var(--ui-ease-out),
      border-color 0.28s var(--ui-ease-out);
  }
  .card:hover {
    transform: translateY(-4px);
    border-color: hsl(var(--primary) / 0.4);
    box-shadow: var(--ui-shadow-lg);
  }
  .card-body {
    position: relative;
    padding: 1.35rem;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.65rem;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 14%, transparent);
  }
  .badge-dot {
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 50%;
    background: var(--accent);
  }
  .ver {
    font-family: var(--mc-font-mono);
    font-size: 0.78rem;
    color: hsl(var(--muted-foreground));
  }

  .card h2,
  .card h3 {
    font-size: 1.2rem;
    margin: 0 0 0.2rem;
    letter-spacing: -0.01em;
  }
  .card h2 a,
  .card h3 a {
    color: hsl(var(--foreground));
    text-decoration: none;
    transition: color 0.18s var(--ui-ease-out);
  }
  .card:hover h2 a,
  .card:hover h3 a {
    color: hsl(var(--primary));
  }
  .frameworks {
    font-family: var(--mc-font-mono);
    font-size: 0.78rem;
    color: hsl(var(--muted-foreground));
    margin: 0 0 0.75rem;
  }
  .desc {
    font-size: 0.92rem;
    color: hsl(var(--muted-foreground));
    line-height: 1.55;
    margin: 0;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 1.1rem;
  }
  .action {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.88rem;
    font-weight: 600;
    text-decoration: none;
    color: hsl(var(--muted-foreground));
    transition: color 0.18s var(--ui-ease-out);
  }
  .action:hover {
    color: hsl(var(--primary));
  }
  .action.primary {
    color: hsl(var(--primary));
  }
  .arrow {
    transition: transform 0.22s var(--ui-ease-spring);
  }
  .action.primary:hover .arrow {
    transform: translateX(3px);
  }

  .empty {
    list-style: none;
    grid-column: 1 / -1;
    padding: 2rem;
    text-align: center;
    color: hsl(var(--muted-foreground));
    border: 1px dashed var(--ui-glass-border);
    border-radius: var(--ui-radius-2xl);
  }

  .tools {
    margin-top: 3.5rem;
  }
  .section-title {
    font-size: 1.5rem;
    letter-spacing: -0.02em;
    margin-bottom: 0.5rem;
  }
  .section-lede {
    color: hsl(var(--muted-foreground));
    max-width: 46rem;
    margin-bottom: 1.25rem;
  }
  .playground-summary {
    color: hsl(var(--muted-foreground));
    font-size: 0.9rem;
    margin-top: 1.25rem;
  }

  @media (max-width: 640px) {
    .cards {
      grid-template-columns: 1fr;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .card,
    .pill,
    .arrow,
    .card h2 a {
      transition: none;
      animation: none;
    }
  }
</style>
