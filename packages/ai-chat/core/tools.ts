import type { ApiToolDefinition } from './client.js';
import type { ChoiceDeltaToolCall } from './stream.js';

/**
 * SA4 (High, security): `tool_calls` produced by the model are not trustworthy input — the
 * model's output can reflect prompt-injection from user or document content it was shown
 * earlier in the conversation. Every tool call is therefore: (1) resolved against a registry of
 * tools the *caller* explicitly registered — unknown names are rejected, never dispatched
 * blind; (2) argument-validated against the tool's declared `schema` before the handler ever
 * sees them; (3) gated behind an optional `confirm` human-in-the-loop hook. Tool handlers must
 * still treat validated args as untrusted *values* (schema validation checks shape, not
 * intent) — do not use them to build file paths, shell commands, or fetch targets without
 * their own checks (see `@modularcore/media-picker`'s `core/net/ssrf-guard.ts` for the pattern
 * if a handler needs to fetch a caller-influenced URL).
 */

export interface ToolValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ToolValidationFailure {
  success: false;
  error: string;
}

export type ToolValidationResult<T> = ToolValidationSuccess<T> | ToolValidationFailure;

/** Structural (duck-typed) zod schema — avoids a hard dependency on the `zod` package here. */
interface ZodLikeSchema<T> {
  safeParse: (
    value: unknown,
  ) => { success: true; data: T } | { success: false; error: { message: string } };
}

/**
 * A tool's argument schema is either a zod schema (or anything exposing `safeParse`, e.g. a
 * `zod` object) or a plain validator function — the latter is how a JSON-Schema-based tool
 * plugs in (bring your own JSON Schema validator, e.g. `ajv`, and adapt it to this shape) without
 * this package bundling a JSON Schema validator it would otherwise never need.
 */
export type ToolSchema<T> = ZodLikeSchema<T> | ((rawArgs: unknown) => ToolValidationResult<T>);

function isZodLikeSchema<T>(schema: ToolSchema<T>): schema is ZodLikeSchema<T> {
  return typeof schema === 'object' && schema !== null && 'safeParse' in schema;
}

export function validateToolArgs<T>(
  schema: ToolSchema<T>,
  rawArgs: unknown,
): ToolValidationResult<T> {
  if (isZodLikeSchema(schema)) {
    const result = schema.safeParse(rawArgs);
    return result.success
      ? { success: true, data: result.data }
      : { success: false, error: result.error.message };
  }
  return schema(rawArgs);
}

export interface AccumulatedToolCall {
  index: number;
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ToolDefinition<TArgs = unknown> {
  name: string;
  description?: string;
  /** JSON Schema describing the args shape, sent to the model as-is. */
  parameters: Record<string, unknown>;
  /** Validates the model's actual tool-call arguments before `handler` runs. */
  schema: ToolSchema<TArgs>;
  handler: (args: TArgs, toolCall: AccumulatedToolCall) => Promise<unknown> | unknown;
}

export function createToolRegistry(tools: readonly ToolDefinition[]): Map<string, ToolDefinition> {
  const registry = new Map<string, ToolDefinition>();
  for (const tool of tools) {
    if (registry.has(tool.name)) {
      throw new Error(`ai-chat: duplicate tool name "${tool.name}"`);
    }
    registry.set(tool.name, tool);
  }
  return registry;
}

export function buildToolDefinitionsForApi(
  registry: Map<string, ToolDefinition>,
): ApiToolDefinition[] {
  return [...registry.values()].map((tool) => ({
    type: 'function' as const,
    function: { name: tool.name, description: tool.description, parameters: tool.parameters },
  }));
}

/**
 * Accumulates fragmented `tool_calls` deltas by `index` (AD4): unlike message `content`, which
 * streams as plain text appended in order, `tool_calls` arrive as an array of partial objects
 * keyed by `index` — `function.arguments` is built character-by-character across many deltas
 * while `function.name`/`id` typically arrive whole in the first delta for that index.
 */
export class ToolCallAccumulator {
  private readonly byIndex = new Map<number, AccumulatedToolCall>();

  ingest(deltas: ChoiceDeltaToolCall[] | undefined): void {
    if (!deltas) return;
    for (const delta of deltas) {
      const existing = this.byIndex.get(delta.index);
      if (!existing) {
        this.byIndex.set(delta.index, {
          index: delta.index,
          id: delta.id ?? '',
          type: 'function',
          function: {
            name: delta.function?.name ?? '',
            arguments: delta.function?.arguments ?? '',
          },
        });
        continue;
      }
      if (delta.id) existing.id = delta.id;
      if (delta.function?.name) existing.function.name = delta.function.name;
      if (delta.function?.arguments) existing.function.arguments += delta.function.arguments;
    }
  }

  list(): AccumulatedToolCall[] {
    return [...this.byIndex.values()].sort((a, b) => a.index - b.index);
  }
}

export interface ToolDispatchOptions {
  /** Human-in-the-loop gate: must resolve `true` before a tool handler runs. */
  confirm?: (toolCall: AccumulatedToolCall) => Promise<boolean> | boolean;
}

export interface ToolDispatchResult {
  toolCallId: string;
  name: string;
  content: string;
  error?: string;
}

async function dispatchOne(
  call: AccumulatedToolCall,
  registry: Map<string, ToolDefinition>,
  options: ToolDispatchOptions,
): Promise<ToolDispatchResult> {
  const tool = registry.get(call.function.name);
  if (!tool) {
    return {
      toolCallId: call.id,
      name: call.function.name,
      content: '',
      error: `Unknown tool "${call.function.name}" is not registered`,
    };
  }

  let rawArgs: unknown;
  try {
    rawArgs = call.function.arguments.length > 0 ? JSON.parse(call.function.arguments) : {};
  } catch {
    return {
      toolCallId: call.id,
      name: tool.name,
      content: '',
      error: `Tool "${tool.name}" arguments are not valid JSON`,
    };
  }

  const validation = validateToolArgs(tool.schema, rawArgs);
  if (!validation.success) {
    return {
      toolCallId: call.id,
      name: tool.name,
      content: '',
      error: `Tool "${tool.name}" arguments failed schema validation: ${validation.error}`,
    };
  }

  if (options.confirm) {
    const confirmed = await options.confirm(call);
    if (!confirmed) {
      return {
        toolCallId: call.id,
        name: tool.name,
        content: '',
        error: `Tool "${tool.name}" execution was not confirmed`,
      };
    }
  }

  try {
    const output = await tool.handler(validation.data, call);
    return {
      toolCallId: call.id,
      name: tool.name,
      content: typeof output === 'string' ? output : JSON.stringify(output ?? null),
    };
  } catch (error) {
    return {
      toolCallId: call.id,
      name: tool.name,
      content: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function dispatchToolCalls(
  toolCalls: readonly AccumulatedToolCall[],
  registry: Map<string, ToolDefinition>,
  options: ToolDispatchOptions = {},
): Promise<ToolDispatchResult[]> {
  const results: ToolDispatchResult[] = [];
  for (const call of toolCalls) {
    results.push(await dispatchOne(call, registry, options));
  }
  return results;
}
