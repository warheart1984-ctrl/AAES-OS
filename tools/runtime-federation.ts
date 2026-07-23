#!/usr/bin/env node
/**
 * CCR-AAES-OS-RuntimeFederation decision engine (connection ladder step 5).
 *
 * Checkout authority (verified adapters) ≠ live mesh authority (handshake receipts).
 * Fail-closed: absent verified adapter, Tested/Certified transport, or valid receipt ⇒ deny.
 *
 * Issuance: issueHandshakeReceipt validates pre-conditions, hashes, stores, lineages.
 * Lineage: session-lineage-log.json (append-only, hash-checked).
 */

import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildSiblingAdapterContractEvidence,
  type AdapterContractEvidenceIndex,
} from './sibling-adapter-contracts.ts';
import {
  hashJson,
  isTransportEligibleForFederation,
  loadTransportRegistry,
  type TransportDescriptor,
  type TransportDescriptorRegistry,
} from './transport-test.ts';

export type FederationDecisionState =
  | 'NotEligible'
  | 'HandshakePending'
  | 'FederationDenied'
  | 'FederationGranted';

export type ConstitutionalMaturity =
  | 'Prototype'
  | 'VerifiedPrototype'
  | 'Verified Prototype'
  | 'Production Candidate'
  | 'Certified';

export type SessionLineageStatus = 'Pending' | 'Active' | 'Revoked' | 'Expired' | 'Denied';

export interface HandshakeRequest {
  remoteId: string;
  adapterId: string;
  transportId: string;
  requestedCapabilities: string[];
  sessionPurpose: string;
  sessionId?: string;
  /** Production sessions require transport maturity Certified. */
  production?: boolean;
}

export interface HandshakeReceiptPayload {
  receiptId: string;
  sessionId: string;
  remoteId: string;
  adapterId: string;
  transportId: string;
  constitutionalMaturity: ConstitutionalMaturity | string;
  capabilitiesGranted: string[];
  issuedAt: string;
  expiresAt: string;
  issuer: string;
  revocationPath: string;
}

export interface HandshakeReceipt extends HandshakeReceiptPayload {
  receiptHash: string;
  contractId?: 'CRC-AAES-OS-HandshakeReceipt';
  revoked?: boolean;
  revokedAt?: string | null;
}

export interface ReceiptValidationIssue {
  code: string;
  detail: string;
}

export interface FederationDecision {
  state: FederationDecisionState;
  allowLiveSession: boolean;
  remoteId: string;
  adapterId: string | null;
  transportId: string | null;
  sessionId: string | null;
  receiptId: string | null;
  reasons: string[];
  checkedAt: string;
}

export interface SessionRevocationEvent {
  /** How the session can be (or was) revoked */
  path: string;
  /** Who holds revocation authority */
  authority: string;
  /** Under what conditions revocation applies / applied */
  condition: string;
  /** Filled when revocation is executed; null while Active */
  executed: { who: string; when: string; why: string } | null;
}

export interface SessionLineageEntry {
  sessionId: string;
  remoteId: string;
  adapterId: string;
  transportId: string;
  receiptId: string | null;
  startedAt: string;
  endedAt: string | null;
  expiresAt: string | null;
  status: SessionLineageStatus;
  /** Required for Active grants: path + authority + condition (governance evidence) */
  revocationEvent: SessionRevocationEvent | null;
  entryHash: string;
}

export interface SessionLineageLog {
  artifact: 'session-lineage-log';
  version: '0.1.0';
  ccrId: 'CCR-AAES-OS-RuntimeFederation';
  generatedAt: string;
  entries: SessionLineageEntry[];
  aggregateHash: string;
  truthBoundary: string;
}

/** @deprecated use SessionLineageLog / session-lineage-log.json */
export interface FederationLineageLog {
  artifact: 'federation-lineage-log';
  version: '0.1.0';
  ccrId: 'CCR-AAES-OS-RuntimeFederation';
  generatedAt: string;
  entries: Array<{
    sessionId: string;
    remoteId: string;
    adapterId: string;
    transportId: string;
    receiptId: string | null;
    state: FederationDecisionState;
    recordedAt: string;
    event: string;
    detail?: string;
  }>;
  truthBoundary: string;
}

export interface HandshakeReceiptRegistry {
  registryId: string;
  version: string;
  status: string;
  ccrId: string;
  contractId: 'CRC-AAES-OS-HandshakeReceipt';
  receipts: Array<{
    receiptId: string;
    sessionId: string;
    remoteId: string;
    adapterId: string;
    transportId: string;
    path: string;
    receiptHash: string;
    revoked: boolean;
  }>;
  truthBoundary: string;
}

export interface RuntimeFederationEvidenceIndex {
  artifact: 'handshake-receipt-evidence-index';
  version: '0.1.0';
  ccrId: 'CCR-AAES-OS-RuntimeFederation';
  contractId: 'CRC-AAES-OS-HandshakeReceipt';
  generatedAt: string;
  workspace: string;
  implementationStatus: 'machinery-ready-live-grants-denied' | 'live-grants-present';
  failClosed: true;
  ladderStep: 'runtime-federation';
  promotionConditionsMet: boolean;
  promotionChecklist: PromotionChecklist;
  summary: {
    transportsDeclared: number;
    transportsTested: number;
    transportsCertified: number;
    adaptersVerified: number;
    receiptsIndexed: number;
    receiptsValid: number;
    lineageActive: number;
    lineageRevoked: number;
    decisions: Record<FederationDecisionState, number>;
    liveSessionsGranted: number;
  };
  transports: TransportDescriptor[];
  decisions: FederationDecision[];
  receipts: HandshakeReceipt[];
  sessionLineage: SessionLineageLog;
  /** Mirror for older consumers */
  lineage: FederationLineageLog;
  aggregateHash: string;
  truthBoundary: string;
}

