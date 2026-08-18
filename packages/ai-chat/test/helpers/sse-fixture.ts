/** Builds a real `Response` whose body is a genuine SSE `ReadableStream`, for stream/chat tests. */
export function createSseResponse(
  events: ReadonlyArray<Record<string, unknown> | 'DONE'>,
): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        const payload = event === 'DONE' ? '[DONE]' : JSON.stringify(event);
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      }
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}
