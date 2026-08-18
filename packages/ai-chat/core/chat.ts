import { requestChatCompletionStream } from './client.js';
import { withModelFallback } from './fallback.js';
import { parseSseStream } from './stream.js';
import {
  buildToolDefinitionsForApi,
  createToolRegistry,
  dispatchToolCalls,
  ToolCallAccumulator,
} from './tools.js';
import { parseUsage } from './tokens.js';

import type { ApiMessage, ChatClientConfig } from './client.js';
import type { AccumulatedToolCall, ToolDefinition } from './tools.js';
import type { UsageInfo } from './tokens.js';
import type { ChatHistory, Message } from './history/types.js';

export type ChatStatus = 'idle' | 'streaming' | 'error';

export interface ChatState {
  status: ChatStatus;
  messages: Message[];
  error: Error | null;
  usage: UsageInfo | null;
}

export type ChatListener = (state: ChatState) => void;

export interface ChatConfig extends Omit<ChatClientConfig, 'model'> {
  /** Ordered model list — the first entry is primary, the rest are fallbacks (`fallback.ts`). */
  models: string[];
  systemPrompt?: string;
  tools?: ToolDefinition[];
  /** Human-in-the-loop gate forwarded to `dispatchToolCalls` (SA4). */
  confirmTool?: (toolCall: AccumulatedToolCall) => Promise<boolean> | boolean;
  history?: ChatHistory;
  /** Injectable for tests; forwarded to `requestChatCompletionStream`. */
  fetchImpl?: typeof fetch;
}

const MAX_TOOL_ITERATIONS = 8;

const initialState: ChatState = { status: 'idle', messages: [], error: null, usage: null };

function nowIso(): string {
  return new Date().toISOString();
}

function toApiMessage(message: Message): ApiMessage {
  const api: ApiMessage = { role: message.role, content: message.content };
  if (message.toolCalls) api.tool_calls = message.toolCalls;
  if (message.toolCallId) api.tool_call_id = message.toolCallId;
  if (message.name) api.name = message.name;
  return api;
}

/**
 * Headless chat orchestrator. Follows the same generation-guard pattern as
 * `@modularcore/media-picker`'s `core/media-picker.ts`: every `send()`/`reset()` bumps
 * `generation`, and any state mutation from an in-flight async step (a streamed delta, a tool
 * dispatch result) is applied only if its captured generation is still current. Without this, a
 * slow streaming response that is still resolving after a `reset()` or a newer `send()` would
 * silently overwrite state the caller already moved past.
 */
export class Chat {
  private state: ChatState = { ...initialState };
  private readonly listeners = new Set<ChatListener>();
  private readonly config: ChatConfig;
  private readonly toolRegistry: Map<string, ToolDefinition>;
  private generation = 0;
  private abortController: AbortController | null = null;

  constructor(config: ChatConfig) {
    this.config = config;
    this.toolRegistry = createToolRegistry(config.tools ?? []);
  }

  getState(): ChatState {
    return this.state;
  }

  subscribe(listener: ChatListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(patch: Partial<ChatState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.state);
  }

  private commitIfCurrent(gen: number, patch: Partial<ChatState>): void {
    if (gen === this.generation) this.setState(patch);
  }

  async loadHistory(): Promise<void> {
    if (!this.config.history) return;
    const gen = ++this.generation;
    const messages = await this.config.history.load();
    this.commitIfCurrent(gen, { messages });
  }

  async send(content: string): Promise<void> {
    this.abortController?.abort();
    const gen = ++this.generation;
    const controller = new AbortController();
    this.abortController = controller;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: nowIso(),
    };
    this.commitIfCurrent(gen, {
      messages: [...this.state.messages, userMessage],
      status: 'streaming',
      error: null,
    });
    await this.config.history?.append(userMessage);

