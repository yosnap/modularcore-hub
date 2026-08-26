<script lang="ts">
  import { renderMarkdownToHtml } from '@modularcore/ai-chat/markdown';

  import { safeColor } from '../../safe/style.js';
  import { safeHref, safeImageSrc } from '../../safe/url.js';

  import type { InteractionAction, ModalConfig } from '../../../core/types.js';

  let {
    config,
    ondismiss,
    class: extraClass = '',
  }: {
    config: ModalConfig;
    ondismiss: (action: InteractionAction) => void;
    class?: string;
  } = $props();

  const imageSrc = $derived(safeImageSrc(config.imageUrl));
  const primaryHref = $derived(safeHref(config.primaryButton?.url));
  const secondaryHref = $derived(safeHref(config.secondaryButton?.url));
  const bgColor = $derived(safeColor(config.bgColor));
  const textColor = $derived(safeColor(config.textColor));
  const showClose = $derived(config.showCloseButton ?? true);
  const messageHtml = $derived(config.allowHtml ? renderMarkdownToHtml(config.message) : undefined);
</script>

<div
  class="modals-body modals-max-w-{config.maxWidth ?? 'md'} {extraClass}"
  style:background-color={bgColor}
  style:color={textColor}
>
  {#if showClose}
    <button type="button" class="modals-close" aria-label="Close" onclick={() => ondismiss('close-button')}>×</button>
  {/if}
  {#if imageSrc}
    <img class="modals-image" src={imageSrc} alt="" referrerpolicy="no-referrer" />
  {/if}
  {#if config.title}
    <h2 class="modals-title">{config.title}</h2>
  {/if}
  {#if messageHtml}
    <div class="modals-message">{@html messageHtml}</div>
  {:else}
    <p class="modals-message">{config.message}</p>
  {/if}
  {#if config.primaryButton || config.secondaryButton}
    <div class="modals-actions">
      {#if config.primaryButton}
        {#if primaryHref}
          <a
            class="modals-button modals-button--primary"
            href={primaryHref}
            rel="noopener noreferrer"
            target="_blank"
            onclick={() => ondismiss('primary-button')}
          >
            {config.primaryButton.text}
          </a>
        {:else}
          <button type="button" class="modals-button modals-button--primary" onclick={() => ondismiss('primary-button')}>
            {config.primaryButton.text}
          </button>
        {/if}
      {/if}
      {#if config.secondaryButton}
        {#if secondaryHref}
          <a
            class="modals-button modals-button--secondary"
            href={secondaryHref}
            rel="noopener noreferrer"
            target="_blank"
            onclick={() => ondismiss('secondary-button')}
          >
            {config.secondaryButton.text}
          </a>
        {:else}
          <button type="button" class="modals-button modals-button--secondary" onclick={() => ondismiss('secondary-button')}>
            {config.secondaryButton.text}
          </button>
        {/if}
      {/if}
    </div>
  {/if}
</div>
