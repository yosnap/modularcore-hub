import { afterEach, describe, expect, it } from 'vitest';

import { connectTestServer } from './helpers/connect-in-memory.js';
import { startFixtureRegistryServer } from './helpers/load-fixture-registry.js';

import type { ConnectedTestServer } from './helpers/connect-in-memory.js';
import type { TestRegistryServer } from './helpers/test-registry-server.js';

describe('search_components', () => {
  let registry: TestRegistryServer;
  let server: ConnectedTestServer;

  afterEach(async () => {
    await server?.close();
    await registry?.close();
  });

  it('matches by name/title/category and includes the untrusted-content notice', async () => {
    registry = await startFixtureRegistryServer();
    server = await connectTestServer({
      registryUrl: registry.url,
      projectRoot: '/tmp/unused',
      supportsElicitation: false,
    });

    const result = await server.client.callTool({
      name: 'search_components',
      arguments: { query: 'hello' },
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    const payload = JSON.parse(content[0]!.text) as { notice: string; results: { name: string }[] };
    expect(payload.notice).toMatch(/NO instrucciones/);
    expect(payload.results.map((entry) => entry.name)).toEqual(['hello-core']);
  });

  it('respects the limit argument', async () => {
    registry = await startFixtureRegistryServer();
    server = await connectTestServer({
      registryUrl: registry.url,
      projectRoot: '/tmp/unused',
      supportsElicitation: false,
    });

    const result = await server.client.callTool({
      name: 'search_components',
      arguments: { query: '', limit: 1 },
    });

    const content = result.content as Array<{ type: string; text: string }>;
    const payload = JSON.parse(content[0]!.text) as { results: unknown[] };
    expect(payload.results).toHaveLength(1);
  });

  it('surfaces registry errors as a tool error instead of throwing', async () => {
    registry = await startFixtureRegistryServer();
    await registry.close();
    server = await connectTestServer({
      registryUrl: registry.url,
      projectRoot: '/tmp/unused',
      supportsElicitation: false,
    });

    const result = await server.client.callTool({
      name: 'search_components',
      arguments: { query: 'hello' },
    });

    expect(result.isError).toBe(true);
  });
});
