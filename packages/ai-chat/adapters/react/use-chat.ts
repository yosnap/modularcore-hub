import { useEffect, useRef, useState } from 'react';

import { Chat } from '../../core/chat.js';

import type { ChatConfig, ChatState } from '../../core/chat.js';

export interface UseChatResult {
  state: ChatState;
  send: (content: string) => Promise<void>;
  stop: () => void;
  reset: () => void;
  loadHistory: () => Promise<void>;
}

/**
 * Binds `Chat` (headless core) to React state. No business logic lives here — every action
 * forwards to the core instance, which owns the state machine and notifies via `subscribe`.
 */
export function useChat(config: ChatConfig): UseChatResult {
  const chatRef = useRef<Chat | null>(null);
  if (!chatRef.current) chatRef.current = new Chat(config);
  const chat = chatRef.current;

  const [state, setState] = useState<ChatState>(() => chat.getState());

  useEffect(() => chat.subscribe(setState), [chat]);

  return {
    state,
    send: (content) => chat.send(content),
    stop: () => chat.stop(),
    reset: () => chat.reset(),
    loadHistory: () => chat.loadHistory(),
  };
}
