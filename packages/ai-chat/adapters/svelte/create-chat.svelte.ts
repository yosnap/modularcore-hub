/// <reference types="svelte" />
import { Chat } from '../../core/chat.js';

import type { ChatConfig, ChatState } from '../../core/chat.js';

export interface ChatRune {
  readonly state: ChatState;
  send: (content: string) => Promise<void>;
  stop: () => void;
  reset: () => void;
  loadHistory: () => Promise<void>;
}

/**
 * Svelte 5 rune binding to `Chat` (headless core). No business logic here — `state` is a
 * `$state` mirror kept in sync via `chat.subscribe`, every action just forwards.
 */
export function createChat(config: ChatConfig): ChatRune {
  const chat = new Chat(config);
  let state = $state<ChatState>(chat.getState());

  chat.subscribe((next) => {
    state = next;
  });

  return {
    get state() {
      return state;
    },
    send: (content) => chat.send(content),
    stop: () => chat.stop(),
    reset: () => chat.reset(),
    loadHistory: () => chat.loadHistory(),
  };
}
