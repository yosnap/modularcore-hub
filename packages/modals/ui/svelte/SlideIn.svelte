<script lang="ts">
  import OverlayBody from './internal/OverlayBody.svelte';

  import type { InteractionAction, ModalConfig } from '../../core/types.js';

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
</script>

<div role="region" aria-live="polite" class="modals-slide-in">
  <OverlayBody {config} {ondismiss} />
</div>
