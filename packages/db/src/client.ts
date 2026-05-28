import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

export type Database = ReturnType<typeof createDb>['db'];

export interface DbConfig {
  url: string;
  max?: number;
  ssl?: 'require' | 'prefer' | boolean;
}

export function createDb(config: DbConfig) {
  // postgres-js doesn't auto-parse sslmode from the URL query string —
  // detect it ourselves so Neon/Supabase URLs "just work".
  const inferredSsl: DbConfig['ssl'] = config.url.includes('sslmode=require') ? 'require' : undefined;
  const client = postgres(config.url, {
    max: config.max ?? 10,
    ssl: config.ssl ?? inferredSsl,
    prepare: false,
  });
  const db = drizzle(client, { schema, casing: 'snake_case' });
  return { db, client };
}

export { schema };
