import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('Laravel AI Chat snippets', () => {
  it('uses a Vite entry instead of importing an unserved resources path from Blade', async () => {
    const [blade, entry] = await Promise.all([
      readFile(join(packageRoot, 'snippets/laravel/ai-chat.blade.php'), 'utf8'),
      readFile(join(packageRoot, 'snippets/laravel/ai-chat-entry.ts'), 'utf8'),
    ]);

    expect(blade).not.toContain('<script type="module">');
    expect(blade).toContain("Import ./modularcore/ai-chat/entry from resources/js/app.js");
    expect(entry).toContain("from './adapters/web/chat-element.js'");
  });

  it('keeps tool-call messages and tool definitions within the proxy contract', async () => {
    const [controller, descriptor, docs] = await Promise.all([
      readFile(join(packageRoot, 'snippets/laravel/chat-proxy-controller.php'), 'utf8'),
      readFile(join(packageRoot, 'modularcore.json'), 'utf8'),
      readFile(join(packageRoot, 'docs/laravel-blade-integration.md'), 'utf8'),
    ]);

    expect(controller).toContain('extends Controller');
    expect(controller).toContain('in:user,assistant,system,tool');
    expect(controller).toContain("'messages.*.tool_call_id'");
    expect(controller).toContain("'messages.*.tool_calls.*.function.arguments'");
    expect(controller).toContain("'tools.*.function.parameters'");
    expect(controller).toContain('Conversation tool payload is too large.');
    expect(controller).toContain("$payload['tools'] = $input['tools']");
    expect(descriptor).toContain('zod@^4.4.3');
    expect(docs).toContain('does not register client-side tools');
  });
});
