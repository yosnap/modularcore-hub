<script lang="ts">
  import '../../vanilla-styles.css';
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
</script>

<div role="region" aria-live="polite" class="modals-bottom-banner mc-modals-bottom-banner{noMotionClass}">
  <OverlayBody {config} {ondismiss} />
</div>
