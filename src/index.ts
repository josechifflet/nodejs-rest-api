import app from './core/express/app';
import { startServer } from './core/express/start-server';
import logger from './util/logger';

(async () => {
  try {
    await startServer(app);
  } catch (err) {
    logger.error(`Exec file error.`);
  }
})();
