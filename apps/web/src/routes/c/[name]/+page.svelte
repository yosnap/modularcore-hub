<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let descriptor = $derived(data.descriptor);
  let tarballPath = $derived(`/registry/${descriptor.name}.tar.gz`);
</script>

<a href="/">&larr; Volver al catálogo</a>

<h1>{descriptor.title}</h1>
<p class="meta">
  <span class="badge">{descriptor.category}</span>
  <span>v{descriptor.version}</span>
  <span>{descriptor.frameworks.join(', ')}</span>
</p>
{#if descriptor.description}
  <p>{descriptor.description}</p>
{/if}

<section>
  <h2>Variables de entorno</h2>
  {#if descriptor.envVariables.length === 0}
    <p>Este componente no requiere variables de entorno.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Clave</th>
          <th>Requerida</th>
          <th>Descripción</th>
        </tr>
      </thead>
      <tbody>
        {#each descriptor.envVariables as envVar (envVar.key)}
          <tr>
            <td><code>{envVar.key}</code></td>
            <td>{envVar.required ? 'Sí' : 'No'}</td>
            <td>{envVar.description}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</section>

<section>
  <h2>Instalación manual</h2>
  <p>Descarga el tarball y copia cada archivo listado abajo a su ruta destino:</p>
  <pre><code
      >curl -L -o {descriptor.name}.tar.gz https://TU_HOST{tarballPath}
tar -xzf {descriptor.name}.tar.gz</code
    ></pre>
  <table>
    <thead>
      <tr>
        <th>Origen</th>
        <th>Destino en tu proyecto</th>
      </tr>
    </thead>
    <tbody>
      {#each descriptor.files as file (file.target)}
        <tr>
          <td><code>{file.path}</code></td>
          <td><code>{file.target}</code></td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>

<section>
  <h2>Instalación con CLI</h2>
  <pre><code>modularcore add {descriptor.name}</code></pre>
</section>

{#if data.docsHtml}
  <section>
    <h2>Documentación</h2>
    <!-- Safe: docsHtml comes from @modularcore/ai-chat's renderMarkdownToHtml, which escapes all
         untrusted text before adding formatting markup (see packages/ai-chat/ui/markdown.ts). -->
    <div class="docs">{@html data.docsHtml}</div>
  </section>
{/if}

<style>
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
  table {
    border-collapse: collapse;
    width: 100%;
  }
  th,
  td {
    border: 1px solid #ddd;
    padding: 0.4rem 0.6rem;
    text-align: left;
    vertical-align: top;
  }
  pre {
    background: #f5f5f5;
    padding: 0.75rem;
    border-radius: 6px;
    overflow-x: auto;
  }
</style>
