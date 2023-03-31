#!/usr/bin/env -S npx tsx
import { $, fs } from 'zx';

void (async function () {
  // Migration name
  const input = process.argv[2];
  if (!input) {
    throw new Error('Please provide a migration name.');
  }

  const migrationName = input.trim().toLowerCase();

  const regex = /^[a-z0-9]+$/i;
  if (!regex.test(migrationName)) {
    throw new Error(
      'Invalid file name. Migration file name should contain only alphanumeric characters.'
    );
  }

  // Check if the file already exists
  if (fs.existsSync(migrationName)) {
    throw new Error('File already exists.');
  }

  // Get current timestamp
  const timestamp = new Date().getTime();

  // Create migration folder
  await $`mkdir -p ./src/db/migrations/${timestamp}-${migrationName}`;

  // Create up.sql and down.sql files in migration folder
  await $`touch ./src/db/migrations/${timestamp}-${migrationName}/up.sql`;
  await $`touch ./src/db/migrations/${timestamp}-${migrationName}/down.sql`;
  await $`touch ./src/db/migrations/${timestamp}-${migrationName}/index.ts`;

  // Call TypeScript function
  await $`ts-node ./src/db/utils/migration.ts ${timestamp}-${migrationName}`;
})();