    try {
      await this.runConversationTurn(gen, controller.signal);
    } catch (error) {
      if (gen !== this.generation) return; // superseded by reset()/a newer send(): drop the stale error
      const normalized = error instanceof Error ? error : new Error(String(error));
      if (normalized.name === 'AbortError') {
        this.commitIfCurrent(gen, { status: 'idle' });
        return;
      }
      this.commitIfCurrent(gen, { status: 'error', error: normalized });
      return;
    }
    this.commitIfCurrent(gen, { status: 'idle' });
  }

  stop(): void {
    this.abortController?.abort();
  }

  reset(): void {
    this.generation++;
    this.abortController?.abort();
    this.abortController = null;
    this.setState({ ...initialState });
  }

  private buildApiMessages(): ApiMessage[] {
    const apiMessages = this.state.messages.map(toApiMessage);
    if (this.config.systemPrompt) {
      return [{ role: 'system', content: this.config.systemPrompt }, ...apiMessages];
    }
    return apiMessages;
  }

  private replaceLastMessage(gen: number, updated: Message): Message[] {
    if (gen !== this.generation) return this.state.messages;
    const messages = [...this.state.messages];
    messages[messages.length - 1] = updated;
    return messages;
  }

  private async runConversationTurn(gen: number, signal: AbortSignal): Promise<void> {
    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        createdAt: nowIso(),
      };
      this.commitIfCurrent(gen, { messages: [...this.state.messages, assistantMessage] });

      const apiMessages = this.buildApiMessages();
      let contentBuffer = '';
      let usage: UsageInfo | null = null;
      let toolCallAccumulator = new ToolCallAccumulator();

      await withModelFallback(this.config.models, async (model) => {
        const response = await requestChatCompletionStream(
          {
            baseURL: this.config.baseURL,
            apiKey: this.config.apiKey,
            model,
            headers: this.config.headers,
            extraBody: this.config.extraBody,
          },
          {
            messages: apiMessages,
            tools: buildToolDefinitionsForApi(this.toolRegistry),
            signal,
            fetchImpl: this.config.fetchImpl,
          },
        );

        // Reset per-attempt accumulation state: a fallback retry on a later model must not
        // carry over partial content/tool-call fragments from a failed earlier attempt.
        contentBuffer = '';
        usage = null;
        toolCallAccumulator = new ToolCallAccumulator();

        for await (const chunk of parseSseStream(
          response.body as ReadableStream<Uint8Array>,
          signal,
        )) {
          if (gen !== this.generation) return;
          const choice = chunk.choices[0];
          if (choice?.delta.content) {
            contentBuffer += choice.delta.content;
            this.commitIfCurrent(gen, {
              messages: this.replaceLastMessage(gen, {
                ...assistantMessage,
                content: contentBuffer,
              }),
            });
          }
          toolCallAccumulator.ingest(choice?.delta.tool_calls);
          const parsedUsage = parseUsage(chunk.usage);
          if (parsedUsage) usage = parsedUsage;
        }
      });

      if (gen !== this.generation) return; // superseded mid-turn: do not persist/finalize

      const toolCalls = toolCallAccumulator.list();
      const finalAssistant: Message = {
        ...assistantMessage,
        content: contentBuffer.length > 0 ? contentBuffer : null,
        toolCalls:
          toolCalls.length > 0
            ? toolCalls.map((call) => ({
                id: call.id,
                type: 'function' as const,
                function: call.function,
              }))
            : undefined,
      };
      this.commitIfCurrent(gen, { messages: this.replaceLastMessage(gen, finalAssistant), usage });
      await this.config.history?.append(finalAssistant);

      if (toolCalls.length === 0) return;

      const dispatches = await dispatchToolCalls(toolCalls, this.toolRegistry, {
        confirm: this.config.confirmTool,
      });
      if (gen !== this.generation) return;

      for (const dispatch of dispatches) {
        const toolMessage: Message = {
          id: crypto.randomUUID(),
          role: 'tool',
          content: dispatch.error ? JSON.stringify({ error: dispatch.error }) : dispatch.content,
          toolCallId: dispatch.toolCallId,
          name: dispatch.name,
          createdAt: nowIso(),
        };
        this.commitIfCurrent(gen, { messages: [...this.state.messages, toolMessage] });
        await this.config.history?.append(toolMessage);
      }
      // Loop again: feed the tool results back for the next completion.
    }
    throw new Error(
      `ai-chat: exceeded ${MAX_TOOL_ITERATIONS} tool-call iterations without a final answer`,
    );
  }
}
