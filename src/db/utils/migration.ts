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
    upQuery.parameters
      ? formatSql(`${upQuery.query};`) + '\n' + `${upQuery.parameters};`
      : formatSql(`${upQuery.query};`)
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
  const migrationIndex = `import path from 'path';
import { BaseMigrationInterface } from '../../utils/migration-base';

export class ${migrationIndexFileName} extends BaseMigrationInterface {
  constructor() {
    super(
      path.resolve(__dirname, '../${timestamp}-${migrationName}/up.sql'), 
      path.resolve(__dirname, '../${timestamp}-${migrationName}/down.sql')
    );
  }
}`;
  writeFileSync(`${migrationPath}/_index.ts`, migrationIndex);
}
if (require.main === module) {
  void fillMigrationData();
}
