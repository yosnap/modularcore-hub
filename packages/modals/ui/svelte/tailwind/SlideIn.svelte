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
  class="modals-slide-in{noMotionClass} fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:right-4 sm:max-w-sm rounded-lg bg-white shadow-xl{transitionClass}"
>
  <OverlayBody {config} {ondismiss} />
</div>
