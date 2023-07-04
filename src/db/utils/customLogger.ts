import {
  AdvancedConsoleLogger,
  Logger,
  LoggerOptions,
  QueryRunner,
} from 'typeorm';

import config from '../../config';

export class CustomLogger extends AdvancedConsoleLogger implements Logger {
  constructor(options?: LoggerOptions) {
    super(options);
  }

  logQuerySlow(
    time: number,
    query: string,
    parameters?: any[] | undefined,
    queryRunner?: QueryRunner | undefined
  ): void {
    if (!this.isLogEnabledFor('query-slow')) return;

    /**
     * Default implementation of logQuerySlow() from AdvancedConsoleLogger.js (node_modules/typeorm/logger/AdvancedConsoleLogger.js)
     */
    this.writeLog(
      'warn',
      [
        {
          type: 'query-slow',
          prefix: 'query is slow',
          message: query,
          format: 'sql',
          parameters,
          additionalInfo: {
            time,
          },
        },
        {
          type: 'query-slow',
          prefix: 'execution time',
          message: time,
        },
      ],
      queryRunner
    );

    if (config.NODE_ENV === 'production') {
      /**
       * Add log to CloudWatch:
       */
      try {
        const logText = `Slow query: ${query} - Execution time: ${time}ms`;
        console.log(logText);
      } catch (error) {
        console.error(error);
      }
    }
  }

  logQueryError(
    error: string,
    query: string,
    parameters?: any[] | undefined,
    queryRunner?: QueryRunner | undefined
  ): void {
    if (!this.isLogEnabledFor('query-error')) return;

    /**
     * Default implementation of logQueryError() from AdvancedConsoleLogger.js (node_modules/typeorm/logger/AdvancedConsoleLogger.js)
     */
    this.writeLog(
      'warn',
      [
        {
          type: 'query-error',
          prefix: 'query failed',
          message: query,
          format: 'sql',
          parameters,
        },
        {
          type: 'query-error',
          prefix: 'error',
          message: error,
        },
      ],
      queryRunner
    );

    if (config.NODE_ENV === 'production') {
      /**
       * Add log to CloudWatch:
       */
      try {
        const logText = `Query error: ${query} - Error: ${error}`;
        console.log(logText);
      } catch (error) {
        console.error(error);
      }
    }
  }
}
