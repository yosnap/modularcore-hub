import { describe, expect, it } from 'vitest';

import { resolveConfig } from '../src/config.js';
import { McpServerConfigError } from '../src/errors.js';

describe('resolveConfig', () => {
  it('throws when neither the env var nor the flag are set (no production default)', () => {
    expect(() => resolveConfig([], {})).toThrow(McpServerConfigError);
  });

  it('reads registryUrl from MODULARCORE_REGISTRY_URL', () => {
    const config = resolveConfig([], { MODULARCORE_REGISTRY_URL: 'https://registry.example.com' });
    expect(config.registryUrl).toBe('https://registry.example.com');
  });

  it('lets --registry-url override the env var', () => {
    const config = resolveConfig(['--registry-url', 'https://flag.example.com'], {
      MODULARCORE_REGISTRY_URL: 'https://env.example.com',
    });
    expect(config.registryUrl).toBe('https://flag.example.com');
  });

  it('rejects http:// by default', () => {
    expect(() => resolveConfig([], { MODULARCORE_REGISTRY_URL: 'http://registry.example.com' })).toThrow(
      McpServerConfigError,
    );
  });

  it('allows http:// with MODULARCORE_REGISTRY_ALLOW_INSECURE=1', () => {
    const config = resolveConfig([], {
      MODULARCORE_REGISTRY_URL: 'http://localhost:5173/registry',
      MODULARCORE_REGISTRY_ALLOW_INSECURE: '1',
    });
    expect(config.registryUrl).toBe('http://localhost:5173/registry');
  });

  it('allows http:// with --allow-insecure-registry', () => {
    const config = resolveConfig(
      ['--registry-url', 'http://localhost:5173/registry', '--allow-insecure-registry'],
      {},
    );
    expect(config.registryUrl).toBe('http://localhost:5173/registry');
  });

  it('rejects a malformed URL', () => {
    expect(() => resolveConfig([], { MODULARCORE_REGISTRY_URL: 'not-a-url' })).toThrow(
      McpServerConfigError,
    );
  });
});
