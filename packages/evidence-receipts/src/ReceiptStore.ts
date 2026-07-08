import { randomUUID } from 'node:crypto';

export interface StoredReceipt extends Record<string, unknown> {
  id: string;
  timestamp: string;
}

function resolveReceiptId(envelope: Record<string, unknown>): string {
  const receiptId = envelope.receiptId;
  if (typeof receiptId === 'string' && receiptId.length > 0) {
    return receiptId;
  }

  const proposalHash = envelope.proposalHash;
  if (typeof proposalHash === 'string' && proposalHash.length > 0) {
    return proposalHash;
  }

  return randomUUID();
}

function resolveTimestamp(envelope: Record<string, unknown>): string {
  const issuedAt = envelope.issuedAt;
  if (typeof issuedAt === 'string' && issuedAt.length > 0) {
    return issuedAt;
  }

  const timestamp = envelope.timestamp;
  if (typeof timestamp === 'string' && timestamp.length > 0) {
    return timestamp;
  }

  return new Date().toISOString();
}

function compareReceipts(a: StoredReceipt, b: StoredReceipt): number {
  const timeDelta = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  if (timeDelta !== 0) {
    return timeDelta;
  }
  return a.id.localeCompare(b.id);
}

export class ReceiptStore {
  private receipts: Map<string, StoredReceipt> = new Map();

  add(envelope: Record<string, unknown>): StoredReceipt {
    const id = resolveReceiptId(envelope);
    const record: StoredReceipt = {
      ...envelope,
      id,
      timestamp: resolveTimestamp(envelope),
    };
    this.receipts.set(id, structuredClone(record));
    return structuredClone(record);
  }

  list(): StoredReceipt[] {
    return [...this.receipts.values()]
      .sort(compareReceipts)
      .map((receipt) => structuredClone(receipt));
  }

  getLatest(): StoredReceipt | null {
    const receipts = this.list();
    return receipts.at(-1) ?? null;
  }

  getById(id: string): StoredReceipt | undefined {
    const receipt = this.receipts.get(id);
    return receipt ? structuredClone(receipt) : undefined;
  }

  clear(): void {
    this.receipts.clear();
  }
}
