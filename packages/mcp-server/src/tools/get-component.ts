import { z } from 'zod';

import { toolError } from './tool-error.js';
import { UNTRUSTED_CONTENT_NOTICE } from './untrusted-content.js';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RegistryClient } from '@modularcore/registry-client';

const inputSchema = {
  name: z
    .string()
    .min(1)
    .describe('Exact component name (kebab-case), as returned by search_components.'),
};

export function registerGetComponentTool(server: McpServer, client: RegistryClient): void {
  server.registerTool(
    'get_component',
    {
      title: 'Get component descriptor',
      description:
        'Read-only fetch of a single component full descriptor from the ModularCore registry ' +
        '(no filesystem writes, no elicitation). Includes file list, envVariables, and npm ' +
        'dependencies, but not file contents. ' +
        UNTRUSTED_CONTENT_NOTICE,
      inputSchema,
    },
    async ({ name }) => {
      try {
        const descriptor = await client.getDescriptor(name);
        const summary = {
          name: descriptor.name,
          version: descriptor.version,
          title: descriptor.title,
          type: descriptor.type,
          category: descriptor.category,
          frameworks: descriptor.frameworks,
          dependencies: descriptor.dependencies,
          registryDependencies: descriptor.registryDependencies,
          envVariables: descriptor.envVariables,
          description: descriptor.description,
          files: descriptor.files.map((file) => ({
            path: file.path,
            target: file.target,
            type: file.type,
          })),
        };
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { notice: UNTRUSTED_CONTENT_NOTICE, component: summary },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
