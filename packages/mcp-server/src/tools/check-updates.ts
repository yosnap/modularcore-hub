import { z } from 'zod';

import { toolError } from './tool-error.js';
import { UNTRUSTED_CONTENT_NOTICE } from './untrusted-content.js';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RegistryClient } from '@modularcore/registry-client';

const inputSchema = {
  installedComponents: z
    .array(
      z.object({
        name: z.string().min(1).describe('Component name as installed in the caller project.'),
        version: z.string().min(1).describe('Installed version string.'),
      }),
    )
    .describe(
      'Components currently installed in the caller project, as tracked by the caller (this ' +
        "server has no local install-state file, unlike the CLI's modularcore.json).",
    ),
};

type UpdateStatus = 'up-to-date' | 'outdated' | 'not-in-registry';

interface UpdateCheckResult {
  name: string;
  installedVersion: string;
  latestVersion: string | null;
  status: UpdateStatus;
}

export function registerCheckUpdatesTool(server: McpServer, client: RegistryClient): void {
  server.registerTool(
    'check_updates',
    {
      title: 'Check component updates',
      description:
        'Read-only comparison of `installedComponents` (name+version, supplied by the caller) ' +
        "against the registry index's current version per component. Plain string equality — " +
        'the registry index exposes one published version per name, not a semver range, so no ' +
        'semver comparison is performed. No filesystem writes, no elicitation. ' +
        UNTRUSTED_CONTENT_NOTICE,
      inputSchema,
    },
    async ({ installedComponents }) => {
      try {
        const index = await client.getIndex();
        const latestByName = new Map(index.map((entry) => [entry.name, entry.version]));
        const results: UpdateCheckResult[] = installedComponents.map(({ name, version }) => {
          const latestVersion = latestByName.get(name) ?? null;
          const status: UpdateStatus =
            latestVersion === null
              ? 'not-in-registry'
              : latestVersion === version
                ? 'up-to-date'
                : 'outdated';
          return { name, installedVersion: version, latestVersion, status };
        });
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
