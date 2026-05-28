import { createServer } from 'node:http';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { createSocketServer } from './realtime/io.js';
import { logger } from './lib/logger.js';
import { client as dbClient } from './lib/db.js';

const app = createApp();
const httpServer = createServer(app);
const io = createSocketServer(httpServer);

httpServer.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'API listening');
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'shutting down');
  io.close();
  httpServer.close();
  await dbClient.end({ timeout: 5 });
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
