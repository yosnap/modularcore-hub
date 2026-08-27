<script lang="ts">
  import { createModals } from '@modularcore/modals/svelte';
  import ModernSelect from '$lib/components/ModernSelect.svelte';
  import ModalsRendererHeadless from '@modularcore/modals/ui/svelte/ModalsRenderer.svelte';
  import ModalsRendererTailwind from '@modularcore/modals/ui/svelte/tailwind/ModalsRenderer.svelte';
  import ModalsRendererShadcn from '@modularcore/modals/ui/svelte/shadcn/ModalsRenderer.svelte';
  import ModalsRendererVanilla from '@modularcore/modals/ui/svelte/vanilla/ModalsRenderer.svelte';

  import { createDemoModalsProvider } from '$lib/demo-modals-provider';

  import type {
    FrequencyType,
    ModalConfig,
    OverlayType,
    TriggerType,
  } from '@modularcore/modals/types';

  const CUSTOM_ID = 'custom-preview';

  const OVERLAY_TYPES: OverlayType[] = [
    'modal',
    'fullscreen',
    'top-banner',
    'bottom-banner',
    'slide-in',
    'toast',
  ];
  const TRIGGER_TYPES: TriggerType[] = [
    'manual',
    'click',
    'page-load',
    'delay',
    'scroll',
    'exit-intent',
  ];
  const FREQUENCIES: FrequencyType[] = ['always', 'once-per-session', 'once-per-day', 'once-ever'];
  const MAX_WIDTHS: NonNullable<ModalConfig['maxWidth']>[] = ['sm', 'md', 'lg', 'xl', '2xl', 'full'];

  function needsTriggerValue(type: TriggerType): boolean {
    return type === 'delay' || type === 'scroll';
  }
  function needsMaxWidth(type: OverlayType): boolean {
    return type === 'modal' || type === 'fullscreen';
  }
  function splitList(value: string): string[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  let log = $state<string[]>([]);
  function pushLog(line: string): void {
    log = [`${new Date().toLocaleTimeString()} — ${line}`, ...log].slice(0, 20);
  }

  let form = $state({
    type: 'modal' as OverlayType,
    title: 'Título de ejemplo',
    message: 'Este es el mensaje del overlay — probá los campos y guardá para previsualizarlo.',
    showCloseButton: true,
    primaryButtonText: 'Aceptar',
    primaryButtonUrl: '',
    secondaryButtonText: '',
    secondaryButtonUrl: '',
    triggerType: 'manual' as TriggerType,
    triggerValue: 1500,
    frequency: 'always' as FrequencyType,
    // Alto por defecto para que el preview siempre gane su slot frente a las fixtures de la
    // galería (todas priority 0) cuando el trigger es automático (delay/scroll/exit-intent/
    // page-load) — de lo contrario una fixture manual podría "ganar" el slot sin disparar nunca
    // y el preview jamás se auto-programaría. Bajalo si querés experimentar con el desempate.
    priority: 100,
    maxWidth: 'md' as NonNullable<ModalConfig['maxWidth']>,
    bgColor: '',
    textColor: '',
    autoDismissMs: 4000,
    allowHtml: false,
    imageUrl: '',
    targetingPages: '',
    targetingExcludePages: '',
    startDate: '',
    endDate: '',
  });

  let customConfig = $state<ModalConfig | undefined>(undefined);

  type StyleVariant = 'headless' | 'tailwind' | 'shadcn' | 'vanilla';
  type BuilderTab = 'content' | 'design' | 'behavior' | 'segmentation';
  const BUILDER_TABS: Array<{ id: BuilderTab; label: string }> = [
    { id: 'content', label: 'Contenido' },
    { id: 'design', label: 'Diseño' },
    { id: 'behavior', label: 'Comportamiento' },
    { id: 'segmentation', label: 'Segmentación' },
  ];

  // Default: 'shadcn' — mismo criterio que el playground de Media Picker (plan.md → Validation
  // Log, Sesión 1): abrir ya mostrando el tema con marca en vez del headless sin estilo.
  let styleVariant = $state<StyleVariant>('shadcn');
  let activeTab = $state<BuilderTab>('content');

  // Cambiar de variante solo intercambia el componente que renderiza — `modals` (el rune) y su
  // `customConfig`/`form` sobreviven al cambio, igual que `picker` en el playground de Media
  // Picker.
  const ActiveModalsRenderer = $derived(
    {
      headless: ModalsRendererHeadless,
      tailwind: ModalsRendererTailwind,
      shadcn: ModalsRendererShadcn,
      vanilla: ModalsRendererVanilla,
    }[styleVariant],
  );

  const provider = createDemoModalsProvider(
    (evt) => pushLog(`view: ${evt.modalId}`),
    (evt) => pushLog(`interaction: ${evt.modalId} (${evt.action})`),
    () => customConfig,
  );

  const modals = createModals(provider, { path: '/playground/modals' });

  function buildConfig(): ModalConfig {
    const config: ModalConfig = {
      id: CUSTOM_ID,
      type: form.type,
      message: form.message.trim(),
      trigger: {
        type: form.triggerType,
        value: needsTriggerValue(form.triggerType) ? form.triggerValue : undefined,
      },
      showCloseButton: form.showCloseButton,
      frequency: form.frequency,
      priority: form.priority,
    };
    if (form.title.trim()) config.title = form.title.trim();
    if (form.primaryButtonText.trim()) {
      config.primaryButton = {
        text: form.primaryButtonText.trim(),
        url: form.primaryButtonUrl.trim() || undefined,
      };
    }
    if (form.secondaryButtonText.trim()) {
      config.secondaryButton = {
        text: form.secondaryButtonText.trim(),
        url: form.secondaryButtonUrl.trim() || undefined,
      };
    }
    if (needsMaxWidth(form.type)) config.maxWidth = form.maxWidth;
    if (form.bgColor.trim()) config.bgColor = form.bgColor.trim();
    if (form.textColor.trim()) config.textColor = form.textColor.trim();
    if (form.type === 'toast') config.autoDismissMs = form.autoDismissMs;
    if (form.allowHtml) config.allowHtml = true;
    if (form.imageUrl.trim()) config.imageUrl = form.imageUrl.trim();
    const pages = splitList(form.targetingPages);
    const excludePages = splitList(form.targetingExcludePages);
    if (pages.length > 0 || excludePages.length > 0) {
      config.targeting = {
        pages: pages.length > 0 ? pages : undefined,
        excludePages: excludePages.length > 0 ? excludePages : undefined,
      };
    }
    if (form.startDate) config.startDate = new Date(form.startDate).toISOString();
    if (form.endDate) config.endDate = new Date(form.endDate).toISOString();
    return config;
  }

  async function saveAndShow(): Promise<void> {
    if (!form.message.trim()) return;
    customConfig = buildConfig();
    await modals.reload({ path: '/playground/modals' });
    // manual/click nunca se auto-programan (core/modals.ts) — hay que dispararlos a mano; el
    // resto (page-load/delay/scroll/exit-intent) ya quedó programado por el reload() de arriba.
    if (form.triggerType === 'manual') modals.show(CUSTOM_ID);
    else if (form.triggerType === 'click') modals.fireClick(CUSTOM_ID);
    pushLog(`preview guardado: type=${form.type} trigger=${form.triggerType}`);
  }

  function resetFrequency(): void {
    const key = `modals:shown:${CUSTOM_ID}`;
    try {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
      pushLog('Frecuencia reiniciada — el preview puede volver a mostrarse.');
    } catch {
      pushLog('No se pudo acceder a session/localStorage.');
    }
  }

  // Fixtures existentes — galería de referencia rápida, sin cambios de comportamiento.
  async function triggerFixture(id: string): Promise<void> {
    await modals.reload({ path: '/playground/modals' });
    modals.show(id);
  }
</script>

<a href="/">&larr; Volver al catálogo</a>

<h1>Playground: Modals</h1>
<p>
  Demo en vivo de <code>@modularcore/modals</code> con un <strong>provider de demo</strong> en
  memoria. Armá un overlay con las opciones reales del componente, guardalo y previsualizalo.
</p>

<div class="style-switcher">
  <label>
    Estilo del componente
    <ModernSelect
      bind:value={styleVariant}
      ariaLabel="Estilo del componente"
      options={[
        { value: 'headless', label: 'Sin estilo (headless)' },
        { value: 'tailwind', label: 'Tailwind' },
        { value: 'shadcn', label: 'Shadcn' },
        { value: 'vanilla', label: 'CSS plano' },
      ]}
    />
  </label>
  <small>
    La descarga del componente (<code>modularcore add modals</code> o el tarball del catálogo)
    incluye las 3 variantes con estilo + la headless — este selector solo cambia el preview en
    vivo. Usá los imports de <code>ui/svelte/{'{'}tailwind,shadcn,vanilla{'}'}</code> según cuál
    prefieras en tu proyecto.
  </small>
</div>

<h2>Constructor de overlay</h2>
<p>
  <small>
    El tipo (<code>type</code>) es la "ubicación": modal centrado, fullscreen, banner arriba/abajo,
    panel lateral o toast. La frecuencia se persiste en <code>sessionStorage</code>/
    <code>localStorage</code> reales — un F5 del navegador la respeta de verdad, sin necesidad de
    simular nada.
  </small>
</p>

<form class="builder" onsubmit={(event) => event.preventDefault()}>
  <div class="builder-tabs" aria-label="Secciones del configurador" role="tablist">
    {#each BUILDER_TABS as tab (tab.id)}
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === tab.id}
        class:active={activeTab === tab.id}
        onclick={() => (activeTab = tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  {#if activeTab === 'content'}
    <div class="tab-panel" role="tabpanel">
      <fieldset>
        <legend>Básicos</legend>
        <label>
          Tipo (ubicación)
          <ModernSelect bind:value={form.type} options={OVERLAY_TYPES.map((type) => ({ value: type, label: type }))} ariaLabel="Tipo de overlay" />
        </label>
        <label>
          Título
          <input type="text" bind:value={form.title} />
        </label>
        <label class="full">
          Mensaje *
          <textarea rows="2" bind:value={form.message} required></textarea>
        </label>
        <label class="checkbox">
          <input type="checkbox" bind:checked={form.showCloseButton} />
          Mostrar botón de cerrar
        </label>
      </fieldset>

      <fieldset>
        <legend>Botones</legend>
        <label>
          Botón primario - texto
          <input type="text" bind:value={form.primaryButtonText} />
        </label>
        <label>
          Botón primario - URL
          <input type="text" bind:value={form.primaryButtonUrl} placeholder="https://…" />
        </label>
        <label>
          Botón secundario - texto
          <input type="text" bind:value={form.secondaryButtonText} />
        </label>
        <label>
          Botón secundario - URL
          <input type="text" bind:value={form.secondaryButtonUrl} placeholder="https://…" />
        </label>
        <label>
          URL de imagen
          <input type="text" bind:value={form.imageUrl} placeholder="https://…" />
        </label>
        <label class="checkbox">
          <input type="checkbox" bind:checked={form.allowHtml} />
          Permitir HTML en el mensaje
        </label>
      </fieldset>
    </div>
  {:else if activeTab === 'design'}
    <div class="tab-panel" role="tabpanel">
      <fieldset>
        <legend>Diseño</legend>
        {#if needsMaxWidth(form.type)}
          <label>
            Ancho máximo
            <ModernSelect bind:value={form.maxWidth} options={MAX_WIDTHS.map((width) => ({ value: width, label: width }))} ariaLabel="Ancho máximo" />
          </label>
        {/if}
        <label>
          Color de fondo
          <input type="text" bind:value={form.bgColor} placeholder="#111827 / rgb(17,24,39)" />
        </label>
        <label>
          Color de texto
          <input type="text" bind:value={form.textColor} placeholder="#ffffff" />
        </label>
        {#if form.type === 'toast'}
          <label>
            Auto-cierre (ms)
            <input type="number" min="0" bind:value={form.autoDismissMs} />
          </label>
        {/if}
      </fieldset>
    </div>
  {:else if activeTab === 'behavior'}
    <div class="tab-panel" role="tabpanel">
      <fieldset>
        <legend>Comportamiento</legend>
        <label>
          Trigger
          <ModernSelect bind:value={form.triggerType} options={TRIGGER_TYPES.map((type) => ({ value: type, label: type }))} ariaLabel="Trigger" />
        </label>
        {#if needsTriggerValue(form.triggerType)}
          <label>
            {form.triggerType === 'delay' ? 'Delay (ms)' : 'Scroll (% de la página)'}
            <input type="number" min="0" bind:value={form.triggerValue} />
          </label>
        {/if}
        <label>
          Frecuencia
          <ModernSelect bind:value={form.frequency} options={FREQUENCIES.map((frequency) => ({ value: frequency, label: frequency }))} ariaLabel="Frecuencia" />
        </label>
        <label>
          Prioridad (para el slot compartido)
          <input type="number" bind:value={form.priority} />
        </label>
      </fieldset>
    </div>
  {:else}
    <div class="tab-panel" role="tabpanel">
      <fieldset>
        <legend>Segmentación</legend>
        <label class="full">
          Mostrar solo en rutas (separadas por coma)
          <input type="text" bind:value={form.targetingPages} placeholder="/, /blog" />
        </label>
        <label class="full">
          Excluir rutas (separadas por coma)
          <input type="text" bind:value={form.targetingExcludePages} placeholder="/checkout" />
        </label>
        <label>
          Desde
          <input type="datetime-local" bind:value={form.startDate} />
        </label>
        <label>
          Hasta
          <input type="datetime-local" bind:value={form.endDate} />
        </label>
      </fieldset>
    </div>
  {/if}

  <div class="actions">
    <button type="button" onclick={saveAndShow} disabled={!form.message.trim()}>
      Guardar y mostrar
    </button>
    <button type="button" onclick={resetFrequency}>Reiniciar frecuencia</button>
  </div>
</form>

<h2>Ejemplos rápidos</h2>
<div class="triggers">
  <button type="button" onclick={() => triggerFixture('demo-modal')}>Modal</button>
  <button type="button" onclick={() => triggerFixture('demo-fullscreen')}>Fullscreen</button>
  <button type="button" onclick={() => triggerFixture('demo-top-banner')}>Top banner</button>
  <button type="button" onclick={() => triggerFixture('demo-bottom-banner')}>Bottom banner</button>
  <button type="button" onclick={() => triggerFixture('demo-slide-in')}>Slide-in</button>
  <button type="button" onclick={() => triggerFixture('demo-toast')}>Toast</button>
</div>

<h2>Eventos de tracking</h2>
<p><small>Emitidos por <code>trackView</code>/<code>trackInteraction</code> del provider de demo.</small></p>
<ul class="log">
  {#each log as line (line)}
    <li>{line}</li>
  {:else}
    <li><em>Sin eventos todavía — probá un botón arriba.</em></li>
  {/each}
</ul>

<ActiveModalsRenderer state={modals.state} ondismiss={(id, action) => modals.dismiss(id, action)} />

<style>
  :global(body) {
    --builder-ink: hsl(var(--foreground));
    --builder-muted: hsl(var(--muted-foreground));
    --builder-border: hsl(var(--border));
    --builder-border-strong: hsl(var(--input));
    --builder-surface: hsl(var(--card));
    --builder-subtle: hsl(var(--muted));
    --builder-accent: hsl(var(--primary));
    --builder-accent-foreground: hsl(var(--primary-foreground));
    --builder-radius: 0.625rem;
  }

  h1,
  h2 {
    color: var(--builder-ink);
    letter-spacing: -0.02em;
  }

  h2 {
    margin-top: 2.5rem;
    margin-bottom: 0.75rem;
  }

  p {
    max-width: 72ch;
  }

  .style-switcher {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 2rem 0 2.25rem;
    padding: 1rem 1.125rem;
    border: 1px solid var(--builder-border);
    border-radius: var(--builder-radius);
    background: var(--builder-surface);
    box-shadow: 0 4px 14px hsl(222 47% 11% / 0.05);
  }

  .style-switcher label {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
    color: var(--builder-ink);
    font-size: 0.875rem;
    font-weight: 650;
  }

  .style-switcher small {
    max-width: 78ch;
    color: var(--builder-muted);
    line-height: 1.5;
  }

  .builder {
    display: flex;
    flex-direction: column;
    gap: 0;
    max-width: 60rem;
    padding: 0 1.5rem;
    border: 1px solid var(--builder-border);
    border-radius: var(--builder-radius);
    background: var(--builder-surface);
    box-shadow: 0 8px 24px hsl(222 47% 11% / 0.06);
    margin-bottom: 2rem;
  }

  .builder-tabs {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.25rem;
    margin: 1rem 0 0;
    padding: 0.25rem;
    border-radius: 0.5rem;
    background: var(--builder-subtle);
  }

  .builder-tabs button {
    min-height: 2.5rem;
    padding: 0.5rem 0.75rem;
    border-color: transparent;
    background: transparent;
    color: var(--builder-muted);
    font-size: 0.8125rem;
    font-weight: 650;
  }

  .builder-tabs button:hover:not(:disabled) {
    border-color: transparent;
    background: hsl(var(--background) / 0.65);
    color: var(--builder-ink);
    transform: none;
  }

  .builder-tabs button.active,
  .builder-tabs button.active:hover {
    border-color: var(--builder-border);
    background: var(--builder-surface);
    color: var(--builder-ink);
    box-shadow: 0 1px 2px hsl(222 47% 11% / 0.08);
  }

  .tab-panel {
    display: contents;
  }

  fieldset {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 1rem;
    min-width: 0;
    margin: 0;
    padding: 1.5rem 0;
    border: 0;
    border-top: 1px solid var(--builder-border);
    border-radius: 0;
    background: transparent;
  }

  fieldset:first-child {
    border-top: 0;
  }

  legend {
    padding: 0 0.5rem;
    color: var(--builder-ink);
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.01em;
  }

  label {
    display: flex;
    grid-column: span 4;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 0;
    color: var(--builder-ink);
    font-size: 0.8125rem;
    font-weight: 600;
  }

  label.full {
    grid-column: 1 / -1;
  }

  label.checkbox {
    grid-column: 1 / -1;
    flex-direction: row;
    align-items: center;
    gap: 0.625rem;
    padding-top: 0.125rem;
    color: var(--builder-muted);
    font-weight: 500;
  }

  input,
  textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--builder-border-strong);
    border-radius: 0.5rem;
    background: var(--builder-surface);
    color: var(--builder-ink);
    font: inherit;
    font-size: 0.9375rem;
    line-height: 1.4;
    transition: border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease;
  }

  input {
    min-height: 2.75rem;
    padding: 0.625rem 0.75rem;
  }

  textarea {
    min-height: 5.5rem;
    resize: vertical;
    padding: 0.75rem;
  }

  input::placeholder,
  textarea::placeholder {
    color: var(--builder-muted);
    opacity: 0.8;
  }

  input:hover,
  textarea:hover {
    border-color: var(--builder-accent);
  }

  input:focus-visible,
  textarea:focus-visible {
    outline: 2px solid var(--builder-accent);
    outline-offset: 2px;
    border-color: var(--builder-accent);
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.14);
  }

  input[type='checkbox'] {
    width: 1rem;
    min-height: 1rem;
    accent-color: var(--builder-accent);
  }

  .actions,
  .triggers {
    display: flex;
    flex-wrap: wrap;
    gap: 0.625rem;
  }

  .actions {
    margin: 0;
    padding: 1rem 0 1.5rem;
    border-top: 1px solid var(--builder-border);
  }

  button {
    min-height: 2.75rem;
    padding: 0.625rem 0.875rem;
    border: 1px solid var(--builder-border-strong);
    border-radius: 0.5rem;
    background: var(--builder-surface);
    color: var(--builder-ink);
    cursor: pointer;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 650;
    transition: transform 150ms ease, border-color 150ms ease, background-color 150ms ease;
  }

  button:hover:not(:disabled) {
    border-color: var(--builder-accent);
    background: var(--builder-subtle);
    transform: translateY(-1px);
  }

  button:active:not(:disabled) {
    transform: translateY(1px);
  }

  button:focus-visible {
    outline: 2px solid var(--builder-accent);
    outline-offset: 2px;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .actions button:first-child {
    border-color: var(--builder-accent);
    background: var(--builder-accent);
    color: var(--builder-accent-foreground);
  }

  .actions button:first-child:hover:not(:disabled) {
    background: hsl(var(--accent-foreground));
  }

  .triggers {
    margin-bottom: 1.5rem;
  }

  .triggers button {
    min-height: 2.5rem;
    background: var(--builder-subtle);
  }

  .log {
    max-height: 12rem;
    margin: 0;
    padding: 0.75rem 1rem 0.75rem 2.25rem;
    overflow-y: auto;
    border: 1px solid var(--builder-border);
    border-radius: var(--builder-radius);
    background: hsl(var(--muted) / 0.45);
    color: var(--builder-muted);
    font-family: var(--mc-font-mono);
    font-size: 0.8125rem;
  }

  @media (max-width: 700px) {
    .style-switcher label {
      align-items: stretch;
      flex-direction: column;
    }

    fieldset {
      grid-template-columns: 1fr;
      padding: 1.25rem 0;
    }

    .builder {
      padding: 0 1rem;
    }

    .builder-tabs {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    label,
    label.full,
    label.checkbox {
      grid-column: 1 / -1;
    }

    .actions button {
      flex: 1 1 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    input,
    textarea,
    button {
      transition: none;
    }
  }
</style>
