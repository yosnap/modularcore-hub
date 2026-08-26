<script lang="ts">
  import OverlayBody from './internal/OverlayBody.svelte';

  import type { InteractionAction, ModalConfig } from '../../core/types.js';

  const DEFAULT_AUTO_DISMISS_MS = 5000;

  let {
    config,
    ondismiss,
  }: {
    config: ModalConfig;
    ondismiss: (action: InteractionAction) => void;
  } = $props();

  // Re-arms only when the toast identity changes; `ondismiss` is idempotent (core/modals.ts), so a
  // stale timer firing right after a manual close is a safe no-op.
  $effect(() => {
    const ms = config.autoDismissMs ?? DEFAULT_AUTO_DISMISS_MS;
    const timer = setTimeout(() => ondismiss('close-button'), ms);
    return () => clearTimeout(timer);
  });
</script>

<div role="status" aria-live="polite" class="modals-toast">
  <OverlayBody {config} {ondismiss} />
</div>
