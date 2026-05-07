import { prisma } from './prisma'
import { AuditActionType } from '@prisma/client'
import crypto from 'crypto'

export interface AuditEntry {
  actorId?: string
  actorAddress?: string
  actionType: AuditActionType
  entityType: string
  entityId: string
  beforeState?: object
  afterState?: object
  metadata?: object
}

/**
 * Write a chained audit log entry.
 * SHA-256 contentHash is chained to the previous entry's hash (Req 14.1, 14.2).
 * Throws on write failure — callers must NOT proceed if this throws (Req 14.5).
 */
export async function writeAuditLog(entry: AuditEntry) {
  const last = await prisma.auditLog.findFirst({ orderBy: { createdAt: 'desc' } })
  const previousHash = last?.contentHash ?? null

  const content = JSON.stringify({ ...entry, previousHash, timestamp: new Date().toISOString() })
  const contentHash = crypto.createHash('sha256').update(content).digest('hex')

  try {
    return await prisma.auditLog.create({
      data: { ...entry, contentHash, previousHash },
    })
  } catch (err) {
    // Log to error sink and re-throw — operation must halt (Req 14.5)
    console.error('[AuditService] CRITICAL: audit write failed', { entry, err })
    throw new Error(`Audit write failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

/**
 * Wraps an operation with an audit write guard.
 * The audit entry is written FIRST; if it fails the operation never runs (Req 14.5).
 */
export async function withAudit<T>(entry: AuditEntry, operation: () => Promise<T>): Promise<T> {
  await writeAuditLog(entry)
  return operation()
}