export interface PromotionChecklistItem {
  id:
    | 'indexed-handshake-receipts'
    | 'active-lineage'
    | 'revocation-paths'
    | 'transport-maturity';
  layer: 1 | 2 | 3 | 4;
  required: true;
  met: boolean;
  detail: string;
}

export interface PromotionChecklist {
  version: '1.1.0';
  met: boolean;
  verdict: 'Pass' | 'Fail';
  message: string;
  items: PromotionChecklistItem[];
}

export interface PromotionValidatorState {
  transports: TransportDescriptor[];
  receipts: HandshakeReceipt[];
  validReceipts?: HandshakeReceipt[];
  sessionLineage: SessionLineageLog;
  receiptRegistry?: HandshakeReceiptRegistry | null;
  adapters?: AdapterContractEvidenceIndex;
  now?: Date;
}


export interface IssueHandshakeReceiptArgs {
  remoteId: string;
  adapterId: string;
  transportId: string;
  capabilities: string[];
  root?: string;
  write?: boolean;
  now?: Date;
  /** Protocol-level handshake succeeded (default true when caller asserts success). */
  handshakeSucceeded?: boolean;
  production?: boolean;
  constitutionalMaturity?: string;
  ttlMs?: number;
  issuer?: string;
  sessionId?: string;
  sessionPurpose?: string;
}

export type IssueHandshakeReceiptResult =
  | { ok: true; receiptId: string; sessionId: string; receipt: HandshakeReceipt }
  | { ok: false; reasons: string[]; state: 'HandshakePending' | 'FederationDenied' | 'NotEligible' };

interface BuildOptions {
  root?: string;
  write?: boolean;
  now?: Date;
  handshakeRequest?: HandshakeRequest;
}

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TRUTH_BOUNDARY =
  'Runtime federation evaluates live mesh authority fail-closed. Verified adapters prove checkout authority only. FederationGranted requires a valid handshake receipt under CRC-AAES-OS-HandshakeReceipt against a Tested (trial) or Certified (production) transport.';

const MATURITY_COMPATIBLE = new Set([
  'Prototype',
  'VerifiedPrototype',
  'Verified Prototype',
  'Production Candidate',
  'Certified',
]);

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export { hashJson, loadTransportRegistry, isTransportEligibleForFederation };
export type { TransportDescriptor, TransportDescriptorRegistry };

export function computeReceiptHash(payload: HandshakeReceiptPayload): string {
  return hashJson(payload);
}

export function loadHandshakeReceipts(root = defaultRoot): HandshakeReceipt[] {
  const receiptsDir = path.join(root, 'docs', 'release', 'sibling-repos', 'federation', 'receipts');
  if (!existsSync(receiptsDir)) return [];
  return readdirSync(receiptsDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => JSON.parse(readFileSync(path.join(receiptsDir, name), 'utf8')) as HandshakeReceipt);
}

export function loadSessionLineageLog(root = defaultRoot): SessionLineageLog {
  const lineagePath = path.join(
    root,
    'docs',
    'release',
    'sibling-repos',
    'federation',
    'session-lineage-log.json',
  );
  if (!existsSync(lineagePath)) {
    return emptySessionLineageLog(new Date().toISOString());
  }
  const parsed = JSON.parse(readFileSync(lineagePath, 'utf8')) as SessionLineageLog;
  return {
    ...parsed,
    aggregateHash: computeLineageAggregateHash(parsed.entries),
  };
}

export function validateHandshakeReceipt(
  receipt: HandshakeReceipt,
  context: {
    adapters: AdapterContractEvidenceIndex;
    transports: TransportDescriptorRegistry;
    now?: Date;
    remoteMaturity?: string | null;
    production?: boolean;
  },
): ReceiptValidationIssue[] {
  const issues: ReceiptValidationIssue[] = [];
  const now = context.now ?? new Date();

  const required: Array<keyof HandshakeReceipt> = [
    'receiptId',
    'sessionId',
    'remoteId',
    'adapterId',
    'transportId',
    'receiptHash',
    'constitutionalMaturity',
    'capabilitiesGranted',
    'issuedAt',
    'expiresAt',
    'issuer',
    'revocationPath',
  ];
  for (const field of required) {
    const value = receipt[field];
    const empty =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0);
    if (empty) {
      issues.push({ code: 'missing-field', detail: `required field missing: ${field}` });
    }
  }

  if (!receipt.revocationPath || String(receipt.revocationPath).trim() === '') {
    issues.push({ code: 'revocation-path', detail: 'revocationPath MUST NOT be empty' });
  }

  const adapter = context.adapters.receipts.find((r) => r.adapterId === receipt.adapterId);
  if (!adapter) {
    issues.push({ code: 'adapter-linkage', detail: `adapterId not in adapter evidence: ${receipt.adapterId}` });
  } else if (adapter.verdict !== 'pass') {
    issues.push({ code: 'adapter-not-verified', detail: `adapter ${receipt.adapterId} verdict=${adapter.verdict}` });
  } else if (adapter.siblingId !== receipt.remoteId) {
    issues.push({
      code: 'adapter-remote-mismatch',
      detail: `adapter siblingId=${adapter.siblingId} !== receipt.remoteId=${receipt.remoteId}`,
    });
  }

  const transport = context.transports.transports.find((t) => t.transportId === receipt.transportId);
  if (!transport) {
    issues.push({ code: 'transport-linkage', detail: `transportId not declared: ${receipt.transportId}` });
  } else if (!isTransportEligibleForFederation(transport, { production: context.production })) {
    issues.push({
      code: 'transport-not-eligible',
      detail: context.production
        ? `transport ${receipt.transportId} requires maturity=Certified for production (got ${transport.maturity}, tested=${transport.tested})`
        : `transport ${receipt.transportId} must be Tested or Certified (got ${transport.maturity}, tested=${transport.tested})`,
    });
  }

  if (!MATURITY_COMPATIBLE.has(String(receipt.constitutionalMaturity))) {
    issues.push({
      code: 'maturity-enum',
      detail: `constitutionalMaturity not recognized: ${receipt.constitutionalMaturity}`,
    });
  }

  if (context.remoteMaturity) {
    const receiptMaturity = normalizeMaturity(String(receipt.constitutionalMaturity));
    const remoteMaturity = normalizeMaturity(context.remoteMaturity);
    if (receiptMaturity && remoteMaturity && !maturityCompatible(receiptMaturity, remoteMaturity)) {
      issues.push({
        code: 'maturity-consistency',
        detail: `receipt maturity ${receipt.constitutionalMaturity} incompatible with remote ${context.remoteMaturity}`,
      });
    }
  }

  const payload: HandshakeReceiptPayload = {
    receiptId: receipt.receiptId,
    sessionId: receipt.sessionId,
    remoteId: receipt.remoteId,
    adapterId: receipt.adapterId,
    transportId: receipt.transportId,
    constitutionalMaturity: receipt.constitutionalMaturity,
    capabilitiesGranted: receipt.capabilitiesGranted,
    issuedAt: receipt.issuedAt,
    expiresAt: receipt.expiresAt,
    issuer: receipt.issuer,
    revocationPath: receipt.revocationPath,
  };
  const expectedHash = computeReceiptHash(payload);
  if (receipt.receiptHash !== expectedHash) {
    issues.push({
      code: 'hash-integrity',
      detail: `receiptHash mismatch expected=${expectedHash} got=${receipt.receiptHash}`,
    });
  }

  const issuedAt = Date.parse(receipt.issuedAt);
  const expiresAt = Date.parse(receipt.expiresAt);
  if (Number.isNaN(issuedAt) || Number.isNaN(expiresAt)) {
    issues.push({ code: 'time-parse', detail: 'issuedAt/expiresAt must be ISO timestamps' });
  } else {
    const t = now.getTime();
    if (t < issuedAt || t > expiresAt) {
      issues.push({
        code: 'time-validity',
        detail: `now=${now.toISOString()} outside [${receipt.issuedAt}, ${receipt.expiresAt}]`,
      });
    }
  }

  if (receipt.revoked === true) {
    issues.push({ code: 'revoked', detail: `receipt revoked at ${receipt.revokedAt ?? 'unknown'}` });
  }

  return issues;
}

