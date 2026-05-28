import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDb } from './client';

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, '../../../.env') });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const { db, client } = createDb({ url, max: 1 });

try {
  console.log('Running migrations…');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations applied.');
} finally {
  await client.end();
}
