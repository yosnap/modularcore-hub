import { z } from 'zod';

/**
 * AD5 (High): versioned `Message` schema. `backend.ts` treats the user's own history backend
 * as a trust boundary and validates every message it returns against this schema before it
 * enters chat state — a malformed/forged message from the backend must fail loudly, not get
 * silently coerced. Bump `MESSAGE_SCHEMA_VERSION` (and handle both shapes in `backend.ts`/
 * `local.ts` for one release) if this shape ever changes.
 */
export const MESSAGE_SCHEMA_VERSION = 1;

export const messageRoleSchema = z.enum(['system', 'user', 'assistant', 'tool']);
export type MessageRole = z.infer<typeof messageRoleSchema>;

export const toolCallSchema = z.object({
  id: z.string().min(1),
  type: z.literal('function'),
  function: z.object({
    name: z.string().min(1),
    arguments: z.string(),
  }),
});
export type ToolCall = z.infer<typeof toolCallSchema>;

export const messageSchema = z
  .object({
    id: z.string().min(1),
    role: messageRoleSchema,
    /** `null` for an assistant message that only produced tool calls. */
    content: z.string().nullable(),
    /** ISO 8601 timestamp. */
    createdAt: z.string().min(1),
    toolCalls: z.array(toolCallSchema).optional(),
    /** Required on `role: 'tool'` messages — links the result back to its originating call. */
    toolCallId: z.string().min(1).optional(),
    /** Tool name, set on `role: 'tool'` messages. */
    name: z.string().min(1).optional(),
  })
  .refine((message) => message.role !== 'tool' || typeof message.toolCallId === 'string', {
    message: 'messages with role "tool" must include toolCallId',
  });

export type Message = z.infer<typeof messageSchema>;

export interface ChatHistory {
  load(): Promise<Message[]>;
  append(message: Message): Promise<void>;
  clear(): Promise<void>;
}
