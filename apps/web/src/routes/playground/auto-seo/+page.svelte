<script lang="ts">
  import { onMount } from 'svelte';
  import { createSchema, SCHEMA_TYPES, stringify, validate, type SchemaType } from '@modularcore/auto-seo';

  const DEFAULT_PROPS: Record<SchemaType, Record<string, unknown>> = {
    Article: { headline: 'Una guía para componentes modulares', datePublished: '2026-08-28' },
    Product: { name: 'Componente ModularCore', offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' } },
    Organization: { name: 'ModularCore', logo: '/logo.svg' },
    BreadcrumbList: { itemListElement: [] },
    WebSite: { name: 'ModularCore Hub', url: '/' },
    LocalBusiness: { name: 'ModularCore Hub', address: { '@type': 'PostalAddress', addressLocality: 'Madrid' } },
    FAQPage: { mainEntity: [] },
  };

  let type = $state<SchemaType>('Article');
  let propsSource = $state(JSON.stringify(DEFAULT_PROPS.Article, null, 2));
  let copied = $state(false);
  let origin = $state('https://tu-dominio.example');

  onMount(() => {
    origin = window.location.origin;
  });

  let result = $derived.by(() => {
    try {
      const props = JSON.parse(propsSource) as Record<string, unknown>;
      const schema = createSchema(type, props as never);
      const validation = validate(schema);
      return { json: stringify(schema, { absolute: origin }), errors: validation.errors, parseError: '' };
    } catch (error) {
      return { json: '', errors: [], parseError: error instanceof Error ? error.message : 'JSON no válido.' };
    }
  });

  function selectType(nextType: SchemaType): void {
    type = nextType;
    propsSource = JSON.stringify(DEFAULT_PROPS[nextType], null, 2);
    copied = false;
  }

  async function copyJson(): Promise<void> {
    if (!result.json) return;
    await navigator.clipboard.writeText(result.json);
    copied = true;
  }
</script>

<a href="/">&larr; Volver al catálogo</a>

<h1>Playground: Auto SEO</h1>
<p>
  Generá JSON-LD con <code>@modularcore/auto-seo</code>. Elegí un tipo, editá sus propiedades y
  copiá una salida segura para incluirla en un <code>script application/ld+json</code>.
</p>

<div class="grid">
  <label>
    Tipo de Schema.org
    <select value={type} onchange={(event) => selectType(event.currentTarget.value as SchemaType)}>
      {#each SCHEMA_TYPES as schemaType (schemaType)}
        <option value={schemaType}>{schemaType}</option>
      {/each}
    </select>
  </label>

  <label>
    Propiedades (JSON)
    <textarea bind:value={propsSource} rows="16" spellcheck="false"></textarea>
  </label>
</div>

{#if result.parseError}
  <p class="error">JSON inválido: {result.parseError}</p>
{:else}
  {#if result.errors.length > 0}
    <p class="error">Faltan campos requeridos: {result.errors.join(' · ')}</p>
  {:else}
    <p class="success">JSON-LD válido para la validación mínima del componente.</p>
  {/if}
  <label>
    Resultado JSON-LD
    <textarea value={result.json} rows="18" readonly spellcheck="false"></textarea>
  </label>
  <button type="button" onclick={copyJson}>{copied ? 'Copiado' : 'Copiar JSON-LD'}</button>
{/if}

<style>
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin: 1.25rem 0; }
  label { display: grid; gap: 0.4rem; font-weight: 600; }
  select, textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--mc-neutral-300); border-radius: 6px; padding: 0.6rem; font: 0.875rem var(--mc-font-mono); }
  textarea { resize: vertical; font-weight: 400; }
  button { margin-top: 1rem; border: 0; border-radius: 6px; padding: 0.6rem 0.9rem; background: var(--mc-primary-600); color: var(--mc-neutral-0); cursor: pointer; }
  .error { color: var(--mc-danger); }
  .success { color: var(--mc-success, #15803d); }
  @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
</style>
