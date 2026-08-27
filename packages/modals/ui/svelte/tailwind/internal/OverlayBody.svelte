<script lang="ts">
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

  // `maxWidthClass` (safe/style.ts) is the single source of truth for which enum value is
  // "valid" — it returns package-scoped tokens (`modals-max-w-*`), not real utility classes, so
  // every UI variant maps those tokens onto its own visual vocabulary here. Tailwind's map is a
  // 1:1 translation, never a re-derivation of the enum itself.
  const TAILWIND_MAX_WIDTH: Record<string, string> = {
    'modals-max-w-sm': 'max-w-sm',
    'modals-max-w-md': 'max-w-md',
    'modals-max-w-lg': 'max-w-lg',
    'modals-max-w-xl': 'max-w-xl',
    'modals-max-w-2xl': 'max-w-2xl',
    'modals-max-w-full': 'max-w-full',
  };
  const maxWidth = $derived(TAILWIND_MAX_WIDTH[maxWidthClass(config.maxWidth)] ?? '');
</script>

<div
  class="modals-body relative w-full {maxWidth} rounded-lg p-6 {!bgColor ? 'bg-white' : ''} {!textColor
    ? 'text-zinc-900'
    : ''} {extraClass}"
  style:background-color={bgColor}
  style:color={textColor}
>
  {#if showClose}
    <button
      type="button"
      class="modals-close absolute right-3 top-3 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
      aria-label="Close"
      onclick={() => ondismiss('close-button')}
    >
      ×
    </button>
  {/if}
  {#if imageSrc}
    <img class="modals-image mb-4 w-full rounded-md" src={imageSrc} alt="" referrerpolicy="no-referrer" />
  {/if}
  {#if config.title}
    <h2 class="modals-title mb-2 pr-6 text-lg font-semibold leading-tight">{config.title}</h2>
  {/if}
  {#if message.html}
    <div class="modals-message mb-4 text-sm leading-relaxed text-zinc-600">{@html message.html}</div>
  {:else}
    <p class="modals-message mb-4 text-sm leading-relaxed text-zinc-600">{message.text}</p>
  {/if}
  {#if config.primaryButton || config.secondaryButton}
    <div class="modals-actions flex flex-wrap items-center gap-2">
      {#if config.primaryButton}
        {#if primaryHref}
          <a
            class="modals-button modals-button--primary rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
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
            class="modals-button modals-button--primary rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            onclick={() => ondismiss('primary-button')}
          >
            {config.primaryButton.text}
          </button>
        {/if}
      {/if}
      {#if config.secondaryButton}
        {#if secondaryHref}
          <a
            class="modals-button modals-button--secondary rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
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
            class="modals-button modals-button--secondary rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            onclick={() => ondismiss('secondary-button')}
          >
            {config.secondaryButton.text}
          </button>
        {/if}
      {/if}
    </div>
  {/if}
</div>
