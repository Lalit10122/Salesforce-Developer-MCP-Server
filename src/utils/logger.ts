import pino from 'pino';
import { config } from '../config/index.js';

// All logging must go to stderr (file descriptor 2) so it doesn't pollute stdout,
// which is used for the MCP stdio JSON-RPC communication channel.
export const logger = pino(
  {
    level: config.logLevel,
    transport: process.env.NODE_ENV !== 'production' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'SYS:standard',
        destination: 2, // Redirect pretty log to stderr
      },
    } : undefined,
  },
  process.env.NODE_ENV === 'production' ? pino.destination(2) : undefined
);
