import { describe, expect, it } from 'vitest';

import { Chat } from '../../core/chat.js';

/**
 * S1: real smoke against live OpenRouter. Requires OPENROUTER_API_KEY — without it this suite
 * skips cleanly instead of failing the whole `test:smoke` run, matching the pattern in
 * `@modularcore/media-picker`'s `test/smoke/cloudinary.smoke.test.ts`. CI's `smokes` job (see
 * `.github/workflows/ci.yml`) sets `OPENROUTER_API_KEY` from a repository secret that is not
 * configured yet — until it is, this suite keeps skipping there too.
 */
const { OPENROUTER_API_KEY } = process.env;
const hasOpenRouterEnv = Boolean(OPENROUTER_API_KEY);

describe.skipIf(!hasOpenRouterEnv)('ai-chat — real OpenRouter smoke', () => {
  it('streams a real completion end to end and reaches idle with content', async () => {
    const chat = new Chat({
      apiKey: OPENROUTER_API_KEY!,
      models: ['openrouter/auto'],
      systemPrompt: 'Reply with exactly one short sentence.',
    });

    await chat.send('Say hello in one short sentence.');

    expect(chat.getState().status).toBe('idle');
    expect(chat.getState().error).toBeNull();
    const assistant = chat.getState().messages.find((m) => m.role === 'assistant');
    expect(assistant?.content).toBeTruthy();
  }, 30_000);
});

if (!hasOpenRouterEnv) {
  it.skip('OpenRouter smoke skipped: OPENROUTER_API_KEY not set', () => {});
}
