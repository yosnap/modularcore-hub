<script lang="ts">
  import { createFocusTrap } from '../../a11y/focus-trap.js';
  import { prefersReducedMotion } from '../../a11y/reduced-motion.js';
  import OverlayBody from './internal/OverlayBody.svelte';

  import type { InteractionAction, ModalConfig } from '../../../core/types.js';

  let {
    config,
    ondismiss,
  }: {
    config: ModalConfig;
    ondismiss: (action: InteractionAction) => void;
  } = $props();

  let dialogEl: HTMLDivElement | undefined = $state();

  $effect(() => {
    // Reading `config.id` makes it a tracked dependency, so this effect re-runs (deactivating
    // and re-activating the trap) when a different config swaps into the same slot and Svelte
    // reuses this component instance (Code Review Finding) — without it, only `dialogEl` was
    // tracked and a same-type slot swap never moved focus into the new dialog's content.
    void config.id;
    if (!dialogEl) return;
    const trap = createFocusTrap(dialogEl);
    trap.activate();
    return () => trap.deactivate();
  });

  $effect(() => {
    function onKeydown(event: KeyboardEvent): void {
      if (event.key === 'Escape') ondismiss('close-button');
    }
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  });

  function onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) ondismiss('outside-click');
  }

  const noMotionClass = $derived(prefersReducedMotion() ? ' modals-no-motion' : '');
  const transitionClass = $derived(prefersReducedMotion() ? '' : ' transition-opacity duration-150');
</script>

<div
  class="modals-backdrop{noMotionClass} fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4{transitionClass}"
  role="presentation"
  onclick={onBackdropClick}
>
  <div
    bind:this={dialogEl}
    role="dialog"
    aria-modal="true"
    aria-label={config.title ?? config.name ?? 'Dialog'}
    class="modals-modal{noMotionClass} w-full overflow-y-auto rounded-lg border border-border bg-background text-foreground shadow-xl{transitionClass}"
    style="max-height: calc(100vh - 2rem)"
  >
    <OverlayBody {config} {ondismiss} />
  </div>
</div>
