# Backend history HTTP contract

`core/history/backend.ts` (`createBackendHistory`) talks to an HTTP endpoint you implement and
own. It is a trust boundary (AD5): every message returned by your backend is validated against
the zod `messageSchema` in `core/history/types.ts` before it is allowed into chat state.

## Endpoints

Base: `{baseUrl}` (no trailing slash).

| Method | Path        | Request body      | Success response                  |
| ------ | ----------- | ------------------ | ---------------------------------- |
| GET    | `/messages` | —                   | `200` `{ "messages": Message[] }`  |
| POST   | `/messages` | `Message` (JSON)   | any `2xx` (body ignored)           |
| DELETE | `/messages` | —                   | any `2xx`                          |

## `Message` shape (schema version 1, see `MESSAGE_SCHEMA_VERSION`)

```json
{
  "id": "string, non-empty",
  "role": "system | user | assistant | tool",
  "content": "string or null",
  "createdAt": "ISO 8601 timestamp",
  "toolCalls": [{ "id": "string", "type": "function", "function": { "name": "string", "arguments": "string" } }],
  "toolCallId": "string, required when role is \"tool\"",
  "name": "string, tool name, set on role \"tool\" messages"
}
```

## Error handling

Any non-2xx HTTP response, an unexpected GET response shape, or a message that fails
`messageSchema` validation makes the corresponding `ChatHistory` method (`load`/`append`/`clear`)
reject with a `BackendHistoryError` (carries `status` when available). `load()` never returns a
partially validated array — one bad message fails the whole call.

## Out of scope for v1

Pagination and bulk delete-by-id are not part of this contract; `clear()` maps to a single
`DELETE /messages` that your backend interprets as "wipe this conversation's history".
