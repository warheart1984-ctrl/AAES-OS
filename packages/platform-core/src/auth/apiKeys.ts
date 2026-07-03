import { createHash, randomBytes } from 'node:crypto';

import type { ApiKeyRecord, AuthSession, GovernanceMode } from '../types.js';

export interface ApiKeyCreateInput {
  label: string;
  ownerId: string;
  governanceProfile: GovernanceMode;
  scopes?: string[];
}

export interface ApiKeyCreateResult {
  record: ApiKeyRecord;
  /** Plaintext key — shown once at creation */
  key: string;
}

export class ApiKeyStore {
  private readonly keys = new Map<string, ApiKeyRecord>();
  private readonly sessions = new Map<string, AuthSession>();

  create(input: ApiKeyCreateInput): ApiKeyCreateResult {
    const raw = randomBytes(32).toString('base64url');
    const key = `org_${raw}`;
    const id = `key_${randomBytes(8).toString('hex')}`;
    const now = new Date().toISOString();

    const record: ApiKeyRecord = {
      id,
      label: input.label,
      keyPrefix: key.slice(0, 12),
      keyHash: hashKey(key),
      ownerId: input.ownerId,
      governanceProfile: input.governanceProfile,
      scopes: input.scopes ?? ['capabilities:read', 'capabilities:invoke'],
      createdAt: now,
      revoked: false,
    };

    this.keys.set(id, record);
    return { record, key };
  }

  list(ownerId: string): ApiKeyRecord[] {
    return [...this.keys.values()].filter((k) => k.ownerId === ownerId && !k.revoked);
  }

  revoke(id: string, ownerId: string): void {
    const record = this.keys.get(id);
    if (!record || record.ownerId !== ownerId) {
      throw new Error(`AUTH: API key "${id}" not found`);
    }
    record.revoked = true;
  }

  authenticate(key: string): ApiKeyRecord {
    const hash = hashKey(key);
    const match = [...this.keys.values()].find((k) => k.keyHash === hash && !k.revoked);
    if (!match) {
      throw new Error('AUTH: invalid API key');
    }
    match.lastUsedAt = new Date().toISOString();
    return match;
  }

  login(ownerId: string, governanceProfile: GovernanceMode): AuthSession {
    const sessionId = `sess_${randomBytes(16).toString('hex')}`;
    const now = Date.now();
    const session: AuthSession = {
      sessionId,
      ownerId,
      governanceProfile,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): AuthSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.sessions.delete(sessionId);
      return undefined;
    }
    return session;
  }
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}
