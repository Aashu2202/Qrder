import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { Config } from 'drizzle-kit';

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, '../../.env') });

export default {
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://qrder:qrder@localhost:5432/qrder',
  },
  strict: true,
  verbose: true,
} satisfies Config;
