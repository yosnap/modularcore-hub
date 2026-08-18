import * as clack from '@clack/prompts';

import { PromptCancelledError } from './errors.js';

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

/**
 * Thin wrapper over `@clack/prompts` behind an interface, so commands can be tested with
 * a scripted fake adapter instead of driving a real (non-interactive-hostile) TTY prompt.
 */
export interface PromptAdapter {
  intro(message: string): void;
  outro(message: string): void;
  note(message: string, title?: string): void;
  confirm(message: string, initialValue?: boolean): Promise<boolean>;
  text(message: string, defaultValue?: string): Promise<string>;
  select(message: string, options: SelectOption[]): Promise<string>;
}

export const clackPromptAdapter: PromptAdapter = {
  intro(message) {
    clack.intro(message);
  },
  outro(message) {
    clack.outro(message);
  },
  note(message, title) {
    clack.note(message, title);
  },
  async confirm(message, initialValue = true) {
    const result = await clack.confirm({ message, initialValue });
    if (clack.isCancel(result)) throw new PromptCancelledError();
    return result;
  },
  async text(message, defaultValue) {
    const result = await clack.text({ message, placeholder: defaultValue, defaultValue });
    if (clack.isCancel(result)) throw new PromptCancelledError();
    return result ?? defaultValue ?? '';
  },
  async select(message, options) {
    const result = await clack.select({
      message,
      options: options.map((option) => ({
        value: option.value,
        label: option.label,
        hint: option.hint,
      })),
    });
    if (clack.isCancel(result)) throw new PromptCancelledError();
    return result as string;
  },
};
