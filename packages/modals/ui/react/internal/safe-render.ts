import { renderMarkdownToHtml } from '@modularcore/ai-chat/markdown';

import { safeHref, safeImageSrc } from '../../safe/url.js';
import { safeColor } from '../../safe/style.js';

import type { CSSProperties } from 'react';
import type { ModalConfig } from '../../../core/types.js';

export interface SafeMessage {
  /** Plain text (React renders it escaped) when `allowHtml` is not set. */
  text?: string;
  /** Pre-sanitized HTML (via `renderMarkdownToHtml`) when `allowHtml` is set — the ONLY case dangerouslySetInnerHTML is used. */
  html?: string;
}

/** `message` is untrusted (see core/provider.ts): text by default, markdown-sanitized HTML only opt-in. */
export function safeMessage(config: Pick<ModalConfig, 'message' | 'allowHtml'>): SafeMessage {
  if (config.allowHtml) return { html: renderMarkdownToHtml(config.message) };
  return { text: config.message };
}

const MAX_WIDTH_CLASS: Record<NonNullable<ModalConfig['maxWidth']>, string> = {
  sm: 'modals-max-w-sm',
  md: 'modals-max-w-md',
  lg: 'modals-max-w-lg',
  xl: 'modals-max-w-xl',
  '2xl': 'modals-max-w-2xl',
  full: 'modals-max-w-full',
};

/** `maxWidth` is a closed enum (core/types.ts) — mapped to a class, never interpolated as a style string. */
export function maxWidthClass(maxWidth?: ModalConfig['maxWidth']): string {
  return maxWidth ? MAX_WIDTH_CLASS[maxWidth] : '';
}

/** `bgColor`/`textColor` validated before ever reaching a `style` object. */
export function safeOverlayStyle(config: Pick<ModalConfig, 'bgColor' | 'textColor'>): CSSProperties {
  const style: CSSProperties = {};
  const bg = safeColor(config.bgColor);
  const text = safeColor(config.textColor);
  if (bg) style.backgroundColor = bg;
  if (text) style.color = text;
  return style;
}

export { safeHref, safeImageSrc };
