<script lang="ts">
  import BottomBanner from './BottomBanner.svelte';
  import FullscreenOverlay from './FullscreenOverlay.svelte';
  import ModalOverlay from './ModalOverlay.svelte';
  import SlideIn from './SlideIn.svelte';
  import Toast from './Toast.svelte';
  import TopBanner from './TopBanner.svelte';

  import type { OverlaysState } from '../../../core/modals.js';
  import type { InteractionAction } from '../../../core/types.js';

  let {
    state,
    ondismiss,
  }: {
    state: OverlaysState;
    ondismiss: (id: string, action?: InteractionAction) => void;
  } = $props();
</script>

{#if state.active.modal}
  {#if state.active.modal.type === 'fullscreen'}
    <FullscreenOverlay config={state.active.modal} ondismiss={(action) => ondismiss(state.active.modal!.id, action)} />
  {:else}
    <ModalOverlay config={state.active.modal} ondismiss={(action) => ondismiss(state.active.modal!.id, action)} />
  {/if}
{/if}

{#if state.active['top-banner']}
  <TopBanner config={state.active['top-banner']} ondismiss={(action) => ondismiss(state.active['top-banner']!.id, action)} />
{/if}

{#if state.active['bottom-banner']}
  <BottomBanner
    config={state.active['bottom-banner']}
    ondismiss={(action) => ondismiss(state.active['bottom-banner']!.id, action)}
  />
{/if}

{#if state.active['slide-in']}
  <SlideIn config={state.active['slide-in']} ondismiss={(action) => ondismiss(state.active['slide-in']!.id, action)} />
{/if}

{#if state.toasts.length > 0}
  <div class="modals-toast-stack fixed bottom-4 right-4 z-50 flex flex-col gap-2">
    {#each state.toasts as toast (toast.id)}
      <Toast config={toast} ondismiss={(action) => ondismiss(toast.id, action)} />
    {/each}
  </div>
{/if}
