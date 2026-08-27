<script lang="ts">
  import { Select } from 'bits-ui';

  export type SelectOption = {
    value: string;
    label: string;
    disabled?: boolean;
  };

  let {
    value = $bindable(''),
    options,
    placeholder = 'Seleccionar…',
    ariaLabel,
    disabled = false,
    onchange,
  }: {
    value?: string;
    options: SelectOption[];
    placeholder?: string;
    ariaLabel?: string;
    disabled?: boolean;
    onchange?: (value: string) => void;
  } = $props();

  const bitsItems = $derived(options.map(({ value, label, disabled }) => ({ value, label, disabled })));
</script>

<Select.Root type="single" {value} {disabled} items={bitsItems} onValueChange={(next) => { value = next; onchange?.(next); }}>
  <Select.Trigger
    class="modern-select-trigger"
    aria-label={ariaLabel}
  >
    <Select.Value {placeholder} />
    <span class="modern-select-chevron" aria-hidden="true">⌄</span>
  </Select.Trigger>
  <Select.Content class="modern-select-content" sideOffset={6}>
    <Select.Viewport>
      {#each options as option (option.value)}
        <Select.Item
          value={option.value}
          label={option.label}
          disabled={option.disabled}
          class="modern-select-item"
        >
          {option.label}
        </Select.Item>
      {/each}
    </Select.Viewport>
  </Select.Content>
</Select.Root>

<style>
  :global(.modern-select-trigger) {
    display: inline-flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    border: 1px solid var(--mc-border, #d7dce5);
    border-radius: 0.5rem;
    background: var(--mc-surface, #fff);
    color: var(--mc-text, #182230);
    padding: 0.625rem 0.75rem;
    font: inherit;
    font-size: 0.875rem;
    line-height: 1.25rem;
    text-align: left;
    transition: border-color 140ms ease, box-shadow 140ms ease;
  }

  :global(.modern-select-trigger:hover) { border-color: var(--mc-primary, #6366f1); }
  :global(.modern-select-trigger:focus-visible) {
    outline: none;
    border-color: var(--mc-primary, #6366f1);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--mc-primary, #6366f1) 18%, transparent);
  }
  :global(.modern-select-trigger:disabled) { cursor: not-allowed; opacity: 0.55; }
  :global(.modern-select-chevron) { color: var(--mc-muted, #6b7280); font-size: 1rem; line-height: 1; }

  :global(.modern-select-content) {
    z-index: 50;
    min-width: var(--bits-select-anchor-width);
    overflow: hidden;
    border: 1px solid var(--mc-border, #d7dce5);
    border-radius: 0.625rem;
    background: var(--mc-surface, #fff);
    padding: 0.3rem;
    box-shadow: 0 16px 40px rgb(15 23 42 / 0.14);
  }

  :global(.modern-select-item) {
    display: flex;
    cursor: pointer;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border-radius: 0.4rem;
    padding: 0.55rem 0.65rem;
    color: var(--mc-text, #182230);
    font-size: 0.875rem;
    outline: none;
  }
  :global(.modern-select-item[data-highlighted]) { background: var(--mc-primary-soft, #eef2ff); color: var(--mc-primary-strong, #4338ca); }
  :global(.modern-select-item[data-disabled]) { cursor: not-allowed; opacity: 0.45; }
</style>
