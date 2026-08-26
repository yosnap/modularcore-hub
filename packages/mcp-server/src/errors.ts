/**
 * Raised for any deliberate configuration/validation failure inside this package (bad CLI
 * flags, missing env var, insecure registry URL without opt-in, path-traversal attempts).
 * Kept separate from `@modularcore/registry-client`'s `RegistryClientError` so callers can
 * tell "this server is misconfigured" apart from "the registry HTTP call failed".
 */
export class McpServerConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpServerConfigError';
  }
}
