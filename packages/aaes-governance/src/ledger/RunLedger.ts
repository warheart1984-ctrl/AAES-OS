import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { LEDGER_GENESIS_HASH, type LedgerEntry, type LedgerEntryInput } from './LedgerEntry.js';

export interface RunLedgerOptions {
  storagePath?: string;
  seedEntries?: LedgerEntry[];
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'bigint') {
    return JSON.stringify(value.toString());
  }
  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return `{${entries
    .map(([key, child]) => `${JSON.stringify(key)}:${stableSerialize(child)}`)
    .join(',')}}`;
}

function computeLedgerHash(entry: LedgerEntryInput): string {
  return createHash('sha256')
    .update(
      stableSerialize({
        id: entry.id,
        parentHash: entry.parentHash,
        timestamp: entry.timestamp,
        actor: entry.actor,
        action: entry.action,
        payload: entry.payload,
      }),
    )
    .digest('hex');
}

function cloneEntry(entry: LedgerEntry): LedgerEntry {
  return structuredClone(entry);
}

export class RunLedger {
  private readonly entries: LedgerEntry[] = [];
  private readonly storagePath?: string;

  constructor(options: RunLedgerOptions = {}) {
    this.storagePath = options.storagePath;

    if (options.seedEntries?.length) {
      for (const entry of options.seedEntries) {
        this.entries.push(cloneEntry(entry));
      }
    }

    if (this.storagePath && existsSync(this.storagePath)) {
      this.loadFromDisk();
    }
  }

  append(entry: LedgerEntryInput): LedgerEntry {
    const latest = this.getLatest();
    const expectedParentHash = latest?.hash ?? LEDGER_GENESIS_HASH;
    const parentHash = entry.parentHash && entry.parentHash.length > 0 ? entry.parentHash : expectedParentHash;
    if (latest && parentHash !== expectedParentHash) {
      throw new Error(`Ledger parent-hash mismatch: expected ${expectedParentHash}, received ${parentHash}`);
    }
    const sealed: LedgerEntry = {
      ...entry,
      id: entry.id || randomUUID(),
      parentHash,
      hash: computeLedgerHash({ ...entry, parentHash }),
    };

    this.entries.push(cloneEntry(sealed));
    this.persist(sealed);
    return cloneEntry(sealed);
  }

  async record(entry: LedgerEntryInput): Promise<LedgerEntry> {
    return this.append(entry);
  }

  getById(id: string): LedgerEntry | undefined {
    const entry = this.entries.find((candidate) => candidate.id === id);
    return entry ? cloneEntry(entry) : undefined;
  }

  getLatest(): LedgerEntry | undefined {
    const entry = this.entries[this.entries.length - 1];
    return entry ? cloneEntry(entry) : undefined;
  }

  getAll(): LedgerEntry[] {
    return this.entries.map((entry) => cloneEntry(entry));
  }

  getByHash(hash: string): LedgerEntry | undefined {
    const entry = this.entries.find((candidate) => candidate.hash === hash);
    return entry ? cloneEntry(entry) : undefined;
  }

  verifyChain(): { valid: boolean; failedAtIndex?: number } {
    let parentHash = LEDGER_GENESIS_HASH;
    for (let index = 0; index < this.entries.length; index += 1) {
      const entry = this.entries[index]!;
      if (entry.parentHash !== parentHash) {
        return { valid: false, failedAtIndex: index };
      }
      const expectedHash = computeLedgerHash({
        id: entry.id,
        parentHash: entry.parentHash,
        timestamp: entry.timestamp,
        actor: entry.actor,
        action: entry.action,
        payload: entry.payload,
      });
      if (expectedHash !== entry.hash) {
        return { valid: false, failedAtIndex: index };
      }
      parentHash = entry.hash;
    }
    return { valid: true };
  }

  clear(): void {
    this.entries.length = 0;
    if (this.storagePath) {
      writeFileSync(this.storagePath, '', { encoding: 'utf8' });
    }
  }

  private persist(entry: LedgerEntry): void {
    if (!this.storagePath) {
      return;
    }

    mkdirSync(dirname(this.storagePath), { recursive: true });
    appendFileSync(this.storagePath, `${JSON.stringify(entry)}\n`, { encoding: 'utf8' });
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
      .map((line) => JSON.parse(line) as LedgerEntry);

    this.entries.splice(0, this.entries.length, ...parsed.map((entry) => cloneEntry(entry)));
    const verification = this.verifyChain();
    if (!verification.valid) {
      throw new Error(
        `RunLedger storage chain verification failed at index ${verification.failedAtIndex ?? -1}`,
      );
    }
  }

}
