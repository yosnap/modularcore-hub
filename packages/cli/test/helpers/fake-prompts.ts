import type { PromptAdapter, SelectOption } from '../../src/prompts.js';

/**
 * Scripted, non-interactive stand-in for `@clack/prompts` used across CLI tests: answers
 * are queued in call order per prompt kind, so tests stay deterministic without a TTY.
 */
export function createFakePrompts(answers: {
  confirm?: boolean[];
  text?: string[];
  select?: string[];
}): PromptAdapter {
  const confirmQueue = [...(answers.confirm ?? [])];
  const textQueue = [...(answers.text ?? [])];
  const selectQueue = [...(answers.select ?? [])];

  return {
    intro() {},
    outro() {},
    note() {},
    async confirm() {
      if (confirmQueue.length === 0) throw new Error('fake-prompts: no queued confirm() answer');
      return confirmQueue.shift()!;
    },
    async text(_message: string, defaultValue?: string) {
      if (textQueue.length === 0) return defaultValue ?? '';
      return textQueue.shift()!;
    },
    async select(_message: string, options: SelectOption[]) {
      if (selectQueue.length === 0) return options[0]!.value;
      return selectQueue.shift()!;
    },
  };
}
