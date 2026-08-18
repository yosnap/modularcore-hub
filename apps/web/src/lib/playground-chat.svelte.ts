import { parseSseStream } from '@modularcore/ai-chat/stream';

import { DEFAULT_MODEL } from './chat-config';

import type { ApiMessage } from '@modularcore/ai-chat/client';
import type { AllowedModel } from './chat-config';

export interface PlaygroundChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type PlaygroundChatStatus = 'idle' | 'streaming' | 'error';

export interface PlaygroundChatRune {
  readonly messages: PlaygroundChatMessage[];
  readonly status: PlaygroundChatStatus;
  readonly error: string | null;
  readonly model: AllowedModel;
  setModel: (model: AllowedModel) => void;
  send: (content: string) => Promise<void>;
}

/**
 * Minimal client-side consumer of the real `@modularcore/ai-chat` streaming primitive
 * (`core/stream.ts`'s `parseSseStream`), talking to this app's own `/api/chat` proxy instead of
 * OpenRouter directly. Deliberately not `@modularcore/ai-chat`'s full `Chat` orchestrator
 * (`core/chat.ts`): that class always POSTs to `${baseURL}/chat/completions`, and this phase's
 * proxy intentionally lives at the flatter `/api/chat` (per the phase spec) — the proxy owns the
 * API key, model allowlist, and token cap; this hook only renders what streams back.
 */
export function createPlaygroundChat(): PlaygroundChatRune {
  let messages = $state<PlaygroundChatMessage[]>([]);
  let status = $state<PlaygroundChatStatus>('idle');
  let error = $state<string | null>(null);
  let model = $state<AllowedModel>(DEFAULT_MODEL);

  async function send(content: string): Promise<void> {
    if (status === 'streaming') return;

    const history = messages.map((message): ApiMessage => ({
      role: message.role,
      content: message.content,
    }));
    messages = [...messages, { role: 'user', content }];
    status = 'streaming';
    error = null;

    const assistantIndex = messages.length;
    messages = [...messages, { role: 'assistant', content: '' }];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content }],
          model,
        }),
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `Chat proxy request failed (${response.status})`);
      }

      let buffer = '';
      for await (const chunk of parseSseStream(response.body)) {
        const delta = chunk.choices[0]?.delta.content;
        if (!delta) continue;
        buffer += delta;
        const snapshot = buffer;
        messages = messages.map((message, index) =>
          index === assistantIndex ? { ...message, content: snapshot } : message,
        );
      }
      status = 'idle';
    } catch (err) {
      status = 'error';
      error = err instanceof Error ? err.message : 'Unknown error';
    }
  }

  return {
    get messages() {
      return messages;
    },
    get status() {
      return status;
    },
    get error() {
      return error;
    },
    get model() {
      return model;
    },
    setModel: (next) => {
      model = next;
    },
    send,
  };
}
