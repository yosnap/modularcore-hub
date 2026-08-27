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
  class="modals-slide-in{noMotionClass} fixed bottom-4 left-4 right-4 z-50 rounded-lg border border-border bg-background text-foreground shadow-xl sm:left-auto sm:right-4 sm:w-96{transitionClass}"
>
  <OverlayBody {config} {ondismiss} />
</div>
