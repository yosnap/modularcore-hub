<script lang="ts">
  import { onMount } from 'svelte';
  import { createSchema, SCHEMA_TYPES, stringify, validate, type SchemaType } from '@modularcore/auto-seo';

  import ModernSelect from '$lib/components/ModernSelect.svelte';

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

<h1>Playground: Auto SEO</h1>
<p>
  Generá JSON-LD con <code>@modularcore/auto-seo</code>. Elegí un tipo, editá sus propiedades y
  copiá una salida segura para incluirla en un <code>script application/ld+json</code>.
</p>

<div class="field type-field">
  <span class="field-label">Tipo de Schema.org</span>
  <ModernSelect
    value={type}
    ariaLabel="Tipo de Schema.org"
    options={SCHEMA_TYPES.map((schemaType) => ({ value: schemaType, label: schemaType }))}
    onchange={(next) => selectType(next as SchemaType)}
  />
</div>

<label class="field">
  <span class="field-label">Propiedades (JSON)</span>
  <textarea bind:value={propsSource} rows="10" spellcheck="false"></textarea>
</label>

{#if result.parseError}
  <p class="error">JSON inválido: {result.parseError}</p>
{:else}
  {#if result.errors.length > 0}
    <p class="error">Faltan campos requeridos: {result.errors.join(' · ')}</p>
  {:else}
    <p class="success">JSON-LD válido para la validación mínima del componente.</p>
  {/if}
  <label class="field">
    <span class="field-label">Resultado JSON-LD</span>
    <textarea value={result.json} rows="12" readonly spellcheck="false"></textarea>
  </label>
  <button type="button" onclick={copyJson}>{copied ? 'Copiado' : 'Copiar JSON-LD'}</button>
{/if}

<style>
  .field {
    display: grid;
    gap: 0.45rem;
    margin: 1.25rem 0;
  }
  /* The type picker stays compact instead of stretching the full content width. */
  .type-field {
    max-width: 22rem;
  }
  .field-label {
    font-weight: 600;
    font-size: 0.9rem;
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid hsl(var(--border));
    border-radius: 0.6rem;
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    padding: 0.7rem;
    font: 0.875rem var(--mc-font-mono);
    resize: vertical;
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }
  textarea:focus-visible {
    outline: none;
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.18);
  }
  button {
    margin-top: 1rem;
    border: 0;
    border-radius: 0.6rem;
    padding: 0.6rem 1rem;
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      transform 0.15s ease;
  }
  button:hover {
    background: hsl(var(--primary) / 0.9);
    transform: translateY(-1px);
  }
  .error {
    color: var(--mc-danger);
  }
  .success {
    color: var(--mc-accent-emerald);
  }
</style>
