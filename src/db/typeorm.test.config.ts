import path from 'path';
import { DataSource } from 'typeorm';

import { entities } from './models';

const DB_HOST = 'localhost';
const DB_PORT = 5431;
const DB_DATABASE = 'nodejs-rest-api-dev';
const DB_PASSWORD = 'postgres';
const DB_USERNAME = 'postgres';

/**
 * Only call this data source for integration test purposes
 */
export const dbTestDataSource = new DataSource({
  synchronize: true,
  type: 'postgres',
  host: DB_HOST,
  port: DB_PORT,
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  logging: ['error', 'warn', 'migration'],
  entities,
  migrations: [path.resolve(__dirname, 'migrations/*{.js,.ts}')],
  connectTimeoutMS: 10000,
  installExtensions: true,
});
