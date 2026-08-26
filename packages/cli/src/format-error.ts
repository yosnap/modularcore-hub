import { RegistryClientError } from '@modularcore/registry-client';

import { CliError } from './errors.js';

/**
 * Single-line clean message for every deliberate error the CLI raises (`CliError` and its
 * subclasses) or that `@modularcore/registry-client` raises (network error, 404, invalid
 * JSON, schema mismatch) — `undefined` for anything else, so the top-level catch in
 * `index.ts` rethrows unexpected errors instead of hiding a real bug behind a fake "clean"
 * message. Kept in its own module (instead of inline in `index.ts`, which runs `main()` as
 * a side effect on import) so the 404-produces-a-clean-message contract has direct unit
 * test coverage without spawning the CLI process.
 */
export function formatCliTopLevelError(error: unknown): string | undefined {
  if (error instanceof CliError || error instanceof RegistryClientError) {
    return `[modularcore] ${error.message}`;
  }
  return undefined;
}