export function evaluateFederationDecision(
  request: HandshakeRequest,
  context: {
    adapters: AdapterContractEvidenceIndex;
    transports: TransportDescriptorRegistry;
    receipts: HandshakeReceipt[];
    now?: Date;
    remoteMaturityByRemote?: Record<string, string | null>;
  },
): FederationDecision {
  const checkedAt = (context.now ?? new Date()).toISOString();
  const reasons: string[] = [];
  const production = Boolean(request.production || request.sessionPurpose === 'production');

  const adapter =
    context.adapters.receipts.find((r) => r.adapterId === request.adapterId) ??
    context.adapters.receipts.find((r) => r.siblingId === request.remoteId && r.verdict === 'pass') ??
    null;

  if (!adapter || adapter.verdict !== 'pass') {
    reasons.push('No verified adapter for remoteId (fail-closed; NotEligible)');
    return deny('NotEligible', request, reasons, checkedAt, adapter?.adapterId ?? null);
  }

  if (adapter.siblingId !== request.remoteId) {
    reasons.push(`adapter ${adapter.adapterId} is bound to sibling ${adapter.siblingId}, not ${request.remoteId}`);
    return deny('NotEligible', request, reasons, checkedAt, adapter.adapterId);
  }

  const transport = context.transports.transports.find((t) => t.transportId === request.transportId);
  if (!transport) {
    reasons.push(`Transport descriptor missing: ${request.transportId}`);
    return deny('NotEligible', request, reasons, checkedAt, adapter.adapterId);
  }

  if (!isTransportEligibleForFederation(transport, { production })) {
    reasons.push(
      production
        ? `Transport ${transport.transportId} not Certified for production (maturity=${transport.maturity}, tested=${transport.tested})`
        : `Transport ${transport.transportId} not Tested/Certified (maturity=${transport.maturity}, tested=${transport.tested}; run npm run transports:test)`,
    );
    return deny('NotEligible', request, reasons, checkedAt, adapter.adapterId);
  }

  const candidates = context.receipts.filter(
    (r) =>
      r.remoteId === request.remoteId &&
      r.adapterId === adapter.adapterId &&
      r.transportId === request.transportId &&
      (!request.sessionId || r.sessionId === request.sessionId),
  );

  if (candidates.length === 0) {
    reasons.push('Verified adapter and eligible transport present; handshake receipt absent (HandshakePending)');
    return {
      state: 'HandshakePending',
      allowLiveSession: false,
      remoteId: request.remoteId,
      adapterId: adapter.adapterId,
      transportId: transport.transportId,
      sessionId: request.sessionId ?? null,
      receiptId: null,
      reasons,
      checkedAt,
    };
  }

  const ordered = [...candidates].sort((a, b) => Date.parse(b.expiresAt) - Date.parse(a.expiresAt));
  let firstInvalid: { receipt: HandshakeReceipt; issues: ReceiptValidationIssue[] } | null = null;

  for (const receipt of ordered) {
    const issues = validateHandshakeReceipt(receipt, {
      adapters: context.adapters,
      transports: context.transports,
      now: context.now,
      remoteMaturity: context.remoteMaturityByRemote?.[request.remoteId] ?? null,
      production,
    });
    if (issues.length === 0) {
      reasons.push(`Valid handshake receipt ${receipt.receiptId} authorizes live session`);
      return {
        state: 'FederationGranted',
        allowLiveSession: true,
        remoteId: request.remoteId,
        adapterId: adapter.adapterId,
        transportId: transport.transportId,
        sessionId: receipt.sessionId,
        receiptId: receipt.receiptId,
        reasons,
        checkedAt,
      };
    }
    if (!firstInvalid) firstInvalid = { receipt, issues };
  }

  reasons.push(
    `Handshake receipt present but invalid: ${(firstInvalid?.issues ?? []).map((i) => i.code).join(', ')}`,
  );
  return {
    state: 'FederationDenied',
    allowLiveSession: false,
    remoteId: request.remoteId,
    adapterId: adapter.adapterId,
    transportId: transport.transportId,
    sessionId: firstInvalid?.receipt.sessionId ?? request.sessionId ?? null,
    receiptId: firstInvalid?.receipt.receiptId ?? null,
    reasons,
    checkedAt,
  };
}

