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
  /* Theme-aware via the app's semantic tokens (hsl(var(--*))) so the control is correct in both
     light and dark — previously it used undefined --mc-surface/--mc-border custom props that fell
     back to hard-coded light values, rendering a white box in dark mode. */
  :global(.modern-select-trigger) {
    display: inline-flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    border: 1px solid hsl(var(--border));
    border-radius: 0.6rem;
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    padding: 0.625rem 0.75rem;
    font: inherit;
    font-size: 0.875rem;
    line-height: 1.25rem;
    text-align: left;
    transition:
      border-color 140ms ease,
      box-shadow 140ms ease;
  }

  :global(.modern-select-trigger:hover) {
    border-color: hsl(var(--primary));
  }
  :global(.modern-select-trigger:focus-visible) {
    outline: none;
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.22);
  }
  :global(.modern-select-trigger:disabled) {
    cursor: not-allowed;
    opacity: 0.55;
  }
  :global(.modern-select-chevron) {
    color: hsl(var(--muted-foreground));
    font-size: 1rem;
    line-height: 1;
  }

  :global(.modern-select-content) {
    z-index: 50;
    min-width: var(--bits-select-anchor-width);
    overflow: hidden;
    border: 1px solid hsl(var(--border));
    border-radius: 0.7rem;
    background: hsl(var(--popover));
    padding: 0.3rem;
    box-shadow: 0 16px 40px rgb(0 0 0 / 0.3);
  }

  :global(.modern-select-item) {
    display: flex;
    cursor: pointer;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border-radius: 0.45rem;
    padding: 0.55rem 0.65rem;
    color: hsl(var(--popover-foreground));
    font-size: 0.875rem;
    outline: none;
  }
  :global(.modern-select-item[data-highlighted]) {
    background: hsl(var(--primary) / 0.14);
    color: hsl(var(--primary));
  }
  :global(.modern-select-item[data-disabled]) {
    cursor: not-allowed;
    opacity: 0.45;
  }
</style>
