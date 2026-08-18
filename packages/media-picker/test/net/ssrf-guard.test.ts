import { describe, expect, it } from 'vitest';

import { assertSafeRemoteUrl, isPrivateOrLocalIp } from '../../core/net/ssrf-guard.js';

describe('isPrivateOrLocalIp', () => {
  it.each([
    ['127.0.0.1', true],
    ['169.254.169.254', true], // cloud metadata endpoint
    ['10.0.0.5', true],
    ['172.16.0.1', true],
    ['192.168.1.1', true],
    ['0.0.0.0', true],
    ['::1', true],
    ['fc00::1', true],
    ['fe80::1', true],
    ['::ffff:127.0.0.1', true],
    ['8.8.8.8', false],
    ['93.184.216.34', false],
  ])('%s -> private=%s', (ip, expected) => {
    expect(isPrivateOrLocalIp(ip)).toBe(expected);
  });
});

describe('assertSafeRemoteUrl (real DNS/IP validation, not mocked)', () => {
  it('rejects http:// by default', async () => {
    await expect(assertSafeRemoteUrl(new URL('http://example.com/file.png'))).rejects.toThrow(
      /only https/,
    );
  });

  it('allows http:// when allowHttp is set', async () => {
    const addresses = await assertSafeRemoteUrl(new URL('http://example.com/file.png'), {
      allowHttp: true,
    });
    expect(addresses.length).toBeGreaterThan(0);
  });

  it('rejects a literal loopback IP', async () => {
    await expect(assertSafeRemoteUrl(new URL('https://127.0.0.1/secret'))).rejects.toThrow(
      /private\/local address/,
    );
  });

  it('rejects the cloud metadata endpoint IP', async () => {
    await expect(
      assertSafeRemoteUrl(new URL('https://169.254.169.254/latest/meta-data')),
    ).rejects.toThrow(/private\/local address/);
  });

  it('rejects an RFC1918 private IP', async () => {
    await expect(assertSafeRemoteUrl(new URL('https://10.0.0.5/internal'))).rejects.toThrow(
      /private\/local address/,
    );
  });

  it('accepts a public https URL and returns the resolved addresses (real DNS, not mocked) for pinning', async () => {
    const addresses = await assertSafeRemoteUrl(new URL('https://example.com/file.png'));
    expect(addresses.length).toBeGreaterThan(0);
    expect(addresses.every((entry) => entry.family === 4 || entry.family === 6)).toBe(true);
  });
});