/**
 * Issuance pipeline: validate pre-conditions → build payload → hash → store → lineage Active.
 * Fail-closed: any missing pre-condition ⇒ no receipt; session stays HandshakePending / Denied.
 */
export function issueHandshakeReceipt(args: IssueHandshakeReceiptArgs): IssueHandshakeReceiptResult {
  const root = args.root ?? defaultRoot;
  const now = args.now ?? new Date();
  const write = args.write ?? true;
  const handshakeSucceeded = args.handshakeSucceeded ?? true;
  const production = Boolean(args.production || args.sessionPurpose === 'production');
  const reasons: string[] = [];

  const adapters = buildSiblingAdapterContractEvidence({ root, write: false });
  const transports = loadTransportRegistry(root);

  const adapter = adapters.receipts.find((r) => r.adapterId === args.adapterId);
  if (!adapter || adapter.verdict !== 'pass') {
    reasons.push('adapter not verified (fail-closed)');
  } else if (adapter.siblingId !== args.remoteId) {
    reasons.push(`adapter siblingId=${adapter.siblingId} !== remoteId=${args.remoteId}`);
  }

  const transport = transports.transports.find((t) => t.transportId === args.transportId);
  if (!transport) {
    reasons.push(`transport not declared: ${args.transportId}`);
  } else if (!isTransportEligibleForFederation(transport, { production })) {
    reasons.push(
      production
        ? `transport not Certified for production (maturity=${transport.maturity})`
        : `transport not Tested (maturity=${transport?.maturity}; run npm run transports:test)`,
    );
  }

  if (!handshakeSucceeded) {
    reasons.push('handshake exchange failed (auth/integrity)');
  }

  const maturity =
    args.constitutionalMaturity ??
    adapter?.observedReceipt.maturity ??
    'Verified Prototype';

  if (adapter?.observedReceipt.maturity) {
    if (!maturityCompatible(normalizeMaturity(maturity), normalizeMaturity(adapter.observedReceipt.maturity))) {
      reasons.push('constitutionalMaturity mismatch with remote lineage');
    }
  }

  const sessionId = args.sessionId ?? `sess-${randomUUID()}`;
  const startedAt = now.toISOString();

  if (reasons.length > 0) {
    const state: 'NotEligible' | 'FederationDenied' =
      !adapter ||
      adapter.verdict !== 'pass' ||
      !transport ||
      !isTransportEligibleForFederation(transport, { production })
        ? 'NotEligible'
        : 'FederationDenied';

    if (write) {
      appendSessionLineage(root, {
        sessionId,
        remoteId: args.remoteId,
        adapterId: args.adapterId,
        transportId: args.transportId,
        receiptId: null,
        startedAt,
        endedAt: startedAt,
        expiresAt: null,
        status: 'Denied',
        revocationEvent: {
          path: 'CCR-AAES-OS-RuntimeFederation#issuance-denied',
          authority: 'issueHandshakeReceipt',
          condition: 'issuance pre-conditions failed',
          executed: {
            who: 'issueHandshakeReceipt',
            when: startedAt,
            why: reasons.join('; '),
          },
        },
      });
    }

    return { ok: false, reasons, state };
  }

  if (write) {
    appendSessionLineage(root, {
      sessionId,
      remoteId: args.remoteId,
      adapterId: args.adapterId,
      transportId: args.transportId,
      receiptId: null,
      startedAt,
      endedAt: null,
      expiresAt: null,
      status: 'Pending',
      revocationEvent: null,
    });
  }

  const receiptId = `hr-${args.remoteId}-${randomUUID().slice(0, 8)}`;
  const issuedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + (args.ttlMs ?? DEFAULT_TTL_MS)).toISOString();
  const payload: HandshakeReceiptPayload = {
    receiptId,
    sessionId,
    remoteId: args.remoteId,
    adapterId: args.adapterId,
    transportId: args.transportId,
    constitutionalMaturity: maturity,
    capabilitiesGranted: [...args.capabilities],
    issuedAt,
    expiresAt,
    issuer: args.issuer ?? 'AAES-OS-RuntimeFederation',
    revocationPath: `CCR-AAES-OS-RuntimeFederation#revoke:${receiptId}`,
  };

  const receipt: HandshakeReceipt = {
    contractId: 'CRC-AAES-OS-HandshakeReceipt',
    ...payload,
    receiptHash: computeReceiptHash(payload),
    revoked: false,
    revokedAt: null,
  };

  if (write) {
    const federationDir = path.join(root, 'docs', 'release', 'sibling-repos', 'federation');
    const receiptsDir = path.join(federationDir, 'receipts');
    mkdirSync(receiptsDir, { recursive: true });
    writeJson(path.join(receiptsDir, `${receiptId}.json`), receipt);

    const allReceipts = loadHandshakeReceipts(root);
    writeHandshakeReceiptRegistry(federationDir, allReceipts);

    upsertSessionLineage(root, {
      sessionId,
      remoteId: args.remoteId,
      adapterId: args.adapterId,
      transportId: args.transportId,
      receiptId,
      startedAt,
      endedAt: null,
      expiresAt,
      status: 'Active',
      revocationEvent: buildActiveRevocationEvent(receiptId),
    });
  }

  return { ok: true, receiptId, sessionId, receipt };
}

