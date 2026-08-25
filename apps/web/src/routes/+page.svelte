<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<h1>Catálogo de componentes</h1>
<p>
  Componentes públicos publicados en el registry (<code>/registry/index.json</code>). Cada uno se
  puede instalar de forma manual o vía CLI — ver su página de detalle.
</p>

<ul class="cards">
  {#each data.components as component (component.name)}
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
    </li>
  {:else}
    <li>No hay componentes públicos en el registry.</li>
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
        <span>@modularcore/mcp-server</span>
      </p>
      <p>
        Servidor MCP (stdio) que expone el registry a clientes como Cursor, Claude Code o VS Code
        — búsqueda, instalación con confirmación y chequeo de actualizaciones vía tools MCP.
      </p>
    </li>
  </ul>
</section>

<style>
  .cards {
    list-style: none;
    padding: 0;
    display: grid;
    gap: 1rem;
  }
  .card {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 1rem;
  }
  .meta {
    display: flex;
    gap: 0.75rem;
    color: #555;
    font-size: 0.9rem;
  }
  .badge {
    background: #eee;
    border-radius: 4px;
    padding: 0 0.4rem;
  }
</style>
