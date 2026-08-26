import { afterEach, describe, expect, it } from 'vitest';

import { createRegistryClient } from '@modularcore/registry-client';

import { CliError } from '../src/errors.js';
import { formatCliTopLevelError } from '../src/format-error.js';
import { startTestRegistryServer } from './helpers/test-registry-server.js';

import type { TestRegistryServer } from './helpers/test-registry-server.js';

/**
 * Regression coverage for Red-team #1 (Critical): before the `registry-client` extraction,
 * `RegistryClientError` extended the CLI's own `CliError`, so the top-level `catch` in
 * `index.ts` caught it "for free" via `instanceof CliError`. After the extraction,
 * `RegistryClientError` lives in `@modularcore/registry-client` and extends `Error`
 * directly, so the catch must explicitly check `instanceof RegistryClientError` too — if
 * that check is ever dropped, a 404/network/parse error from the registry would fall
 * through to `main().catch()`'s "Unexpected error" branch and print a raw stack trace to
 * the user instead of a clean one-line message.
 */
describe('formatCliTopLevelError (CLI top-level error formatting)', () => {
  let server: TestRegistryServer;

  afterEach(async () => {
    await server?.close();
  });

  it('formats a real RegistryClientError from a 404 registry response as a single clean line', async () => {
    server = await startTestRegistryServer({});
    const client = createRegistryClient(server.url);

    let caught: unknown;
    try {
      await client.getDescriptor('missing');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeDefined();
    const formatted = formatCliTopLevelError(caught);
    expect(formatted).toBeDefined();
    expect(formatted).toMatch(/^\[modularcore\] /);
    expect(formatted).not.toContain('\n');
    expect(formatted).not.toMatch(/at .*\(.*:\d+:\d+\)/); // no stack-trace-shaped line
  });

  it('formats a CliError the same clean way', () => {
    const formatted = formatCliTopLevelError(new CliError('algo salió mal'));
    expect(formatted).toBe('[modularcore] algo salió mal');
  });

  it('returns undefined for an unexpected error so it is rethrown, not hidden', () => {
    expect(formatCliTopLevelError(new Error('bug inesperado'))).toBeUndefined();
  });
});
