import { afterEach, describe, expect, it } from 'vitest';

import {
  assertCompatible,
  collectNpmDependencies,
  resolveRegistryDependencies,
} from '../src/deps.js';
import { CompatibilityError, DependencyCycleError } from '../src/errors.js';
import { createRegistryClient } from '@modularcore/registry-client';
import { startFixtureRegistryServer } from './helpers/load-fixture-registry.js';

import type { TestRegistryServer } from './helpers/test-registry-server.js';

describe('deps', () => {
  let server: TestRegistryServer;

  afterEach(async () => {
    await server?.close();
  });

  it('resolves registryDependencies recursively, dependencies-first, without duplicates', async () => {
    server = await startFixtureRegistryServer();
    const client = createRegistryClient(server.url);
    const entries = await resolveRegistryDependencies(client, 'widget');
    expect(entries.map((entry) => entry.name)).toEqual(['base-lib', 'widget']);
  });

  it('rejects a registryDependencies cycle with a clear error', async () => {
    server = await startFixtureRegistryServer();
    const client = createRegistryClient(server.url);
    await expect(resolveRegistryDependencies(client, 'cycle-a')).rejects.toThrow(
      DependencyCycleError,
    );
    await expect(resolveRegistryDependencies(client, 'cycle-a')).rejects.toThrow(
      /cycle-a -> cycle-b -> cycle-a/,
    );
  });

  it('AD2: rejects a framework not declared by the component', async () => {
    server = await startFixtureRegistryServer();
    const client = createRegistryClient(server.url);
    const entry = await client.getDescriptor('vue-only');
    expect(() => assertCompatible(entry, 'react', () => undefined)).toThrow(CompatibilityError);
  });

  it('AD2: rejects an installed peer version that does not satisfy the required range', async () => {
    server = await startFixtureRegistryServer();
    const client = createRegistryClient(server.url);
    const entry = await client.getDescriptor('needs-react-19');
    expect(() => assertCompatible(entry, 'react', () => '^18.2.0')).toThrow(CompatibilityError);
  });

  it('AD2: accepts a satisfying installed peer version', async () => {
    server = await startFixtureRegistryServer();
    const client = createRegistryClient(server.url);
    const entry = await client.getDescriptor('widget');
    expect(() => assertCompatible(entry, 'react', () => '^18.2.0')).not.toThrow();
  });

  it('SA2: rejects a dependency without a pinned/semver version', async () => {
    server = await startFixtureRegistryServer();
    const client = createRegistryClient(server.url);
    const entry = await client.getDescriptor('widget');
    const unpinned = { ...entry, dependencies: ['left-pad'] };
    expect(() => collectNpmDependencies([unpinned])).toThrow(CompatibilityError);
  });

  it('collects a valid pinned npm dependency', async () => {
    server = await startFixtureRegistryServer();
    const client = createRegistryClient(server.url);
    const entry = await client.getDescriptor('widget');
    const specs = collectNpmDependencies([entry]);
    expect(specs).toEqual([{ name: 'left-pad', version: '^1.3.0', raw: 'left-pad@^1.3.0' }]);
  });
});
