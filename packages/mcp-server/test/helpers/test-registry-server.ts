import { createServer } from 'node:http';

import type { Server } from 'node:http';

export interface TestRegistryServer {
  url: string;
  close(): Promise<void>;
}

/**
 * Minimal static-JSON HTTP server, mirroring `packages/cli/test/helpers/test-registry-server.ts`
 * (same pattern, copied rather than shared since the CLI's test helpers aren't a published
 * package). `routes` maps a path (e.g. `index.json`) to a raw response body.
 */
export async function startTestRegistryServer(
  routes: Record<string, string>,
): Promise<TestRegistryServer> {
  const server: Server = createServer((req, res) => {
    const path = (req.url ?? '/').replace(/^\/+/, '');
    if (!(path in routes)) {
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