export function recordHandshakeRequest(
  request: HandshakeRequest,
  options: { root?: string; write?: boolean; now?: Date } = {},
): SessionLineageEntry {
  const root = options.root ?? defaultRoot;
  const now = options.now ?? new Date();
  const sessionId = request.sessionId ?? `sess-${randomUUID()}`;
  const entryInput = {
    sessionId,
    remoteId: request.remoteId,
    adapterId: request.adapterId,
    transportId: request.transportId,
    receiptId: null as string | null,
    startedAt: now.toISOString(),
    endedAt: null as string | null,
    expiresAt: null as string | null,
    status: 'Pending' as SessionLineageStatus,
    revocationEvent: null,
  };
  if (options.write ?? true) {
    return appendSessionLineage(root, entryInput);
  }
  return sealSessionEntry(entryInput);
}

export function revokeSession(
  sessionId: string,
  options: { root?: string; write?: boolean; now?: Date; who?: string; why?: string } = {},
): SessionLineageEntry | null {
  const root = options.root ?? defaultRoot;
  const now = (options.now ?? new Date()).toISOString();
  const log = loadSessionLineageLog(root);
  const idx = log.entries.findIndex((e) => e.sessionId === sessionId);
  if (idx < 0) return null;

  const prev = log.entries[idx]!;
  const prior = prev.revocationEvent;
  const updated = sealSessionEntry({
    sessionId: prev.sessionId,
    remoteId: prev.remoteId,
    adapterId: prev.adapterId,
    transportId: prev.transportId,
    receiptId: prev.receiptId,
    startedAt: prev.startedAt,
    endedAt: now,
    expiresAt: prev.expiresAt,
    status: 'Revoked',
    revocationEvent: {
      path: prior?.path ?? `CCR-AAES-OS-RuntimeFederation#revoke:${prev.receiptId ?? sessionId}`,
      authority: prior?.authority ?? 'CCR-AAES-OS-RuntimeFederation',
      condition: prior?.condition ?? 'explicit operator or CCR revocation',
      executed: {
        who: options.who ?? 'operator',
        when: now,
        why: options.why ?? 'explicit revocation',
      },
    },
  });

  if (options.write ?? true) {
    log.entries[idx] = updated;
    persistSessionLineageLog(root, log);
  }
  return updated;
}

