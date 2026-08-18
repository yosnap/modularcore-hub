import { Chat } from '../../core/chat.js';
import { renderMarkdownToHtml } from '../../ui/markdown.js';

import type { ChatConfig, ChatState } from '../../core/chat.js';

export interface ChatElementController {
  readonly chat: Chat;
  getState: () => ChatState;
  subscribe: (listener: (state: ChatState) => void) => () => void;
  send: (content: string) => Promise<void>;
  stop: () => void;
  reset: () => void;
  loadHistory: () => Promise<void>;
  /** Optional DOM projection of chat state into `container` — no chat logic of its own. */
  mount: (container: Element) => () => void;
}

/**
 * Framework-free binding: thin wrapper over `Chat` for callers with no React/Svelte runtime.
 */
export function createChatElement(config: ChatConfig): ChatElementController {
  const chat = new Chat(config);

  return {
    chat,
    getState: () => chat.getState(),
    subscribe: (listener) => chat.subscribe(listener),
    send: (content) => chat.send(content),
    stop: () => chat.stop(),
    reset: () => chat.reset(),
    loadHistory: () => chat.loadHistory(),
    mount(container) {
      const render = (state: ChatState): void => {
        // `renderMarkdownToHtml` already escapes untrusted content before adding markup, so
        // assigning straight to `innerHTML` here does not reopen the XSS surface it closes.
        container.innerHTML = state.messages
          .filter((message) => message.role === 'user' || message.role === 'assistant')
          .map(
            (message) =>
              `<div class="mc-ai-chat-message mc-ai-chat-message--${message.role}">${renderMarkdownToHtml(message.content ?? '')}</div>`,
          )
          .join('');
      };
      render(chat.getState());
      return chat.subscribe(render);
    },
  };
}
