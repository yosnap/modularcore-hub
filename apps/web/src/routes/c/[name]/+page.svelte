<script lang="ts">
  import { playgroundFor } from '$lib/playgrounds';

  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let descriptor = $derived(data.descriptor);
  let tarballPath = $derived(`/registry/${descriptor.name}.tar.gz`);
  let playground = $derived(playgroundFor(descriptor.name));
</script>

<h1>{descriptor.title}</h1>
<p class="meta">
  <span class="badge">{descriptor.category}</span>
  <span>v{descriptor.version}</span>
  <span>{descriptor.frameworks.join(', ')}</span>
</p>
{#if descriptor.description}
  <p>{descriptor.description}</p>
{/if}

{#if playground}
  <a class="playground-cta" href={playground.href}>
    <svg class="cta-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 5v14l11-7z" fill="currentColor" />
    </svg>
    <span class="cta-title">Abrir playground</span>
    <span class="cta-sub">· {playground.label} en vivo</span>
    <span class="cta-arrow" aria-hidden="true">→</span>
  </a>
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
    color: hsl(var(--muted-foreground));
    font-size: 0.9rem;
  }

  /* Playground CTA — minimalist single-line link: a primary play glyph, label, and arrow. */
  .playground-cta {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin: 1.5rem 0 0.5rem;
    padding: 0.55rem 0.95rem;
    border: 1px solid var(--ui-glass-border);
    border-radius: var(--ui-radius-xl);
    background: transparent;
    text-decoration: none;
    color: hsl(var(--foreground));
    transition:
      border-color 0.18s var(--ui-ease-out),
      background-color 0.18s var(--ui-ease-out);
  }
  .playground-cta:hover {
    border-color: hsl(var(--primary) / 0.5);
    background: hsl(var(--primary) / 0.06);
  }
  .cta-icon {
    width: 0.95rem;
    height: 0.95rem;
    color: hsl(var(--primary));
    flex-shrink: 0;
  }
  .cta-title {
    font-weight: 600;
    font-size: 0.9rem;
  }
  .cta-sub {
    font-size: 0.9rem;
    color: hsl(var(--muted-foreground));
  }
  .cta-arrow {
    margin-left: 0.35rem;
    color: hsl(var(--muted-foreground));
    transition: transform 0.2s var(--ui-ease-spring);
  }
  .playground-cta:hover .cta-arrow {
    transform: translateX(3px);
    color: hsl(var(--primary));
  }
  @media (prefers-reduced-motion: reduce) {
    .playground-cta,
    .cta-arrow {
      transition: none;
    }
  }
  .badge {
    background: hsl(var(--muted));
    color: hsl(var(--foreground));
    border-radius: 4px;
    padding: 0 0.4rem;
  }
  table {
    border-collapse: collapse;
    width: 100%;
  }
  th,
  td {
    border: 1px solid var(--ui-glass-border);
    padding: 0.4rem 0.6rem;
    text-align: left;
    vertical-align: top;
  }
</style>
