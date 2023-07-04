import winston from 'winston';

/**
 * Convenient logger for almost anything.
 */
const logger = winston.createLogger({
  // Log if level is 'info' or lower.
  level: 'info',

  // Logger format.
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),

  // Logger transports.
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],

  // Exit on error, set to false.
  exitOnError: false,
});

export default logger;
