import { createServer } from 'node:http';

import type { Server } from 'node:http';

export interface TestRegistryServer {
  url: string;
  close(): Promise<void>;
}

/**
 * Minimal static-JSON HTTP server so tests never depend on `apps/web` actually running.
 * `routes` maps a path (e.g. `index.json`) to a raw response body (string) or `null` to
 * simulate a 404 (used to exercise the "registry no generado" error path).
 */
export async function startTestRegistryServer(
  routes: Record<string, string | null>,
): Promise<TestRegistryServer> {
  const server: Server = createServer((req, res) => {
    const path = (req.url ?? '/').replace(/^\/+/, '');
    if (!(path in routes) || routes[path] === null) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(routes[path]);
  });

  await new Promise<void>((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
  const address = server.address();
  if (typeof address !== 'object' || address === null) {
    throw new Error('Failed to bind test registry server');
  }
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolvePromise) => server.close(() => resolvePromise())),
  };
}
