<script lang="ts">
  import { createModals } from '@modularcore/modals/svelte';
  import ModalsRenderer from '@modularcore/modals/ui/svelte/ModalsRenderer.svelte';

  import { createDemoModalsProvider } from '$lib/demo-modals-provider';

  let log = $state<string[]>([]);

  function pushLog(line: string): void {
    log = [`${new Date().toLocaleTimeString()} — ${line}`, ...log].slice(0, 20);
  }

  const provider = createDemoModalsProvider(
    (evt) => pushLog(`view: ${evt.modalId}`),
    (evt) => pushLog(`interaction: ${evt.modalId} (${evt.action})`),
  );

  // `manual` is the only trigger used by the demo fixtures — see demo-modals-provider.ts — so
  // every button below re-`reload()`s first. That resets the manager's per-load idempotency
  // guard (core/modals.ts) letting the SAME fixture id be shown again on a second click, since
  // none of the demo fixtures set a `frequency` stricter than the default 'always'.
  const modals = createModals(provider, { path: '/playground/modals' });

  async function trigger(id: string): Promise<void> {
    await modals.reload({ path: '/playground/modals' });
    modals.show(id);
  }
</script>

<a href="/">&larr; Volver al catálogo</a>

<h1>Playground: Modals</h1>
<p>
  Demo en vivo de <code>@modularcore/modals</code> con un <strong>provider de demo</strong> en
  memoria (<code>createDemoModalsProvider</code>): fixtures estáticos, sin backend real. Todos
  usan <code>trigger: manual</code> — en una app real usarías <code>delay</code>/<code>scroll</code>/
  <code>exit-intent</code> para disparo automático.
</p>

<h2>Disparar cada tipo de overlay</h2>
<div class="triggers">
  <button type="button" onclick={() => trigger('demo-modal')}>Modal</button>
  <button type="button" onclick={() => trigger('demo-fullscreen')}>Fullscreen</button>
  <button type="button" onclick={() => trigger('demo-top-banner')}>Top banner</button>
  <button type="button" onclick={() => trigger('demo-bottom-banner')}>Bottom banner</button>
  <button type="button" onclick={() => trigger('demo-slide-in')}>Slide-in</button>
  <button type="button" onclick={() => trigger('demo-toast')}>Toast</button>
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

<ModalsRenderer state={modals.state} ondismiss={(id, action) => modals.dismiss(id, action)} />

<style>
  .triggers {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }
  .log {
    font-family: monospace;
    font-size: 0.85rem;
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 0.5rem 1rem;
  }
</style>