export function buildRuntimeFederationEvidence(options: BuildOptions = {}): RuntimeFederationEvidenceIndex {
  const root = options.root ?? defaultRoot;
  const now = options.now ?? new Date();
  const generatedAt = now.toISOString();
  const federationDir = path.join(root, 'docs', 'release', 'sibling-repos', 'federation');

  const adapters = buildSiblingAdapterContractEvidence({ root, write: options.write ?? true });
  const transports = loadTransportRegistry(root);
  const receipts = loadHandshakeReceipts(root);
  let sessionLineage = loadSessionLineageLog(root);

  // Expire Active sessions past expiresAt
  sessionLineage = applyExpiry(sessionLineage, now);
  if (options.write ?? true) {
    persistSessionLineageLog(root, sessionLineage);
  }

  const defaultTransport =
    transports.transports.find((t) => t.transportId === 'opsConsole-SovereignX-v1') ??
    transports.transports[0];

  const verifiedAdapters = adapters.receipts.filter((r) => r.verdict === 'pass');
  const decisions: FederationDecision[] = [];

  if (options.handshakeRequest) {
    if (options.write ?? true) {
      recordHandshakeRequest(options.handshakeRequest, { root, write: true, now });
    }
    decisions.push(
      evaluateFederationDecision(options.handshakeRequest, {
        adapters,
        transports,
        receipts,
        now,
      }),
    );
  }

  for (const adapter of adapters.receipts) {
    const request: HandshakeRequest = {
      remoteId: adapter.siblingId,
      adapterId: adapter.adapterId,
      transportId: defaultTransport?.transportId ?? 'opsConsole-SovereignX-v1',
      requestedCapabilities: ['readEvidence'],
      sessionPurpose: 'runtime-federation-eligibility-probe',
    };
    decisions.push(
      evaluateFederationDecision(request, {
        adapters,
        transports,
        receipts,
        now,
        remoteMaturityByRemote: {
          [adapter.siblingId]: adapter.observedReceipt.maturity,
        },
      }),
    );
  }

  // Reload lineage after optional handshake request writes
  sessionLineage = loadSessionLineageLog(root);
  sessionLineage = applyExpiry(sessionLineage, now);

  const decisionCounts: Record<FederationDecisionState, number> = {
    NotEligible: 0,
    HandshakePending: 0,
    FederationDenied: 0,
    FederationGranted: 0,
  };
  for (const d of decisions) decisionCounts[d.state] += 1;

  const validReceipts = receipts.filter(
    (r) =>
      validateHandshakeReceipt(r, {
        adapters,
        transports,
        now,
        remoteMaturity: verifiedAdapters.find((a) => a.siblingId === r.remoteId)?.observedReceipt.maturity ?? null,
      }).length === 0,
  );

  const transportsTested = transports.transports.filter(
    (t) => t.tested && (t.maturity === 'Tested' || t.maturity === 'Certified'),
  ).length;
  const transportsCertified = transports.transports.filter((t) => t.maturity === 'Certified').length;
  const lineageActive = sessionLineage.entries.filter(
    (e) => e.status === 'Active' && Boolean(e.receiptId) && Boolean(e.entryHash),
  );
  const lineageRevoked = sessionLineage.entries.filter((e) => e.status === 'Revoked').length;
  const liveGranted = decisions.filter((d) => d.state === 'FederationGranted').length;

  const receiptRegistryOnDisk = loadHandshakeReceiptRegistry(root);
  const receiptRegistryForPromotion: HandshakeReceiptRegistry = {
    registryId: 'aaes-os-handshake-receipt-registry',
    version: '0.1.0',
    status: 'Published',
    ccrId: 'CCR-AAES-OS-RuntimeFederation',
    contractId: 'CRC-AAES-OS-HandshakeReceipt',
    receipts: receipts.map((r) => ({
      receiptId: r.receiptId,
      sessionId: r.sessionId,
      remoteId: r.remoteId,
      adapterId: r.adapterId,
      transportId: r.transportId,
      path: normalizePath(path.join(federationDir, 'receipts', `${r.receiptId}.json`)),
      receiptHash: r.receiptHash,
      revoked: r.revoked === true,
    })),
    truthBoundary:
      receiptRegistryOnDisk?.truthBoundary ??
      'Indexed handshake receipts only. Empty registry means no live federation grants exist.',
  };

  const promotionChecklist = promotionConditionsMet({
    transports: transports.transports,
    receipts,
    validReceipts,
    sessionLineage,
    receiptRegistry: receiptRegistryForPromotion,
    adapters,
    now,
  });
  const promotionMet = promotionChecklist.met;

  const legacyLineage: FederationLineageLog = {
    artifact: 'federation-lineage-log',
    version: '0.1.0',
    ccrId: 'CCR-AAES-OS-RuntimeFederation',
    generatedAt,
    entries: sessionLineage.entries.map((e) => ({
      sessionId: e.sessionId,
      remoteId: e.remoteId,
      adapterId: e.adapterId,
      transportId: e.transportId,
      receiptId: e.receiptId,
      state:
        e.status === 'Active'
          ? 'FederationGranted'
          : e.status === 'Denied'
            ? 'FederationDenied'
            : e.status === 'Pending'
              ? 'HandshakePending'
              : 'FederationDenied',
      recordedAt: e.startedAt,
      event: e.status.toLowerCase(),
      detail: e.revocationEvent?.executed?.why ?? e.revocationEvent?.path,
    })),
    truthBoundary: sessionLineage.truthBoundary,
  };

  const index: RuntimeFederationEvidenceIndex = {
    artifact: 'handshake-receipt-evidence-index',
    version: '0.1.0',
    ccrId: 'CCR-AAES-OS-RuntimeFederation',
    contractId: 'CRC-AAES-OS-HandshakeReceipt',
    generatedAt,
    workspace: normalizePath(root),
    implementationStatus: liveGranted > 0 || lineageActive.length > 0 ? 'live-grants-present' : 'machinery-ready-live-grants-denied',
    failClosed: true,
    ladderStep: 'runtime-federation',
    promotionConditionsMet: promotionMet,
    promotionChecklist,
    summary: {
      transportsDeclared: transports.transports.length,
      transportsTested,
      transportsCertified,
      adaptersVerified: verifiedAdapters.length,
      receiptsIndexed: receipts.length,
      receiptsValid: validReceipts.length,
      lineageActive: lineageActive.length,
      lineageRevoked,
      decisions: decisionCounts,
      liveSessionsGranted: liveGranted,
    },
    transports: transports.transports,
    decisions,
    receipts,
    sessionLineage: {
      ...sessionLineage,
      generatedAt,
      aggregateHash: computeLineageAggregateHash(sessionLineage.entries),
    },
    lineage: legacyLineage,
    aggregateHash: hashJson({
      decisions: decisions.map((d) => ({
        remoteId: d.remoteId,
        state: d.state,
        receiptId: d.receiptId,
      })),
      receipts: receipts.map((r) => ({ receiptId: r.receiptId, receiptHash: r.receiptHash })),
      transports: transports.transports.map((t) => ({
        transportId: t.transportId,
        maturity: t.maturity,
        tested: t.tested,
      })),
      sessionLineage: computeLineageAggregateHash(sessionLineage.entries),
      adapters: adapters.aggregateHash,
    }),
    truthBoundary: TRUTH_BOUNDARY,
  };

  if (options.write ?? true) {
    writeFederationArtifacts(federationDir, index, receipts);
    persistSessionLineageLog(root, index.sessionLineage);
  }

  return index;
}

export function isRuntimeFederationEvidenceIndex(value: unknown): value is RuntimeFederationEvidenceIndex {
  if (typeof value !== 'object' || value === null) return false;
  const index = value as Partial<RuntimeFederationEvidenceIndex>;
  return (
    index.artifact === 'handshake-receipt-evidence-index' &&
    index.version === '0.1.0' &&
    index.ccrId === 'CCR-AAES-OS-RuntimeFederation' &&
    index.failClosed === true &&
    Array.isArray(index.decisions)
  );
}

/**
 * PromotionConditionValidator — Evidence first. Verification always. Reality is the final authority.
 *
 * Layers:
 * 1. Indexed handshake receipts (hash + linkage)
 * 2. Active lineage (live authority, not Pending-only)
 * 3. Revocation paths on Active sessions (path + authority + condition)
 * 4. Transport maturity (tested=true or Certified)
 *
 * HandshakePending → FederationGranted only when all four Pass.
 */
