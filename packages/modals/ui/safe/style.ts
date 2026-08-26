// Validates `ModalConfig.bgColor`/`textColor` before they are ever interpolated into a `style`
// attribute — untrusted provider content otherwise enables CSS injection (RT-S5).

import type { ModalConfig } from '../../core/types.js';

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_COLOR = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/;

/** Returns `value` unchanged if it matches a hex or rgb()/rgba() color literal, `undefined` otherwise. */
export function safeColor(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (HEX_COLOR.test(trimmed) || RGB_COLOR.test(trimmed)) return trimmed;
  return undefined;
}

const MAX_WIDTH_CLASS: Record<NonNullable<ModalConfig['maxWidth']>, string> = {
  sm: 'modals-max-w-sm',
  md: 'modals-max-w-md',
  lg: 'modals-max-w-lg',
  xl: 'modals-max-w-xl',
  '2xl': 'modals-max-w-2xl',
  full: 'modals-max-w-full',
};

/**
 * `maxWidth` is a closed enum (core/types.ts) — mapped to a class, never interpolated as a style
 * string. Shared by ui/react and ui/svelte so both agree on the same default (no class) when
 * `maxWidth` is unset.
 */
export function maxWidthClass(maxWidth?: ModalConfig['maxWidth']): string {
  return maxWidth ? MAX_WIDTH_CLASS[maxWidth] : '';
}
