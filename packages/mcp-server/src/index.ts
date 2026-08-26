#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createRegistryClient } from '@modularcore/registry-client';

import { resolveConfig } from './config.js';
import { registerCheckUpdatesTool } from './tools/check-updates.js';
import { registerGetComponentTool } from './tools/get-component.js';
import { registerInstallComponentTool } from './tools/install-component.js';
import { registerSearchComponentsTool } from './tools/search-components.js';

/**
 * Tool-call serialization (Red-team #9): confirmed against SDK 1.30.0's
 * `InMemoryTransport`/`Server.elicitInput` behavior (see `test/install-component.test.ts`,
 * "does not block other tool calls" case) — tool calls on the same stdio session are NOT
 * serialized. `install_component` awaiting an `elicitation/create` response does not block
 * `search_components`/`get_component`/`check_updates` (or a second `install_component` call)
 * from running concurrently on the same connection. Each `install_component` call only holds
 * its own elicitation round-trip; there is no server-wide lock.
 */
export async function main(): Promise<void> {
  const config = resolveConfig();
  const client = createRegistryClient(config.registryUrl);

  const server = new McpServer({ name: '@modularcore/mcp-server', version: '0.1.0' });

  registerSearchComponentsTool(server, client);
  registerGetComponentTool(server, client);
  registerInstallComponentTool(server, client, config.projectRoot);
  registerCheckUpdatesTool(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const isEntryPoint = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isEntryPoint) {
  main().catch((error) => {
    console.error(`[@modularcore/mcp-server] fatal: ${(error as Error).message}`);
    process.exit(1);
  });
}
