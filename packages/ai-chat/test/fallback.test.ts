import { describe, expect, it, vi } from 'vitest';

import { AllModelsFailedError, withModelFallback } from '../core/fallback.js';

describe('withModelFallback', () => {
  it('returns the first model result when it succeeds', async () => {
    const attempt = vi.fn(async (model: string) => `ok:${model}`);
    const result = await withModelFallback(['model-a', 'model-b'], attempt);
    expect(result).toBe('ok:model-a');
    expect(attempt).toHaveBeenCalledOnce();
  });

  it('falls back to the second model when the first fails', async () => {
    const attempt = vi.fn(async (model: string) => {
      if (model === 'model-a') throw new Error('rate limited');
      return `ok:${model}`;
    });
    const result = await withModelFallback(['model-a', 'model-b'], attempt);
    expect(result).toBe('ok:model-b');
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it('throws AllModelsFailedError with every failure when all models fail', async () => {
    const attempt = vi.fn(async (model: string) => {
      throw new Error(`${model} failed`);
    });
    await expect(withModelFallback(['model-a', 'model-b'], attempt)).rejects.toThrow(
      AllModelsFailedError,
    );
    try {
      await withModelFallback(['model-a', 'model-b'], attempt);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AllModelsFailedError);
      expect((error as AllModelsFailedError).attempts).toHaveLength(2);
    }
  });

  it('rethrows an AbortError immediately instead of trying the next model', async () => {
    const attempt = vi.fn(async (model: string) => {
      if (model === 'model-a') {
        const error = new Error('aborted');
        error.name = 'AbortError';
        throw error;
      }
      return 'unreachable';
    });
    await expect(withModelFallback(['model-a', 'model-b'], attempt)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(attempt).toHaveBeenCalledOnce();
  });

  it('rejects an empty model list', async () => {
    await expect(withModelFallback([], async () => 'x')).rejects.toThrow(/at least one model/);
  });
});
