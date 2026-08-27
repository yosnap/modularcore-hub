import { signal } from '@angular/core';

import { Chat } from '../../core/chat.js';

import type { DestroyRef, Signal } from '@angular/core';
import type { ChatConfig, ChatState } from '../../core/chat.js';

/**
 * Per-component Angular binding for the headless chat. It is a factory instead of a root
 * injectable so concurrent component instances never share messages or cancellation state.
 */
export interface ChatService {
  readonly state: Signal<ChatState>;
  send: (content: string) => Promise<void>;
  stop: () => void;
  reset: () => void;
  loadHistory: () => Promise<void>;
}

/**
 * Connects one `Chat` to an Angular signal. On destruction it unsubscribes and aborts the
 * in-flight stream via the core's `stop()` method, without relying on Zone.js.
 */
export function createChatService(destroyRef: DestroyRef, config: ChatConfig): ChatService {
  const chat = new Chat(config);
  const state = signal<ChatState>(chat.getState());
  let active = true;
  const unsubscribe = chat.subscribe((next) => {
    if (active) state.set(next);
  });

  destroyRef.onDestroy(() => {
    active = false;
    unsubscribe();
    chat.stop();
  });

  return {
    state: state.asReadonly(),
    send: (content) => chat.send(content),
    stop: () => chat.stop(),
    reset: () => chat.reset(),
    loadHistory: () => chat.loadHistory(),
  };
}
