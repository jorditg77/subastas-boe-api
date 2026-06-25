import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools.js';
import { logger } from '../api/middleware/logger.js';

export function buildMcpServer() {
  const server = new McpServer({
    name: 'subastas-boe-api',
    version: '0.1.0',
  });

  registerTools(server);

  return server;
}

export async function startMcpServer() {
  const server = buildMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Servidor MCP de subastas-boe-api escuchando por stdio');
  return server;
}
