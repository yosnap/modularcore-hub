/**
 * Raised by `createRegistryClient` on any deliberate failure (network error, 404, invalid
 * JSON, schema mismatch). Extends `Error` directly — not the CLI's `CliError` — because this
 * package has no dependency on `@modularcore/cli` and must stay usable from other consumers
 * (e.g. the MCP server) that don't share the CLI's error hierarchy. Consumers that want the
 * CLI's clean single-line error formatting should catch `instanceof RegistryClientError`
 * alongside their own base error class.
 */
export class RegistryClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegistryClientError';
  }
}
