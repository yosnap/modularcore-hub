<script lang="ts">
  import { page } from '$app/stores';
  import { selectFilesForFramework } from '@modularcore/registry/client';

  import { playgroundFor } from '$lib/playgrounds';

  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let descriptor = $derived(data.descriptor);
  let tarballPath = $derived(`/registry/${descriptor.name}.tar.gz`);
  let playground = $derived(playgroundFor(descriptor.name));

  // El host real de quien está mirando la página, en lugar de un `TU_HOST` que hay que sustituir
  // a mano. Al prerenderizar no hay petición y SvelteKit usa un origen ficticio
  // (`http://sveltekit-prerender`), que no sirve para copiar y pegar: ahí va el dominio público,
  // y al hidratarse en el navegador el valor pasa a ser el de verdad.
  const PUBLIC_ORIGIN = 'https://modularcorehub.com';
  let host = $derived(
    $page.url.origin.includes('sveltekit-prerender') ? PUBLIC_ORIGIN : $page.url.origin,
  );

  /**
   * Los ficheros que recibe cada framework, no los 89 del descriptor juntos. Se usa el mismo
   * recorte que aplica la CLI al instalar, así que la tabla enseña exactamente lo que llegaría.
   */
  let frameworkTabs = $derived(
    descriptor.frameworks.map((framework) => ({
      framework,
      files: selectFilesForFramework(descriptor.files, framework, data.catalog),
    })),
  );
  let selectedTab = $state(0);
  /**
   * Recortado al rango válido de forma derivada, no en un `$effect`: un efecto corre después de
   * pintar los nuevos `frameworkTabs`, así que al navegar de un componente con 6 frameworks (la
   * pestaña 5 activa) a uno con 1, habría un pintado intermedio sin ninguna pestaña que
   * coincidiera con `activeTab` — la tabla desaparecería un instante antes de que el efecto la
   * corrigiera.
   */
  let activeTab = $derived(Math.min(selectedTab, frameworkTabs.length - 1));
</script>

<h1>{descriptor.title}</h1>
{#if descriptor.preview}
  <img class="shot" src={descriptor.preview.image} alt={descriptor.preview.alt} />
{/if}
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
  <p>Descarga el tarball y copia a tu proyecto los archivos de tu framework:</p>
  <pre><code
      >curl -L -o {descriptor.name}.tar.gz {host}{tarballPath}
tar -xzf {descriptor.name}.tar.gz</code
    ></pre>

  <div
    class="tabs"
    role="tablist"
    aria-label="Archivos por framework"
    onkeydown={(event) => {
      // Flechas para moverse entre pestañas, como espera quien navega con teclado un `tablist`.
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const next = (activeTab + delta + frameworkTabs.length) % frameworkTabs.length;
      selectedTab = next;
      const target = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[
        next
      ];
      target?.focus();
    }}
  >
    {#each frameworkTabs as tab, index (tab.framework)}
      <button
        type="button"
        role="tab"
        id={`tab-${tab.framework}`}
        class="tab"
        class:active={activeTab === index}
        aria-selected={activeTab === index}
        aria-controls={`panel-${tab.framework}`}
        tabindex={activeTab === index ? 0 : -1}
        onclick={() => (selectedTab = index)}
      >
        {tab.framework}
        <span class="count">{tab.files.length}</span>
      </button>
    {/each}
  </div>

  {#each frameworkTabs as tab, index (tab.framework)}
    {#if activeTab === index}
      <table
        role="tabpanel"
        id={`panel-${tab.framework}`}
        aria-labelledby={`tab-${tab.framework}`}
      >
        <thead>
          <tr>
            <th>Origen</th>
            <th>Destino en tu proyecto</th>
          </tr>
        </thead>
        <tbody>
          {#each tab.files as file (file.target)}
            <tr>
              <td><code>{file.path}</code></td>
              <td><code>{file.target}</code></td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  {/each}
</section>

<section>
  <h2>Instalación con CLI</h2>
  <pre><code>modularcore add {descriptor.name}</code></pre>
</section>

{#if data.docsHtml}
  <section>
    <h2>Documentación</h2>
    <!-- Seguro: `renderDocsMarkdown` escapa todo el texto antes de añadir marcado y descarta
         cualquier href que no sea http(s) o un ancla (ver src/lib/render-docs.ts). -->
    <div class="docs">{@html data.docsHtml}</div>
  </section>
{/if}

<style>
  /* Pestañas por framework: cada una enseña sólo los archivos que ese framework recibe. */
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 1rem 0 0.75rem;
  }
  .tab {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.8rem;
    border: 1px solid hsl(var(--border));
    border-radius: var(--ui-radius-xl, 999px);
    background: transparent;
    color: hsl(var(--muted-foreground));
    font: inherit;
    font-size: 0.85rem;
    cursor: pointer;
    transition:
      border-color 0.18s ease,
      color 0.18s ease,
      background-color 0.18s ease;
  }
  .tab:hover {
    border-color: hsl(var(--primary) / 0.5);
    color: hsl(var(--foreground));
  }
  .tab.active {
    border-color: hsl(var(--primary));
    background: hsl(var(--primary) / 0.08);
    color: hsl(var(--foreground));
  }
  .tab .count {
    font-family: var(--mc-font-mono);
    font-size: 0.75rem;
    opacity: 0.7;
  }

  /* La documentación llega como HTML generado, así que se estiliza desde aquí. */
  .docs :global(h1),
  .docs :global(h2),
  .docs :global(h3),
  .docs :global(h4) {
    color: hsl(var(--foreground));
    line-height: 1.25;
    margin: 1.75rem 0 0.6rem;
  }
  .docs :global(h1) {
    font-size: 1.6rem;
  }
  .docs :global(h2) {
    font-size: 1.3rem;
    padding-bottom: 0.35rem;
    border-bottom: 1px solid hsl(var(--border));
  }
  .docs :global(h3) {
    font-size: 1.08rem;
  }
  .docs :global(p),
  .docs :global(li) {
    color: hsl(var(--muted-foreground));
    line-height: 1.65;
  }
  .docs :global(ul) {
    padding-left: 1.15rem;
    margin: 0.5rem 0 1rem;
  }
  .docs :global(li) {
    margin: 0.3rem 0;
  }
  .docs :global(strong) {
    color: hsl(var(--foreground));
  }
  .docs :global(a) {
    color: hsl(var(--primary));
  }
  /* El código inline, distinguido del texto: era lo que hacía que todo se leyera igual. */
  .docs :global(code) {
    font-family: var(--mc-font-mono);
    font-size: 0.85em;
    padding: 0.1rem 0.35rem;
    border-radius: 5px;
    background: hsl(var(--muted));
    color: hsl(var(--foreground));
  }
  .docs :global(pre) {
    overflow-x: auto;
    padding: 0.9rem 1rem;
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    background: hsl(var(--muted) / 0.5);
  }
  .docs :global(pre code) {
    padding: 0;
    background: none;
  }
  .docs :global(blockquote) {
    margin: 1rem 0;
    padding: 0.1rem 0 0.1rem 0.9rem;
    border-left: 3px solid hsl(var(--primary) / 0.4);
    color: hsl(var(--muted-foreground));
  }

  .shot {
    display: block;
    width: 100%;
    max-width: 720px;
    height: auto;
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    margin: 1rem 0;
  }

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
