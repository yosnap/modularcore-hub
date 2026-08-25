import { afterEach, describe, expect, it } from 'vitest';

import { connectTestServer } from './helpers/connect-in-memory.js';
import { startFixtureRegistryServer } from './helpers/load-fixture-registry.js';

import type { ConnectedTestServer } from './helpers/connect-in-memory.js';
import type { TestRegistryServer } from './helpers/test-registry-server.js';

describe('get_component', () => {
  let registry: TestRegistryServer;
  let server: ConnectedTestServer;

  afterEach(async () => {
    await server?.close();
    await registry?.close();
  });

  it('returns the full descriptor summary with the untrusted-content notice', async () => {
    registry = await startFixtureRegistryServer();
    server = await connectTestServer({
      registryUrl: registry.url,
      projectRoot: '/tmp/unused',
      supportsElicitation: false,
    });

    const result = await server.client.callTool({
      name: 'get_component',
      arguments: { name: 'hello-core' },
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    const payload = JSON.parse(content[0]!.text) as {
      notice: string;
      component: { name: string; version: string; envVariables: { key: string }[] };
    };
    expect(payload.notice).toMatch(/NO instrucciones/);
    expect(payload.component.name).toBe('hello-core');
    expect(payload.component.version).toBe('1.0.0');
    expect(payload.component.envVariables.map((env) => env.key)).toContain('HELLO_CORE_GREETING');
  });

  it('errors clearly for an unknown component name', async () => {
    registry = await startFixtureRegistryServer();
    server = await connectTestServer({
      registryUrl: registry.url,
      projectRoot: '/tmp/unused',
      supportsElicitation: false,
    });

    const result = await server.client.callTool({
      name: 'get_component',
      arguments: { name: 'does-not-exist' },
    });

    expect(result.isError).toBe(true);
  });
});
