import { Server } from 'http';
import toobusy from 'toobusy-js';

import logger from '../../util/logger';

/**
 * Gracefully shuts down the application server.
 *
 * @param server - Node.js server.
 * @param signal - Signal to be placed in standard output.
 * @param code - Exit error code.
 */
export async function shutdownServer(
  server: Server,
  signal: string,
  code: number
) {
  const stoppingInfrastructures = [toobusy.shutdown()];

  // Shuts down the server, then synchronously stop the infrastructure.
  logger.info(`Received ${signal}. Shutting down gracefully.`);
  server.close(() => {
    Promise.all(stoppingInfrastructures)
      .then(() => {
        logger.info(`Server has closed due to ${signal} signal.`);
        process.exit(code);
      })
      .catch((err) => {
        logger.error('Failed to shut down infrastructures due to an error.');
        logger.error(err);
        process.exit(1);
      });
  });

  // If fail to shut down in time (30 secs), forcefully shutdown.
  setTimeout(() => {
    logger.error('Graceful shutdown timeout, forcing exit.');
    process.exit(1);
  }, 30000);
}
