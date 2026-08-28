<script lang="ts">
  import { PLAYGROUNDS, playgroundFor } from '$lib/playgrounds';

  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let category = $state('all');
  let categories = $derived([...new Set(data.components.map((component) => component.category))].sort());
  let filteredComponents = $derived(
    category === 'all'
      ? data.components
      : data.components.filter((component) => component.category === category),
  );
</script>

<h1>Catálogo de componentes</h1>
<p>
  Componentes públicos publicados en el registry (<code>/registry/index.json</code>). Cada uno se
  puede instalar de forma manual o vía CLI — ver su página de detalle.
</p>

<label class="filter">
  Tipo de componente
  <select bind:value={category} aria-label="Filtrar por tipo de componente">
    <option value="all">Todos los tipos</option>
    {#each categories as item (item)}
      <option value={item}>{item}</option>
    {/each}
  </select>
</label>

<ul class="cards">
  {#each filteredComponents as component (component.name)}
    {@const playground = playgroundFor(component.name)}
    <li class="card">
      <h2><a href={`/c/${component.name}`}>{component.title}</a></h2>
      <p class="meta">
        <span class="badge">{component.category}</span>
        <span>v{component.version}</span>
        <span>{component.frameworks.join(', ')}</span>
      </p>
      {#if component.description}
        <p>{component.description}</p>
      {/if}
      <p class="actions">
        <a href={`/c/${component.name}`}>Ver detalles</a>
        {#if playground}
          <a href={playground.href}>Abrir playground</a>
        {/if}
      </p>
    </li>
  {:else}
    <li>No hay componentes del tipo seleccionado.</li>
  {/each}
</ul>

<section class="tools">
  <h2>Herramientas</h2>
  <p>
    A diferencia de los componentes de arriba, lo siguiente <strong
      >no se copia a tu proyecto ni se instala vía CLI</strong
    >: se registra en la configuración de tu cliente y se ejecuta bajo demanda.
  </p>
  <ul class="cards">
    <li class="card">
      <h3><a href="/mcp-server">MCP Server</a></h3>
      <p class="meta">
        <span class="badge">npx</span>
        <span>@modularcore/mcp-server@0.3.1</span>
      </p>
      <p>
        Servidor MCP (stdio) que expone el registry a clientes como Cursor, Claude Code o VS Code
        — búsqueda, instalación con confirmación y chequeo de actualizaciones vía tools MCP.
      </p>
    </li>
  </ul>
  <p class="playground-summary">
    Demos disponibles: {PLAYGROUNDS.map((playground) => playground.label).join(', ')}.
  </p>
</section>

<style>
  .cards {
    list-style: none;
    padding: 0;
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .card {
    border: 1px solid var(--mc-neutral-200);
    border-radius: 8px;
    padding: 1rem;
  }
  .filter {
    display: grid;
    gap: 0.35rem;
    width: min(100%, 20rem);
    margin: 1.25rem 0;
    font-weight: 600;
  }
  select {
    border: 1px solid var(--mc-neutral-300);
    border-radius: 6px;
    padding: 0.5rem 0.65rem;
    background: var(--mc-neutral-0);
  }
  .meta {
    display: flex;
    gap: 0.75rem;
    color: var(--mc-neutral-500);
    font-size: 0.9rem;
  }
  .badge {
    background: var(--mc-neutral-100);
    border-radius: 4px;
    padding: 0 0.4rem;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    margin: 1rem 0 0;
    font-weight: 600;
  }
  .playground-summary {
    color: var(--mc-neutral-500);
    font-size: 0.9rem;
  }
  @media (max-width: 640px) {
    .cards {
      grid-template-columns: 1fr;
    }
  }
</style>
