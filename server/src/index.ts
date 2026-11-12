import { createApp } from './app';
import { env } from './config/env';
import { assertDbConnected } from './db/pool';
import { logger } from './utils/logger';
import { initSockets } from './sockets/index';

async function main() {
  try {
    await assertDbConnected();
    logger.info({ db: 'connected' }, 'Database connected');
  } catch (e) {
    logger.error({ e }, 'Failed to connect to DB');
    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'FreeHall API listening');
  });

  initSockets(server);
}

main().catch((e) => {
  logger.error({ e }, 'Fatal startup error');
  process.exit(1);
});