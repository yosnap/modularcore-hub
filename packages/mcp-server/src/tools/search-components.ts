import { z } from 'zod';

import { toolError } from './tool-error.js';
import { UNTRUSTED_CONTENT_NOTICE } from './untrusted-content.js';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RegistryClient } from '@modularcore/registry-client';

const inputSchema = {
  query: z
    .string()
    .describe(
      'Free-text search matched against component name, title, and category (case-insensitive substring match).',
    ),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe('Max number of results to return. Defaults to 20.'),
};

const DEFAULT_LIMIT = 20;

export function registerSearchComponentsTool(server: McpServer, client: RegistryClient): void {
  server.registerTool(
    'search_components',
    {
      title: 'Search components',
      description:
        'Read-only search over the ModularCore registry index (no filesystem writes, no ' +
        'elicitation). Matches `query` against name/title/category. ' +
        UNTRUSTED_CONTENT_NOTICE,
      inputSchema,
    },
    async ({ query, limit }) => {
      try {
        const index = await client.getIndex();
        const needle = query.trim().toLowerCase();
        const matches = index.filter(
          (entry) =>
            entry.name.toLowerCase().includes(needle) ||
            entry.title.toLowerCase().includes(needle) ||
            entry.category.toLowerCase().includes(needle),
        );
        const results = matches.slice(0, limit ?? DEFAULT_LIMIT);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ notice: UNTRUSTED_CONTENT_NOTICE, results }, null, 2),
            },
          ],
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
