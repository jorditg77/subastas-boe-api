import pino from 'pino';
import { env } from '../../config/index.js';

// En el servidor MCP por stdio, stdout está reservado exclusivamente para
// los mensajes JSON-RPC del protocolo; cualquier log ahí corrompería el
// stream y rompería al cliente (Claude Desktop, Cursor...). src/mcp/server.js
// fija MCP_STDIO=1 antes de cargar el resto de módulos (incluido este, vía
// la cadena de imports de los scrapers) para forzar los logs a stderr.
const isMcpStdio = process.env.MCP_STDIO === '1';

export const logger = pino(
  {
    level: env.logLevel,
    transport: !isMcpStdio && env.nodeEnv === 'development' ? { target: 'pino-pretty' } : undefined,
  },
  isMcpStdio ? pino.destination(2) : undefined
);
