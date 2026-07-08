import { randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { GovernanceActor } from '../context/GovernanceContext.js';

export type FaultSeverity = 'warn' | 'error' | 'fatal' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface FaultRecord {
  id: string;
  timestamp: number;
  invariantId: string;
  severity: 'warn' | 'error' | 'fatal';
  context: unknown;
  resolved: boolean;
  message?: string;
  actor?: GovernanceActor;
  action?: string;
  runId?: string;
  spanId?: string;
  faultCode?: string;
  contextSnapshot?: unknown;
  patchApplied?: string;
}

export interface FaultRecordInput {
  invariantId: string;
  severity: FaultSeverity;
  context?: unknown;
  message?: string;
  resolved?: boolean;
  timestamp?: number;
  id?: string;
  actor?: GovernanceActor;
  action?: string;
  runId?: string;
  spanId?: string;
  faultCode?: string;
  contextSnapshot?: unknown;
  patchApplied?: string;
}

export interface FaultJournalStoreOptions {
  storagePath?: string;
  seedRecords?: FaultRecord[];
}

function normalizeSeverity(severity: FaultSeverity): 'warn' | 'error' | 'fatal' {
  switch (severity) {
    case 'INFO':
    case 'WARN':
      return 'warn';
    case 'ERROR':
      return 'error';
    case 'CRITICAL':
      return 'fatal';
    default:
      return severity;
  }
}

function cloneRecord(record: FaultRecord): FaultRecord {
  return structuredClone(record);
}

export class FaultJournalStore {
  private readonly records: FaultRecord[] = [];
  private readonly storagePath?: string;

  constructor(options: FaultJournalStoreOptions = {}) {
    this.storagePath = options.storagePath;
    if (options.seedRecords?.length) {
      for (const record of options.seedRecords) {
        this.records.push(cloneRecord(record));
      }
    }
    if (this.storagePath && existsSync(this.storagePath)) {
      this.loadFromDisk();
    }
  }

  record(input: FaultRecordInput): FaultRecord {
    const record: FaultRecord = {
      id: input.id ?? randomUUID(),
      timestamp: input.timestamp ?? Date.now(),
      invariantId: input.invariantId,
      severity: normalizeSeverity(input.severity),
      context: input.context ?? input.contextSnapshot ?? null,
      resolved: input.resolved ?? false,
      message: input.message,
      actor: input.actor,
      action: input.action,
      runId: input.runId,
      spanId: input.spanId,
      faultCode: input.faultCode,
      contextSnapshot: input.contextSnapshot,
      patchApplied: input.patchApplied,
    };

    this.records.push(cloneRecord(record));
    this.persist(record);
    return cloneRecord(record);
  }

  recordFault(input: Omit<FaultRecordInput, 'context' | 'resolved' | 'timestamp' | 'id'> & {
    contextSnapshot?: unknown;
  }): FaultRecord {
    return this.record({
      ...input,
      context: input.contextSnapshot,
    });
  }

  resolve(id: string): FaultRecord | undefined {
    const record = this.records.find((entry) => entry.id === id);
    if (!record) {
      return undefined;
    }
    record.resolved = true;
    return cloneRecord(record);
  }

  getAll(): FaultRecord[] {
    return this.records.map((record) => cloneRecord(record));
  }

  getUnresolved(): FaultRecord[] {
    return this.records.filter((record) => !record.resolved).map((record) => cloneRecord(record));
  }

  getByInvariantId(invariantId: string): FaultRecord[] {
    return this.records
      .filter((record) => record.invariantId === invariantId)
      .map((record) => cloneRecord(record));
  }

  getBySeverity(severity: FaultRecord['severity']): FaultRecord[] {
    return this.records
      .filter((record) => record.severity === severity)
      .map((record) => cloneRecord(record));
  }

  getByRun(runId: string): FaultRecord[] {
    return this.records.filter((record) => record.runId === runId).map((record) => cloneRecord(record));
  }

  getBySpan(spanId: string): FaultRecord[] {
    return this.records.filter((record) => record.spanId === spanId).map((record) => cloneRecord(record));
  }

  getByFaultCode(faultCode: string): FaultRecord[] {
    return this.records.filter((record) => record.faultCode === faultCode).map((record) => cloneRecord(record));
  }

  countRecurrence(faultCode: string, invariantId?: string): number {
    return this.records.filter((record) => {
      if (record.faultCode !== faultCode) {
        return false;
      }
      return invariantId ? record.invariantId === invariantId : true;
    }).length;
  }

  getRecurrence(faultCode: string, invariantId?: string): number {
    return this.countRecurrence(faultCode, invariantId);
  }

  clear(): void {
    this.records.length = 0;
    if (this.storagePath) {
      writeFileSync(this.storagePath, '', { encoding: 'utf8' });
    }
  }

  private persist(record: FaultRecord): void {
    if (!this.storagePath) {
      return;
    }

    mkdirSync(dirname(this.storagePath), { recursive: true });
    appendFileSync(this.storagePath, `${JSON.stringify(record)}\n`, { encoding: 'utf8' });
  }

  private loadFromDisk(): void {
    if (!this.storagePath || !existsSync(this.storagePath)) {
      return;
    }

    const raw = readFileSync(this.storagePath, 'utf8');
    if (!raw.trim()) {
      return;
    }

    const parsed = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as FaultRecord);
    this.records.splice(0, this.records.length, ...parsed.map((record) => cloneRecord(record)));
  }
}
