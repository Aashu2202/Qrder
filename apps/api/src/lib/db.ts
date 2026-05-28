import { createDb } from '@qrder/db';
import { env } from '../config/env.js';

const { db, client } = createDb({
  url: env.DATABASE_URL,
  max: 10,
  ssl: env.NODE_ENV === 'production' ? 'require' : undefined,
});

export { db, client };
