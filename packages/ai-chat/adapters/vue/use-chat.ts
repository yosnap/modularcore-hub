import { onUnmounted, shallowRef } from 'vue';

import { Chat } from '../../core/chat.js';

import type { ChatConfig, ChatState } from '../../core/chat.js';
import type { ShallowRef } from 'vue';

export interface UseChatResult {
  state: ShallowRef<ChatState>;
  send: (content: string) => Promise<void>;
  stop: () => void;
  reset: () => void;
  loadHistory: () => Promise<void>;
}

/**
 * Vue 3 Composition API binding for the headless `Chat` core.
 *
 * A composable invocation creates one independent chat instance. Construction does not access
 * browser globals, so it is SSR-safe; invoke browser-dependent integrations after mount. On
 * unmount the core listener is removed and an active stream is aborted via `stop()`.
 */
export function useChat(config: ChatConfig): UseChatResult {
  const chat = new Chat(config);
  const state = shallowRef<ChatState>(chat.getState());
  const unsubscribe = chat.subscribe((next) => {
    state.value = next;
  });

  onUnmounted(() => {
    unsubscribe();
    chat.stop();
  });

  return {
    state,
    send: (content) => chat.send(content),
    stop: () => chat.stop(),
    reset: () => chat.reset(),
    loadHistory: () => chat.loadHistory(),
  };
}
