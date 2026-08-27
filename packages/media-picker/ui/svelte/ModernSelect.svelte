<script lang="ts">
  import { Select } from 'bits-ui';

  export type SelectOption = { value: string; label: string; disabled?: boolean };

  let {
    value = $bindable(''),
    options,
    placeholder = 'Seleccionar…',
    disabled = false,
    name,
  }: {
    value?: string;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    name?: string;
  } = $props();

  const items = $derived(options.map(({ value, label, disabled }) => ({ value, label, disabled })));
</script>

<Select.Root type="single" {value} {disabled} {name} {items} onValueChange={(next) => (value = next)}>
  <Select.Trigger class="mc-modern-select" aria-label={placeholder}>
    <Select.Value {placeholder} />
    <span class="mc-modern-select__chevron" aria-hidden="true">⌄</span>
  </Select.Trigger>
  <Select.Content class="mc-modern-select__content" sideOffset={5}>
    <Select.Viewport>
      {#each options as option (option.value)}
        <Select.Item value={option.value} label={option.label} disabled={option.disabled} class="mc-modern-select__item">
          {option.label}
        </Select.Item>
      {/each}
    </Select.Viewport>
  </Select.Content>
</Select.Root>

<style>
  :global(.mc-modern-select) { display: inline-flex; width: 100%; align-items: center; justify-content: space-between; gap: 0.75rem; border: 1px solid var(--mc-border, #d9dee8); border-radius: 0.5rem; background: var(--mc-surface, #fff); color: var(--mc-text, #172033); padding: 0.5rem 0.7rem; font: inherit; font-size: 0.875rem; text-align: left; }
  :global(.mc-modern-select:hover), :global(.mc-modern-select:focus-visible) { border-color: var(--mc-primary, #6366f1); }
  :global(.mc-modern-select:focus-visible) { outline: none; box-shadow: 0 0 0 3px rgb(99 102 241 / 0.16); }
  :global(.mc-modern-select:disabled) { cursor: not-allowed; opacity: 0.55; }
  :global(.mc-modern-select__chevron) { color: var(--mc-muted, #667085); }
  :global(.mc-modern-select__content) { z-index: 50; min-width: var(--bits-select-anchor-width); overflow: hidden; border: 1px solid var(--mc-border, #d9dee8); border-radius: 0.55rem; background: var(--mc-surface, #fff); padding: 0.25rem; box-shadow: 0 16px 36px rgb(15 23 42 / 0.14); }
  :global(.mc-modern-select__item) { display: flex; align-items: center; justify-content: space-between; gap: 1rem; cursor: pointer; border-radius: 0.35rem; padding: 0.5rem 0.6rem; font-size: 0.875rem; outline: none; }
  :global(.mc-modern-select__item[data-highlighted]) { background: var(--mc-primary-soft, #eef2ff); color: var(--mc-primary-strong, #4338ca); }
  :global(.mc-modern-select__item[data-disabled]) { cursor: not-allowed; opacity: 0.45; }
</style>
