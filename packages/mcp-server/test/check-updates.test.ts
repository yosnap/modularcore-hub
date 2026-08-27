import { afterEach, describe, expect, it } from 'vitest';

import { connectTestServer } from './helpers/connect-in-memory.js';
import { startFixtureRegistryServer } from './helpers/load-fixture-registry.js';

import type { ConnectedTestServer } from './helpers/connect-in-memory.js';
import type { TestRegistryServer } from './helpers/test-registry-server.js';

describe('check_updates', () => {
  let registry: TestRegistryServer;
  let server: ConnectedTestServer;

  afterEach(async () => {
    await server?.close();
    await registry?.close();
  });

  it('flags an outdated component and confirms an up-to-date one', async () => {
    registry = await startFixtureRegistryServer();
    server = await connectTestServer({
      registryUrl: registry.url,
      projectRoot: '/tmp/unused',
      supportsElicitation: false,
    });

    const result = await server.client.callTool({
      name: 'check_updates',
      arguments: {
        installedComponents: [
          { name: 'hello-core', version: '0.9.0' },
          { name: 'widget', version: '2.0.0' },
          { name: 'ghost-component', version: '1.0.0' },
        ],
      },
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    const payload = JSON.parse(content[0]!.text) as {
      results: { name: string; status: string; latestVersion: string | null }[];
    };
    const byName = Object.fromEntries(payload.results.map((entry) => [entry.name, entry]));
    expect(byName['hello-core']!.status).toBe('outdated');
    expect(byName['hello-core']!.latestVersion).toBe('1.0.0');
    expect(byName['widget']!.status).toBe('up-to-date');
    expect(byName['ghost-component']!.status).toBe('not-in-registry');
    expect(byName['ghost-component']!.latestVersion).toBeNull();
  });
});
