import path from 'path';
import { DataSource } from 'typeorm';

import config from '../config';

const { DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE, NODE_ENV } =
  config;
export const dbDataSource = new DataSource({
  type: 'postgres',
  host: DB_HOST,
  port: DB_PORT,
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  synchronize: true,
  logging: ['error', 'warn', 'migration'],
  entities: [path.resolve(__dirname, 'models/*.model{.js,.ts}')],
  migrations: [path.resolve(__dirname, 'migrations/**/index*{.js,.ts}')],
  connectTimeoutMS: 10000,
  ssl: NODE_ENV === 'production',
  installExtensions: true,
  extra: {
    // number of milliseconds to wait before timing out when connecting a new client
    connectionTimeoutMillis: 10000,
    // number of milliseconds a client must sit idle in the pool and not be checked out
    // before it is disconnected from the backend and discarded
    idleTimeoutMillis: 1000,
    // maximum number of clients the pool should contain
    max: 180,
  },
});
