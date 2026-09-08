<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  import { mountTurnstileWidget, TurnstileController } from '../../core/turnstile.js';

  let {
    siteKey,
    theme,
    mode,
    onToken,
  }: {
    siteKey?: string;
    theme?: 'light' | 'dark' | 'auto';
    mode?: 'managed' | 'non-interactive' | 'invisible';
    onToken: (token: string | null) => void;
  } = $props();

  const controller = new TurnstileController({ siteKey, theme, mode });
  let container: HTMLDivElement | undefined = $state();
  let unmountWidget: (() => void) | undefined;

  const unsubscribe = controller.subscribe((state) => onToken(state.token));

  onMount(() => {
    if (container) unmountWidget = mountTurnstileWidget(container, controller);
  });

  onDestroy(() => {
    unsubscribe();
    unmountWidget?.();
  });
</script>

{#if siteKey}
  <div bind:this={container}></div>
{/if}
