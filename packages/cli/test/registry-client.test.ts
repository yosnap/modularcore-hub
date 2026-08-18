import { afterEach, describe, expect, it } from 'vitest';

import { createRegistryClient } from '../src/registry-client.js';
import { RegistryClientError } from '../src/errors.js';
import { startFixtureRegistryServer } from './helpers/load-fixture-registry.js';
import { startTestRegistryServer } from './helpers/test-registry-server.js';

import type { TestRegistryServer } from './helpers/test-registry-server.js';

describe('registry-client', () => {
  let server: TestRegistryServer;

  afterEach(async () => {
    await server.close();
  });

  it('getIndex() returns the parsed public index', async () => {
    server = await startFixtureRegistryServer();
    const client = createRegistryClient(server.url);
    const index = await client.getIndex();
    expect(index.map((entry) => entry.name).sort()).toEqual(['hello-core', 'widget']);
  });

  it('getDescriptor() returns a validated entry', async () => {
    server = await startFixtureRegistryServer();
    const client = createRegistryClient(server.url);
    const entry = await client.getDescriptor('hello-core');
    expect(entry.name).toBe('hello-core');
    expect(entry.files).toHaveLength(1);
  });

  it('surfaces an actionable error on 404 ("registry no generado")', async () => {
    server = await startTestRegistryServer({});
    const client = createRegistryClient(server.url);
    await expect(client.getDescriptor('missing')).rejects.toThrow(RegistryClientError);
    await expect(client.getDescriptor('missing')).rejects.toThrow(/pnpm build:registry/);
  });

  it('surfaces an actionable error on non-JSON responses', async () => {
    server = await startTestRegistryServer({ 'index.json': '<html>not json</html>' });
    const client = createRegistryClient(server.url);
    await expect(client.getIndex()).rejects.toThrow(RegistryClientError);
    await expect(client.getIndex()).rejects.toThrow(/no-JSON/);
  });
});
