/**
 * Base for every error the CLI raises deliberately (validation gates, network,
 * config). Kept distinct from unexpected exceptions so `index.ts` can print a
 * clean message instead of a stack trace for known failure modes.
 */
export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}

export class RegistryClientError extends CliError {
  constructor(message: string) {
    super(message);
    this.name = 'RegistryClientError';
  }
}

export class CompatibilityError extends CliError {
  constructor(message: string) {
    super(message);
    this.name = 'CompatibilityError';
  }
}

export class DependencyCycleError extends CliError {
  constructor(message: string) {
    super(message);
    this.name = 'DependencyCycleError';
  }
}

/** Raised when a Clack prompt is cancelled (Ctrl+C / Esc) so callers can abort cleanly. */
export class PromptCancelledError extends CliError {
  constructor() {
    super('Operation cancelled.');
    this.name = 'PromptCancelledError';
  }
}
