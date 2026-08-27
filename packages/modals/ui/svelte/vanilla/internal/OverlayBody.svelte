<script lang="ts">
  import '../../../vanilla-styles.css';
  import { safeMessage } from '../../../safe/message.js';
  import { safeColor, maxWidthClass } from '../../../safe/style.js';
  import { safeHref, safeImageSrc } from '../../../safe/url.js';

  import type { InteractionAction, ModalConfig } from '../../../../core/types.js';

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
  const message = $derived(safeMessage(config));
</script>

<div
  class="modals-body mc-modals-body {maxWidthClass(config.maxWidth)} {extraClass}"
  style:background-color={bgColor}
  style:color={textColor}
>
  {#if showClose}
    <button
      type="button"
      class="modals-close mc-modals-close"
      aria-label="Close"
      onclick={() => ondismiss('close-button')}
    >
      ×
    </button>
  {/if}
  {#if imageSrc}
    <img class="modals-image mc-modals-image" src={imageSrc} alt="" referrerpolicy="no-referrer" />
  {/if}
  {#if config.title}
    <h2 class="modals-title mc-modals-title">{config.title}</h2>
  {/if}
  {#if message.html}
    <div class="modals-message mc-modals-message">{@html message.html}</div>
  {:else}
    <p class="modals-message mc-modals-message">{message.text}</p>
  {/if}
  {#if config.primaryButton || config.secondaryButton}
    <div class="modals-actions mc-modals-actions">
      {#if config.primaryButton}
        {#if primaryHref}
          <a
            class="modals-button modals-button--primary mc-modals-button mc-modals-button--primary"
            href={primaryHref}
            rel="noopener noreferrer"
            target="_blank"
            onclick={() => ondismiss('primary-button')}
          >
            {config.primaryButton.text}
          </a>
        {:else}
          <button
            type="button"
            class="modals-button modals-button--primary mc-modals-button mc-modals-button--primary"
            onclick={() => ondismiss('primary-button')}
          >
            {config.primaryButton.text}
          </button>
        {/if}
      {/if}
      {#if config.secondaryButton}
        {#if secondaryHref}
          <a
            class="modals-button modals-button--secondary mc-modals-button mc-modals-button--secondary"
            href={secondaryHref}
            rel="noopener noreferrer"
            target="_blank"
            onclick={() => ondismiss('secondary-button')}
          >
            {config.secondaryButton.text}
          </a>
        {:else}
          <button
            type="button"
            class="modals-button modals-button--secondary mc-modals-button mc-modals-button--secondary"
            onclick={() => ondismiss('secondary-button')}
          >
            {config.secondaryButton.text}
          </button>
        {/if}
      {/if}
    </div>
  {/if}
</div>
