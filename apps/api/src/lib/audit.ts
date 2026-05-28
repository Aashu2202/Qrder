import { auditLogs } from '@qrder/db';
import { db } from './db';
import { logger } from './logger';

export interface AuditRecord {
  tenantId: string;
  actorStaffId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  /** Free-form diff/context. Stored as JSONB. */
  diff?: Record<string, unknown> | null;
  ip?: string | null;
}

/**
 * Append-only audit log writer. Best-effort — failures are logged but never thrown
 * (we don't want a writes-to-audit failure to roll back a real business mutation).
 */
export async function recordAudit(rec: AuditRecord): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      tenantId: rec.tenantId,
      actorStaffId: rec.actorStaffId,
      action: rec.action,
      entity: rec.entity,
      entityId: rec.entityId,
      diff: rec.diff ?? null,
      ip: rec.ip ?? null,
    });
  } catch (err) {
    logger.warn({ err, rec }, 'audit log write failed');
  }
}
