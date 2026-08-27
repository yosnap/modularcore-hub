import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { connectTestServer } from './helpers/connect-in-memory.js';
import { startFixtureRegistryServer } from './helpers/load-fixture-registry.js';
import { createTmpProject } from './helpers/tmp-project.js';

import type { ConnectedTestServer } from './helpers/connect-in-memory.js';
import type { TmpProject } from './helpers/tmp-project.js';
import type { TestRegistryServer } from './helpers/test-registry-server.js';

async function listFilesRecursive(dir: string, base = dir): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const results: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listFilesRecursive(full, base)));
    } else {
      results.push(full.slice(base.length + 1));
    }
  }
  return results;
}

describe('install_component', () => {
  let registry: TestRegistryServer;
  let server: ConnectedTestServer;
  let project: TmpProject;

  afterEach(async () => {
    await server?.close();
    await registry?.close();
    await project?.cleanup();
  });

  it('writes files only after the user accepts the elicitation, and reports new envVariables', async () => {
    registry = await startFixtureRegistryServer();
    project = await createTmpProject({
      files: { '.env.example': 'HELLO_CORE_ALREADY_SET=already-here\n' },
    });
    server = await connectTestServer({
      registryUrl: registry.url,
      projectRoot: project.dir,
      supportsElicitation: true,
      elicitationHandler: () => ({ action: 'accept', content: { confirm: true } }),
    });

    const result = await server.client.callTool({
      name: 'install_component',
      arguments: { name: 'hello-core', targetPath: '.' },
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    const payload = JSON.parse(content[0]!.text) as {
      installed: string;
      newEnvVariables: { key: string }[];
    };
    expect(payload.installed).toBe('hello-core');
    expect(payload.newEnvVariables.map((env) => env.key)).toEqual(['HELLO_CORE_GREETING']);

    const written = await readFile(
      join(project.dir, 'src/modularcore/hello-core/hello.ts'),
      'utf8',
    );
    expect(written).toContain('hello from modularcore');
  });

  it('regression: remaps the target the same way the CLI does when the project customized paths.lib', async () => {
    registry = await startFixtureRegistryServer();
    project = await createTmpProject({
      files: {
        'modularcore.json': JSON.stringify({
          registryUrl: registry.url,
          framework: 'agnostic',
          paths: { lib: 'src/lib/modularcore', components: 'src/components' },
          installed: {},
        }),
      },
    });
    server = await connectTestServer({
      registryUrl: registry.url,
      projectRoot: project.dir,
      supportsElicitation: true,
      elicitationHandler: () => ({ action: 'accept', content: { confirm: true } }),
    });

    const result = await server.client.callTool({
      name: 'install_component',
      arguments: { name: 'hello-core', targetPath: '.' },
    });

    expect(result.isError).toBeFalsy();
    // Same remapped location `modularcore add` would use — not the raw descriptor target
    // (src/modularcore/...) — so the CLI's own diff/update can find what MCP installed.
    const written = await readFile(
      join(project.dir, 'src/lib/modularcore/hello-core/hello.ts'),
      'utf8',
    );
    expect(written).toContain('hello from modularcore');
    expect(await listFilesRecursive(join(project.dir, 'src/modularcore'))).toEqual([]);
  });

  it('rejects a mismatched requested version before eliciting anything', async () => {
    registry = await startFixtureRegistryServer();
    project = await createTmpProject({});
    let elicitationCalls = 0;
    server = await connectTestServer({
      registryUrl: registry.url,
      projectRoot: project.dir,
      supportsElicitation: true,
      elicitationHandler: () => {
        elicitationCalls += 1;
        return { action: 'accept', content: { confirm: true } };
      },
    });

    const result = await server.client.callTool({
      name: 'install_component',
      arguments: { name: 'hello-core', targetPath: '.', version: '9.9.9' },
    });

    expect(result.isError).toBe(true);
    expect(elicitationCalls).toBe(0);
    expect(await listFilesRecursive(project.dir)).toEqual([]);
  });

  it('writes nothing when the user declines the elicitation (client supports elicitation)', async () => {
    registry = await startFixtureRegistryServer();
    project = await createTmpProject({});
    server = await connectTestServer({
      registryUrl: registry.url,
      projectRoot: project.dir,
      supportsElicitation: true,
      elicitationHandler: () => ({ action: 'decline' }),
    });

    const result = await server.client.callTool({
      name: 'install_component',
      arguments: { name: 'hello-core', targetPath: '.' },
    });

    expect(result.isError).toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toMatch(/cancelada/i);
    expect(await listFilesRecursive(project.dir)).toEqual([]);
  });

  it('writes nothing and errors clearly when the connected client has no elicitation capability', async () => {
    registry = await startFixtureRegistryServer();
    project = await createTmpProject({});
    server = await connectTestServer({
      registryUrl: registry.url,
      projectRoot: project.dir,
      supportsElicitation: false,
    });

    const result = await server.client.callTool({
      name: 'install_component',
      arguments: { name: 'hello-core', targetPath: '.' },
    });

    expect(result.isError).toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toMatch(/no soporta elicitation/i);
    expect(await listFilesRecursive(project.dir)).toEqual([]);
  });

  it('refuses a targetPath that escapes the project root, without reading .env.example or writing', async () => {
    registry = await startFixtureRegistryServer();
    project = await createTmpProject({
      files: { '.env.example': 'SHOULD_NOT_BE_READ=1\n' },
    });
    let elicitationCalls = 0;
    server = await connectTestServer({
      registryUrl: registry.url,
      projectRoot: project.dir,
      supportsElicitation: true,
      elicitationHandler: () => {
        elicitationCalls += 1;
        return { action: 'accept', content: { confirm: true } };
      },
    });

    const result = await server.client.callTool({
      name: 'install_component',
      arguments: { name: 'hello-core', targetPath: '../../../etc' },
    });

    expect(result.isError).toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toMatch(/outside/i);
    expect(elicitationCalls).toBe(0);
    // Only the fixture project's own .env.example exists — nothing was written elsewhere.
    expect(await listFilesRecursive(project.dir)).toEqual(['.env.example']);
  });

  it('does not block other tool calls while an install_component elicitation is pending', async () => {
    registry = await startFixtureRegistryServer();
    project = await createTmpProject({});
    let releaseElicitation: (() => void) | undefined;
    server = await connectTestServer({
      registryUrl: registry.url,
      projectRoot: project.dir,
      supportsElicitation: true,
      elicitationHandler: () =>
        new Promise((resolvePromise) => {
          releaseElicitation = () =>
            resolvePromise({ action: 'accept', content: { confirm: true } });
        }),
    });

    const installPromise = server.client.callTool({
      name: 'install_component',
      arguments: { name: 'hello-core', targetPath: '.' },
    });

    // Give the pending elicitation a moment to register, then confirm a concurrent read-only
    // tool call still completes instead of queueing behind it (Red-team #9).
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 20));
    const searchResult = await server.client.callTool({
      name: 'search_components',
      arguments: { query: 'widget' },
    });
    expect(searchResult.isError).toBeFalsy();

    releaseElicitation?.();
    const installResult = await installPromise;
    expect(installResult.isError).toBeFalsy();
  });
});
