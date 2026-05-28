import { Router, type Router as ExpressRouter } from 'express';
import { sql } from 'drizzle-orm';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { db } from '../../lib/db.js';

const router: ExpressRouter = Router();

router.get('/', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

router.get(
  '/db',
  asyncHandler(async (_req, res) => {
    const result = await db.execute(sql`select 1 as ok`);
    res.json({ status: 'ok', result: result[0] });
  }),
);

export const healthRouter = router;
