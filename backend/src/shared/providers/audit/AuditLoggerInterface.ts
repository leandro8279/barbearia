export interface AuditEntry {
  actorId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}

export interface IAuditLogger {
  log(entry: AuditEntry): Promise<void>;
}
