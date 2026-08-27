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
  const transitionClass = $derived(prefersReducedMotion() ? '' : ' transition-transform duration-150');
</script>

<div
  role="region"
  aria-live="polite"
  class="modals-top-banner{noMotionClass} fixed left-0 right-0 top-0 z-50 border-b border-border bg-card text-card-foreground shadow-sm{transitionClass}"
>
  <OverlayBody {config} {ondismiss} />
</div>
