// Bootstrap: fija MCP_STDIO antes de que cualquier import transitivo cargue
// el logger compartido (api/middleware/logger.js), que decide en su propio
// momento de carga si escribe a stdout o a stderr. Por eso el import del
// runtime real es dinámico: un import estático se resolvería antes de que
// la línea siguiente llegue a ejecutarse.
process.env.MCP_STDIO = '1';

const { startMcpServer } = await import('./runtime.js');

startMcpServer().catch((err) => {
  process.stderr.write(`Failed to start MCP server: ${err.stack || err.message}\n`);
  process.exit(1);
});