export function promotionConditionsMet(state: PromotionValidatorState): PromotionChecklist {
  const receipts = state.receipts;
  const registryEntries = state.receiptRegistry?.receipts ?? [];
  const lineage = state.sessionLineage;
  const transports = state.transports;
  const items: PromotionChecklistItem[] = [];

  // --- Evidence Layer 1: Indexed Handshake Receipts ---
  let indexedValid: HandshakeReceipt[] = [];
  if (registryEntries.length === 0) {
    items.push({
      id: 'indexed-handshake-receipts',
      layer: 1,
      required: true,
      met: false,
      detail: 'Fail("No indexed handshake receipts")',
    });
  } else {
    const byId = new Map(receipts.map((r) => [r.receiptId, r]));
    indexedValid = registryEntries
      .map((entry) => byId.get(entry.receiptId))
      .filter((r): r is HandshakeReceipt => Boolean(r))
      .filter((r) => verifyHandshakeReceiptHashAndLinkage(r));

    items.push({
      id: 'indexed-handshake-receipts',
      layer: 1,
      required: true,
      met: indexedValid.length >= 1,
      detail:
        indexedValid.length >= 1
          ? `Pass: ${indexedValid.length} valid indexed receipt(s) with hash + linkage`
          : 'Fail("No valid handshake receipts")',
    });
  }

  // --- Evidence Layer 2: Active Lineage ---
  let activeSessions: SessionLineageEntry[] = [];
  if (lineage.entries.length === 0) {
    items.push({
      id: 'active-lineage',
      layer: 2,
      required: true,
      met: false,
      detail: 'Fail("No lineage entries")',
    });
  } else {
    activeSessions = lineage.entries.filter(
      (s) =>
        s.status === 'Active' &&
        Boolean(s.receiptId?.trim()) &&
        Boolean(s.transportId?.trim()) &&
        Boolean(s.adapterId?.trim()) &&
        Boolean(s.sessionId?.trim()) &&
        Boolean(s.remoteId?.trim()),
    );
    items.push({
      id: 'active-lineage',
      layer: 2,
      required: true,
      met: activeSessions.length >= 1,
      detail:
        activeSessions.length >= 1
          ? `Pass: ${activeSessions.length} Active session(s) with receipt/adapter/transport linkage`
          : 'Fail("No active sessions with valid receipt linkage")',
    });
  }

  // --- Evidence Layer 3: Revocation Paths ---
  const revocableSessions = activeSessions.filter(
    (s) =>
      s.revocationEvent != null &&
      Boolean(s.revocationEvent.path?.trim()) &&
      Boolean(s.revocationEvent.authority?.trim()) &&
      Boolean(s.revocationEvent.condition?.trim()),
  );
  items.push({
    id: 'revocation-paths',
    layer: 3,
    required: true,
    met: revocableSessions.length >= 1,
    detail:
      revocableSessions.length >= 1
        ? `Pass: ${revocableSessions.length} Active session(s) with revocation path + authority + condition`
        : 'Fail("Active sessions lack revocation paths")',
  });

  // --- Evidence Layer 4: Transport Maturity ---
  const certifiedOrTested = transports.filter((t) => t.tested === true || t.maturity === 'Certified');
  items.push({
    id: 'transport-maturity',
    layer: 4,
    required: true,
    met: certifiedOrTested.length >= 1,
    detail:
      certifiedOrTested.length >= 1
        ? `Pass: ${certifiedOrTested.map((t) => `${t.transportId}(tested=${t.tested},maturity=${t.maturity})`).join(', ')}`
        : 'Fail("No tested or certified transports")',
  });

  const met = items.every((i) => i.met);
  return {
    version: '1.1.0',
    met,
    verdict: met ? 'Pass' : 'Fail',
    message: met ? 'Pass("Promotion conditions satisfied")' : items.find((i) => !i.met)?.detail ?? 'Fail',
    items,
  };
}

/** @deprecated prefer promotionConditionsMet — kept for call-site compatibility */
export function evaluatePromotionConditions(input: PromotionValidatorState): PromotionChecklist {
  return promotionConditionsMet(input);
}

export function buildActiveRevocationEvent(receiptId: string): SessionRevocationEvent {
  return {
    path: `CCR-AAES-OS-RuntimeFederation#revoke:${receiptId}`,
    authority: 'CCR-AAES-OS-RuntimeFederation',
    condition:
      'operator or governing CCR may revoke before expiresAt; setting receipt.revoked=true ends live mesh authority',
    executed: null,
  };
}

function verifyHandshakeReceiptHashAndLinkage(r: HandshakeReceipt): boolean {
  if (!r.receiptId || !r.sessionId || !r.transportId || !r.adapterId || !r.remoteId) return false;
  if (!r.issuedAt || !r.expiresAt || !r.receiptHash) return false;
  const expected = computeReceiptHash({
    receiptId: r.receiptId,
    sessionId: r.sessionId,
    remoteId: r.remoteId,
    adapterId: r.adapterId,
    transportId: r.transportId,
    constitutionalMaturity: r.constitutionalMaturity,
    capabilitiesGranted: r.capabilitiesGranted,
    issuedAt: r.issuedAt,
    expiresAt: r.expiresAt,
    issuer: r.issuer,
    revocationPath: r.revocationPath,
  });
  return r.receiptHash === expected;
}

function loadHandshakeReceiptRegistry(root: string): HandshakeReceiptRegistry | null {
  const registryPath = path.join(
    root,
    'docs',
    'release',
    'sibling-repos',
    'federation',
    'handshake-receipt-registry.json',
  );
  if (!existsSync(registryPath)) return null;
  return JSON.parse(readFileSync(registryPath, 'utf8')) as HandshakeReceiptRegistry;
}


export function buildSignedHandshakeReceipt(
  payload: HandshakeReceiptPayload,
  extras: Partial<HandshakeReceipt> = {},
): HandshakeReceipt {
  return {
    contractId: 'CRC-AAES-OS-HandshakeReceipt',
    ...payload,
    ...extras,
    receiptHash: computeReceiptHash(payload),
  };
}

function deny(
  state: 'NotEligible' | 'FederationDenied',
  request: HandshakeRequest,
  reasons: string[],
  checkedAt: string,
  adapterId: string | null,
): FederationDecision {
  return {
    state,
    allowLiveSession: false,
    remoteId: request.remoteId,
    adapterId,
    transportId: request.transportId ?? null,
    sessionId: request.sessionId ?? null,
    receiptId: null,
    reasons,
    checkedAt,
  };
}

function sealSessionEntry(
  input: Omit<SessionLineageEntry, 'entryHash'>,
): SessionLineageEntry {
  const withoutHash = { ...input };
  return {
    ...withoutHash,
    entryHash: hashJson(withoutHash),
  };
}

function computeLineageAggregateHash(entries: SessionLineageEntry[]): string {
  return hashJson(entries.map((e) => ({ sessionId: e.sessionId, status: e.status, entryHash: e.entryHash })));
}

