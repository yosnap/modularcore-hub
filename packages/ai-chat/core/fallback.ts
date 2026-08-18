/** Multi-model fallback: try each model in order, stop at the first that succeeds. */

export interface FallbackAttemptFailure {
  model: string;
  error: Error;
}

export class AllModelsFailedError extends Error {
  constructor(public readonly attempts: readonly FallbackAttemptFailure[]) {
    super(
      `ai-chat: all ${attempts.length} model(s) failed — ` +
        attempts.map((a) => `${a.model}: ${a.error.message}`).join('; '),
    );
    this.name = 'AllModelsFailedError';
  }
}

/**
 * Runs `attempt` for each model in `models`, in order, returning the first successful result.
 * A user-initiated cancellation (`AbortError`) is rethrown immediately instead of falling
 * through to the next model — an abort means "stop", not "this model failed".
 */
export async function withModelFallback<T>(
  models: readonly string[],
  attempt: (model: string) => Promise<T>,
): Promise<T> {
  if (models.length === 0) {
    throw new Error('ai-chat: withModelFallback requires at least one model');
  }

  const failures: FallbackAttemptFailure[] = [];
  for (const model of models) {
    try {
      return await attempt(model);
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      if (normalized.name === 'AbortError') throw normalized;
      failures.push({ model, error: normalized });
    }
  }
  throw new AllModelsFailedError(failures);
}
