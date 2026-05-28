import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { staff } from './staff';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    recipientStaffId: uuid('recipient_staff_id').references(() => staff.id, {
      onDelete: 'cascade',
    }),
    channel: varchar('channel', { length: 16 }).notNull(),
    type: varchar('type', { length: 32 }).notNull(),
    payload: jsonb('payload').notNull().$type<Record<string, unknown>>(),
    readAt: timestamp('read_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    recipientIdx: index('notifications_recipient_idx').on(t.recipientStaffId, t.readAt),
  }),
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    actorStaffId: uuid('actor_staff_id').references(() => staff.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 64 }).notNull(),
    entity: varchar('entity', { length: 32 }).notNull(),
    entityId: uuid('entity_id'),
    diff: jsonb('diff').$type<Record<string, unknown>>(),
    ip: varchar('ip', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('audit_logs_tenant_idx').on(t.tenantId, t.createdAt),
  }),
);
