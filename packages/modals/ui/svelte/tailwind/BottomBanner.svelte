<script lang="ts">
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

  $effect(() => {
    function onKeydown(event: KeyboardEvent): void {
      if (event.key === 'Escape') ondismiss('close-button');
    }
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  });

  const noMotionClass = $derived(prefersReducedMotion() ? ' modals-no-motion' : '');
  const transitionClass = $derived(prefersReducedMotion() ? '' : ' transition-transform duration-200');
</script>

<div
  role="region"
  aria-live="polite"
  class="modals-bottom-banner{noMotionClass} fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.1)]{transitionClass}"
>
  <OverlayBody {config} {ondismiss} class="mx-auto max-w-4xl p-4" />
</div>
