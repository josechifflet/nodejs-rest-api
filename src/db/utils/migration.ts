import fs from 'fs';
import path from 'path';
import { format } from 'sql-formatter';

import { dbDataSource } from '../typeorm.config';

const { writeFileSync } = fs;

function formatSql(query: string): string {
  const formattedQuery = format(query, { tabWidth: 4, language: 'postgresql' });
  return formattedQuery;
}

function toCamelCase(str: string): string {
  const words = str.split(/[^a-zA-Z0-9]/); // split string into words using non-alphanumeric characters
  const firstWord = words[0].toLowerCase();
  const restOfWords = words
    .slice(1)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

  return firstWord + restOfWords.join('');
}

async function fillMigrationData() {
  const timestamp = process.argv[2].split('-')[0];
  const migrationName = process.argv[2].split('-')[1];

  dbDataSource.setOptions({
    synchronize: false,
    migrationsRun: false,
    dropSchema: false,
    logging: false,
  });
  await dbDataSource.initialize();
  const sqlInMemory = await dbDataSource.driver.createSchemaBuilder().log();
  const upQueries = sqlInMemory.upQueries.map((upQuery) =>
    formatSql(`${upQuery.query};`)
  );
  const downQueries = sqlInMemory.downQueries.map((downQuery) =>
    formatSql(`${downQuery.query};`)
  );

  const migrationPath = path.resolve(
    __dirname,
    `../migrations/${timestamp}-${migrationName}`
  );
  writeFileSync(`${migrationPath}/up.sql`, upQueries.join('\n'));
  writeFileSync(`${migrationPath}/down.sql`, downQueries.join('\n'));
  const migrationIndexFileName = toCamelCase(`${migrationName}${timestamp}`);
  const migrationIndex = `
  import * as fs from 'fs';
  import * as path from 'path';
  import { MigrationInterface, QueryRunner } from 'typeorm';

  export class ${migrationIndexFileName} implements MigrationInterface {
    private readonly upSQL = path.resolve(
      __dirname,
      '../${timestamp}-${migrationName}/up.sql'
    )
    private readonly downSQL = path.resolve(
      __dirname,
      '../${timestamp}-${migrationName}/down.sql'
    )

    async up(queryRunner: QueryRunner): Promise<any> {
      const query = await new Promise<string>((resolve, reject) =>
        fs.readFile(this.upSQL, (err, data) => {
          if (err) reject(err);
          else resolve(data.toString());
        }),
      );
      const queries: string[] = [];
      query.split(';').forEach((q) => {
        const cleanQuery = q.trim();
        if (cleanQuery !== '') queries.push(cleanQuery);
      });
      queries.forEach(async (q) => await queryRunner.query(q));
    }

    async down(queryRunner: QueryRunner): Promise<any> {
      const query = await new Promise<string>((resolve, reject) =>
        fs.readFile(this.downSQL, (err, data) => {
          if (err) reject(err);
          else resolve(data.toString());
        }),
      );
      const queries: string[] = [];
      query.split(';').forEach((q) => {
        const cleanQuery = q.trim();
        if (cleanQuery !== '') queries.push(cleanQuery);
      });
      queries.forEach(async (q) => await queryRunner.query(q));
    }
  }`;
  writeFileSync(`${migrationPath}/index.ts`, migrationIndex);
}

fillMigrationData();
