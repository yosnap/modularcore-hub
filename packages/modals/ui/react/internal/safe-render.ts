import { safeHref, safeImageSrc } from '../../safe/url.js';
import { safeColor, maxWidthClass } from '../../safe/style.js';
import { safeMessage } from '../../safe/message.js';

import type { CSSProperties } from 'react';
import type { ModalConfig } from '../../../core/types.js';

// safeMessage/maxWidthClass live in ui/safe (framework-agnostic) so ui/react and ui/svelte make
// the exact same sanitization/default-width decisions for the same config — see ui/safe/message.ts.
export { safeHref, safeImageSrc, safeMessage, maxWidthClass };
export type { SafeMessage } from '../../safe/message.js';

/** `bgColor`/`textColor` validated before ever reaching a `style` object. */
export function safeOverlayStyle(
  config: Pick<ModalConfig, 'bgColor' | 'textColor'>,
): CSSProperties {
  const style: CSSProperties = {};
  const bg = safeColor(config.bgColor);
  const text = safeColor(config.textColor);
  if (bg) style.backgroundColor = bg;
  if (text) style.color = text;
  return style;
}
