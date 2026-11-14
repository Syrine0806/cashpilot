import "server-only";
import type { Tx } from "./db";

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
}

/** Writes an audit-trail entry inside the caller's transaction. */
export async function audit(tx: Tx, companyId: string, actorId: string, entry: AuditEntry): Promise<void> {
  await tx.auditLog.create({ data: { companyId, actorId, ...entry } });
}
