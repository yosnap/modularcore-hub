<script lang="ts">
  import { createFocusTrap } from '../a11y/focus-trap.js';
  import { prefersReducedMotion } from '../a11y/reduced-motion.js';
  import OverlayBody from './internal/OverlayBody.svelte';

  import type { InteractionAction, ModalConfig } from '../../core/types.js';

  let {
    config,
    ondismiss,
  }: {
    config: ModalConfig;
    ondismiss: (action: InteractionAction) => void;
  } = $props();

  let dialogEl: HTMLDivElement | undefined = $state();

  $effect(() => {
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

  const noMotionClass = $derived(prefersReducedMotion() ? ' modals-no-motion' : '');
</script>

<div bind:this={dialogEl} role="dialog" aria-modal="true" aria-label={config.title ?? config.name ?? 'Dialog'} class="modals-fullscreen{noMotionClass}">
  <OverlayBody {config} {ondismiss} />
</div>
