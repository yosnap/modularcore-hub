// Validates `ModalConfig.bgColor`/`textColor` before they are ever interpolated into a `style`
// attribute — untrusted provider content otherwise enables CSS injection (RT-S5).

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_COLOR = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/;

/** Returns `value` unchanged if it matches a hex or rgb()/rgba() color literal, `undefined` otherwise. */
export function safeColor(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (HEX_COLOR.test(trimmed) || RGB_COLOR.test(trimmed)) return trimmed;
  return undefined;
}
