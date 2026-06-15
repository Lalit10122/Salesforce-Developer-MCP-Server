import { runServer } from './server.js';
import { LoggerService } from './services/LoggerService.js';

runServer().catch((error) => {
  LoggerService.error({ error }, 'Fatal error starting Salesforce Developer MCP Server');
  process.exit(1);
});
