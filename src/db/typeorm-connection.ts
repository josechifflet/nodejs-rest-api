import 'reflect-metadata';

import { DataSource } from 'typeorm';

import config from '../config';
import logger from '../util/logger';
import { dbDataSource } from './typeorm.config';
import { dbTestDataSource } from './typeorm.test.config';

export class TypeORMConnectionInstance {
  private static instance: TypeORMConnectionInstance;
  public dataSource: DataSource;

  constructor() {
    this.dataSource =
      config.NODE_ENV === 'test' ? dbTestDataSource : dbDataSource;
  }

  static getInstance() {
    if (!TypeORMConnectionInstance.instance) {
      TypeORMConnectionInstance.instance = new TypeORMConnectionInstance();
    }
    return TypeORMConnectionInstance.instance;
  }

  /**
   * Connects to the data source instance.
   * If NODE_ENV is 'test' then connects to the typeorm.test.config.ts data-source.
   * If not, connects to the typeorm.config.ts data-source.
   */
  public connect = async (): Promise<void> => {
    try {
      await this.dataSource.initialize();
      await this.runMigrations();
      logger.info('Successfully connected to the Postgres instance!');
    } catch (error) {
      logger.error('Error connecting to the Postgres database:', error);
      throw error;
    }
  };

  public disconnect = async (): Promise<void> => {
    try {
      await this.dataSource.destroy();
      logger.info('Successfully disconnected from the Postgres instance!');
    } catch (err) {
      logger.error(`${err}`);
    }
  };

  public syncModels = async (dropBefore: boolean) => {
    try {
      await this.dataSource.synchronize(dropBefore);
      logger.info('Synchronization between API models and Postgres was done!');
    } catch (err) {
      logger.error(
        'Synchronization between API models models and Postgres failed'
      );
    }
  };

  public runMigrations = async (): Promise<boolean> => {
    try {
      logger.info('Running migrations...');
      const hasPendingMigrations = await this.dataSource.showMigrations();
      if (hasPendingMigrations) {
        const appliedMigrations = await this.dataSource.runMigrations();
        logger.info(
          `${
            appliedMigrations?.length || 0
          } migrations were successfully applied!`
        );
      } else logger.info(`There is no pending migration to apply!`);
      return true;
    } catch (err) {
      logger.error(`Error running migrations. ERROR: ${err}`);
      return false;
    }
  };
}
export const typeormInstance = TypeORMConnectionInstance.getInstance();