function emptySessionLineageLog(generatedAt: string): SessionLineageLog {
  return {
    artifact: 'session-lineage-log',
    version: '0.1.0',
    ccrId: 'CCR-AAES-OS-RuntimeFederation',
    generatedAt,
    entries: [],
    aggregateHash: hashJson([]),
    truthBoundary:
      'Append-only session lineage. Empty log means no federation sessions have been requested or granted.',
  };
}

function appendSessionLineage(
  root: string,
  input: Omit<SessionLineageEntry, 'entryHash'>,
): SessionLineageEntry {
  const log = loadSessionLineageLog(root);
  const entry = sealSessionEntry(input);
  log.entries.push(entry);
  persistSessionLineageLog(root, log);
  return entry;
}

function upsertSessionLineage(
  root: string,
  input: Omit<SessionLineageEntry, 'entryHash'>,
): SessionLineageEntry {
  const log = loadSessionLineageLog(root);
  const entry = sealSessionEntry(input);
  const idx = log.entries.findIndex((e) => e.sessionId === input.sessionId);
  if (idx >= 0) log.entries[idx] = entry;
  else log.entries.push(entry);
  persistSessionLineageLog(root, log);
  return entry;
}

function persistSessionLineageLog(root: string, log: SessionLineageLog): void {
  const federationDir = path.join(root, 'docs', 'release', 'sibling-repos', 'federation');
  mkdirSync(federationDir, { recursive: true });
  const sealed: SessionLineageLog = {
    ...log,
    aggregateHash: computeLineageAggregateHash(log.entries),
  };
  writeJson(path.join(federationDir, 'session-lineage-log.json'), sealed);
}

function applyExpiry(log: SessionLineageLog, now: Date): SessionLineageLog {
  const t = now.getTime();
  const entries = log.entries.map((e) => {
    if (e.status !== 'Active' || !e.expiresAt) return e;
    if (Date.parse(e.expiresAt) >= t) return e;
    return sealSessionEntry({
      sessionId: e.sessionId,
      remoteId: e.remoteId,
      adapterId: e.adapterId,
      transportId: e.transportId,
      receiptId: e.receiptId,
      startedAt: e.startedAt,
      endedAt: now.toISOString(),
      expiresAt: e.expiresAt,
      status: 'Expired',
      revocationEvent: {
        path: e.revocationEvent?.path ?? `CCR-AAES-OS-RuntimeFederation#expire:${e.receiptId ?? e.sessionId}`,
        authority: e.revocationEvent?.authority ?? 'CCR-AAES-OS-RuntimeFederation',
        condition: e.revocationEvent?.condition ?? 'session expiresAt elapsed',
        executed: {
          who: 'runtime-federation-expiry',
          when: now.toISOString(),
          why: 'receipt/session validity window elapsed',
        },
      },
    });
  });
  return { ...log, entries, aggregateHash: computeLineageAggregateHash(entries) };
}

function writeHandshakeReceiptRegistry(federationDir: string, receipts: HandshakeReceipt[]): void {
  const registry: HandshakeReceiptRegistry = {
    registryId: 'aaes-os-handshake-receipt-registry',
    version: '0.1.0',
    status: 'Published',
    ccrId: 'CCR-AAES-OS-RuntimeFederation',
    contractId: 'CRC-AAES-OS-HandshakeReceipt',
    receipts: receipts.map((r) => ({
      receiptId: r.receiptId,
      sessionId: r.sessionId,
      remoteId: r.remoteId,
      adapterId: r.adapterId,
      transportId: r.transportId,
      path: normalizePath(path.join(federationDir, 'receipts', `${r.receiptId}.json`)),
      receiptHash: r.receiptHash,
      revoked: r.revoked === true,
    })),
    truthBoundary:
      'Indexed handshake receipts only. Empty registry means no live federation grants exist.',
  };
  writeJson(path.join(federationDir, 'handshake-receipt-registry.json'), registry);
}

function writeFederationArtifacts(
  federationDir: string,
  index: RuntimeFederationEvidenceIndex,
  receipts: HandshakeReceipt[],
): void {
  mkdirSync(path.join(federationDir, 'receipts'), { recursive: true });
  writeHandshakeReceiptRegistry(federationDir, receipts);
  writeJson(path.join(federationDir, 'handshake-receipt-evidence-index.json'), index);
  writeJson(path.join(federationDir, 'latest.json'), index);
  writeJson(path.join(federationDir, 'lineage-log.json'), index.lineage);
  for (const receipt of receipts) {
    writeJson(path.join(federationDir, 'receipts', `${receipt.receiptId}.json`), receipt);
  }
}

function normalizeMaturity(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

function maturityCompatible(receipt: string, remote: string): boolean {
  return receipt === remote;
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

function writeJson(filePath: string, value: unknown): void {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const index = buildRuntimeFederationEvidence({ write: true });
  console.log(`runtime federation evidence: ${index.implementationStatus}`);
  console.log(
    `decisions: NotEligible=${index.summary.decisions.NotEligible} HandshakePending=${index.summary.decisions.HandshakePending} Denied=${index.summary.decisions.FederationDenied} Granted=${index.summary.decisions.FederationGranted}`,
  );
  console.log(
    `transports: ${index.summary.transportsDeclared} declared / ${index.summary.transportsTested} tested / ${index.summary.transportsCertified} certified; receipts valid=${index.summary.receiptsValid}; lineageActive=${index.summary.lineageActive}`,
  );
  console.log(`promotionConditionsMet=${index.promotionConditionsMet} (${index.promotionChecklist.verdict})`);
  console.log(`  ${index.promotionChecklist.message}`);
  for (const item of index.promotionChecklist.items) {
    console.log(`  L${item.layer} [${item.met ? 'Pass' : 'Fail'}] ${item.id}: ${item.detail}`);
  }
  console.log(`aggregate hash: ${index.aggregateHash}`);
}
