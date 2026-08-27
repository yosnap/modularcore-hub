import { renderMarkdownToHtml } from '@modularcore/ai-chat/markdown';

import type { ModalConfig } from '../../core/types.js';

export interface SafeMessage {
  /** Plain text (rendered escaped by the framework) when `allowHtml` is not set. */
  text?: string;
  /** Pre-sanitized HTML (via `renderMarkdownToHtml`) when `allowHtml` is set — the ONLY case an `{@html}`/`dangerouslySetInnerHTML` sink is used. */
  html?: string;
}

/**
 * `message` is untrusted (see core/provider.ts): text by default, markdown-sanitized HTML only
 * opt-in. Shared by ui/react and ui/svelte so both frameworks make the exact same sanitization
 * decision for the same config.
 */
export function safeMessage(config: Pick<ModalConfig, 'message' | 'allowHtml'>): SafeMessage {
  if (config.allowHtml) return { html: renderMarkdownToHtml(config.message) };
  return { text: config.message };
}
