/**
 * SA5 (red-team, High): the "remote URL" source lets a caller make this process issue a
 * `fetch`. Without guards that's a classic SSRF primitive — an attacker-supplied URL could
 * target the cloud metadata endpoint (169.254.169.254), a loopback admin panel, or an
 * internal-only service. This module is the shared validation used before any such fetch.
 *
 * DNS resolution (`node:dns/promises`) only exists in Node. In a browser, the runtime's own
 * fetch resolves DNS out-of-process and this module cannot intercept that — literal-IP
 * hostnames are still checked, but a malicious DNS answer for a *name* cannot be inspected
 * client-side. Server-side callers (SSR, API routes, background jobs) are the primary threat
 * model here and MUST keep this guard in the request path; do not remove it "because the
 * browser already sandboxes fetch" — server-side fetches have no such sandbox.
 */

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export function isIPv4(value: string): boolean {
  const match = IPV4_PATTERN.exec(value);
  if (!match) return false;
  return match.slice(1, 5).every((octet) => Number(octet) <= 255);
}

function ipv4Octets(value: string): [number, number, number, number] {
  const match = IPV4_PATTERN.exec(value);
  if (!match) throw new Error(`media-picker: "${value}" is not a valid IPv4 address`);
  const [a, b, c, d] = match.slice(1, 5).map(Number);
  return [a as number, b as number, c as number, d as number];
}

function isPrivateOrLocalIPv4(value: string): boolean {
  const [a, b] = ipv4Octets(value);
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // RFC1918
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local incl. cloud metadata (169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 168) return true; // RFC1918
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT (RFC6598)
  if (a >= 224) return true; // multicast/reserved
  return false;
}

function isPrivateOrLocalIPv6(rawValue: string): boolean {
  const value = rawValue.toLowerCase();
  if (value === '::1') return true; // loopback
  if (value === '::') return true; // unspecified
  if (value.startsWith('fe80:') || value.startsWith('fe80::')) return true; // link-local
  if (/^f[cd][0-9a-f]{2}:/.test(value)) return true; // fc00::/7 unique local
  // IPv4-mapped IPv6 (::ffff:a.b.c.d) — unwrap and re-check as IPv4.
  const mapped = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(value);
  if (mapped) return isPrivateOrLocalIPv4(mapped[1] as string);
  return false;
}

export function isIpAddress(hostname: string): boolean {
  return isIPv4(hostname) || hostname.includes(':');
}

export function isPrivateOrLocalIp(ip: string): boolean {
  return ip.includes(':') ? isPrivateOrLocalIPv6(ip) : isPrivateOrLocalIPv4(ip);
}

export interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

async function resolveHostname(hostname: string): Promise<ResolvedAddress[]> {
  if (isIPv4(hostname)) return [{ address: hostname, family: 4 }];
  if (hostname.includes(':')) return [{ address: hostname, family: 6 }];
  const isNode = typeof process !== 'undefined' && process.versions?.node !== undefined;
  if (!isNode) return [];
  const { lookup } = await import('node:dns/promises');
  const results = await lookup(hostname, { all: true });
  return results.map((entry) => ({ address: entry.address, family: entry.family as 4 | 6 }));
}

export interface AssertSafeUrlOptions {
  allowHttp?: boolean;
}

/**
 * Throws if `url` is not an allowed target for a server-issued fetch: wrong protocol, or any
 * resolved address in a private/loopback/link-local range. Returns the resolved addresses so
 * the caller can *pin* the subsequent connection to one of them — resolving again at fetch
 * time (as opposed to reusing this result) would reopen a DNS-rebinding TOCTOU window: an
 * attacker's nameserver can answer a public IP for this check and a private one moments later
 * for the real connection. See `pinDispatcherToAddress` in `sources.ts` for the Node-only
 * enforcement side of this; there is no equivalent hook for a browser's native fetch, which is
 * why this remains a Node/server-side guard first and foremost (see module doc above).
 */
export async function assertSafeRemoteUrl(
  url: URL,
  options: AssertSafeUrlOptions = {},
): Promise<ResolvedAddress[]> {
  const { allowHttp = false } = options;
  if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) {
    throw new Error(
      `media-picker: refusing to fetch "${url.protocol}" URL (only https: is allowed by default; pass allowHttp to opt in)`,
    );
  }

  const addresses = await resolveHostname(url.hostname);
  for (const { address } of addresses) {
    if (isPrivateOrLocalIp(address)) {
      throw new Error(
        `media-picker: refusing to fetch URL resolving to a private/local address (${address})`,
      );
    }
  }
  return addresses;
}
