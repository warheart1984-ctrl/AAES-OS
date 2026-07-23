#!/usr/bin/env node
/**
 * Fail-closed sibling adapter contracts (connection ladder step 4).
 *
 * Prerequisite: sibling discovery status === verified for the target.
 * Missing remote / artifact / receipt requirement ⇒ contract fail (never soft-pass).
 *
 * Truth boundary: checkout contract readiness ≠ live federation.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildSiblingRepoEvidence,
  type SiblingRepoEvidenceIndex,
  type SiblingRepoObservation,
} from './sibling-repo-evidence.ts';

export type AdapterContractVerdict = 'pass' | 'fail';

export interface AdapterReceiptRequirements {
  constitutionalReceiptPath: string | null;
  requireReceiptHash: boolean;
  requireMaturityField: boolean;
}

export interface AdapterContractDefinition {
  adapterId: string;
  siblingId: string;
  family: string;
  mode: string;
  expectedRemote: string;
  requiredArtifacts: string[];
  receiptRequirements: AdapterReceiptRequirements;
  knownLimitations?: string[];
}

export interface AdapterContractRegistry {
  registryId: string;
  version: string;
  failClosedDefault: boolean;
  adapters: AdapterContractDefinition[];
  deferredFamilies?: Array<{ family: string; reason: string; status: string }>;
  truthBoundary?: string;
}

export interface AdapterContractCheck {
  id: string;
  passed: boolean;
  detail: string;
}

export interface AdapterContractReceipt {
  artifact: 'sibling-adapter-contract-receipt';
  version: '0.1.0';
  adapterId: string;
  siblingId: string;
  family: string;
  mode: string;
  failClosed: true;
  verdict: AdapterContractVerdict;
  checkedAt: string;
  evidenceHash: string;
  siblingEvidenceHash: string | null;
  path: string | null;
  remoteUrl: string | null;
  headCommit: string | null;
  checks: AdapterContractCheck[];
  blockers: string[];
  knownLimitations: string[];
  observedReceipt: {
    path: string | null;
    maturity: string | null;
    receiptHash: string | null;
    verificationDate: string | null;
  };
  truthBoundary: string;
}

export interface AdapterContractEvidenceIndex {
  artifact: 'sibling-adapter-contract-evidence-index';
  version: '0.1.0';
  generatedAt: string;
  workspace: string;
  registryPath: string;
  siblingEvidencePath: string;
  siblingAggregateHash: string | null;
  status: 'verified' | 'partial' | 'blocked';
  failClosed: true;
  summary: {
    declared: number;
    passed: number;
    failed: number;
    deferredFamilies: number;
  };
  receipts: AdapterContractReceipt[];
  deferredFamilies: Array<{ family: string; reason: string; status: string }>;
  aggregateHash: string;
  truthBoundary: string;
}

interface BuildOptions {
  root?: string;
  write?: boolean;
  now?: Date;
}

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TRUTH_BOUNDARY =
  'Adapter contracts prove fail-closed local contract checks against verified sibling checkouts. They do not prove live RPC/federation or shared runtime authority.';

export function buildSiblingAdapterContractEvidence(options: BuildOptions = {}): AdapterContractEvidenceIndex {
  const root = options.root ?? defaultRoot;
  const checkedAt = (options.now ?? new Date()).toISOString();
  const registryPath = path.join(root, 'docs', 'release', 'sibling-repos', 'adapters', 'adapter-contract-registry.json');
  const outputDir = path.join(root, 'docs', 'release', 'sibling-repos', 'adapters');
  const siblingEvidencePath = path.join(root, 'docs', 'release', 'sibling-repos', 'sibling-repo-evidence-index.json');

  if (!existsSync(registryPath)) {
    throw new Error(`adapter contract registry missing: ${registryPath}`);
  }

  const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as AdapterContractRegistry;
  const siblingEvidence = buildSiblingRepoEvidence({ root, write: options.write ?? true });
  const bySibling = new Map(siblingEvidence.observations.map((o) => [o.id, o]));

  const receipts = registry.adapters.map((adapter) =>
    evaluateAdapter(adapter, bySibling.get(adapter.siblingId) ?? null, siblingEvidence, checkedAt),
  );

  const passed = receipts.filter((r) => r.verdict === 'pass').length;
  const failed = receipts.length - passed;
  const deferredFamilies = registry.deferredFamilies ?? [];

  let status: AdapterContractEvidenceIndex['status'] = 'blocked';
  if (failed === 0 && passed > 0) status = 'verified';
  else if (passed > 0) status = 'partial';

  const index: AdapterContractEvidenceIndex = {
    artifact: 'sibling-adapter-contract-evidence-index',
    version: '0.1.0',
    generatedAt: checkedAt,
    workspace: normalizePath(root),
    registryPath: normalizePath(registryPath),
    siblingEvidencePath: normalizePath(siblingEvidencePath),
    siblingAggregateHash: siblingEvidence.aggregateHash,
    status,
    failClosed: true,
    summary: {
      declared: receipts.length,
      passed,
      failed,
      deferredFamilies: deferredFamilies.length,
    },
    receipts,
    deferredFamilies,
    aggregateHash: hashJson(
      receipts.map((r) => ({ adapterId: r.adapterId, verdict: r.verdict, evidenceHash: r.evidenceHash })),
    ),
    truthBoundary: registry.truthBoundary ?? TRUTH_BOUNDARY,
  };

  if (options.write ?? true) {
    writeEvidence(outputDir, index);
  }

  return index;
}

export function isAdapterContractEvidenceIndex(value: unknown): value is AdapterContractEvidenceIndex {
  if (typeof value !== 'object' || value === null) return false;
  const index = value as Partial<AdapterContractEvidenceIndex>;
  return (
    index.artifact === 'sibling-adapter-contract-evidence-index' &&
    index.version === '0.1.0' &&
    index.failClosed === true &&
    Array.isArray(index.receipts)
  );
}

function evaluateAdapter(
  adapter: AdapterContractDefinition,
  sibling: SiblingRepoObservation | null,
  siblingEvidence: SiblingRepoEvidenceIndex,
  checkedAt: string,
): AdapterContractReceipt {
  const checks: AdapterContractCheck[] = [];
  const blockers: string[] = [];

  const siblingVerified = sibling?.status === 'verified';
  checks.push({
    id: 'sibling-discovery-verified',
    passed: siblingVerified,
    detail: sibling
      ? `sibling status=${sibling.status}`
      : 'sibling observation missing from discovery index',
  });
  if (!siblingVerified) blockers.push('sibling discovery not verified (fail-closed)');

  const remoteOk =
    Boolean(sibling?.observed.remoteUrl) &&
    normalizeRemote(sibling!.observed.remoteUrl!) === normalizeRemote(adapter.expectedRemote);
  checks.push({
    id: 'remote-match',
    passed: remoteOk,
    detail: `expected=${adapter.expectedRemote}; observed=${sibling?.observed.remoteUrl ?? 'null'}`,
  });
  if (!remoteOk) blockers.push('git remote does not match expected adapter remote');

  const absPath = sibling?.path ? path.resolve(sibling.path) : null;
  const artifactsPresent: string[] = [];
  const artifactsMissing: string[] = [];
  for (const artifact of adapter.requiredArtifacts) {
    const full = absPath ? path.join(absPath, artifact) : '';
    if (absPath && existsSync(full)) artifactsPresent.push(artifact);
    else artifactsMissing.push(artifact);
  }
  const artifactsOk = artifactsMissing.length === 0 && Boolean(absPath);
  checks.push({
    id: 'required-artifacts',
    passed: artifactsOk,
    detail: artifactsOk
      ? `present=${artifactsPresent.join(',')}`
      : `missing=${artifactsMissing.join(',')}`,
  });
  if (!artifactsOk) blockers.push(`missing required artifacts: ${artifactsMissing.join(', ')}`);

  let maturity: string | null = null;
  let receiptHash: string | null = null;
  let verificationDate: string | null = null;
  const receiptRel = adapter.receiptRequirements.constitutionalReceiptPath;
  const receiptAbs = absPath && receiptRel ? path.join(absPath, receiptRel) : null;

  if (receiptRel) {
    const receiptExists = Boolean(receiptAbs && existsSync(receiptAbs));
    checks.push({
      id: 'constitutional-receipt-present',
      passed: receiptExists,
      detail: receiptExists ? `found ${receiptRel}` : `missing ${receiptRel}`,
    });
    if (!receiptExists) blockers.push(`constitutional receipt missing: ${receiptRel}`);

    if (receiptExists && receiptAbs) {
      try {
        const receipt = JSON.parse(readFileSync(receiptAbs, 'utf8')) as {
          constitutionalMaturity?: string;
          receiptHash?: string;
          verificationDate?: string;
        };
        maturity = typeof receipt.constitutionalMaturity === 'string' ? receipt.constitutionalMaturity : null;
        receiptHash = typeof receipt.receiptHash === 'string' ? receipt.receiptHash : null;
        verificationDate = typeof receipt.verificationDate === 'string' ? receipt.verificationDate : null;
      } catch {
        blockers.push('constitutional receipt unreadable/malformed');
        checks.push({
          id: 'constitutional-receipt-parse',
          passed: false,
          detail: 'JSON parse failed',
        });
      }
    }

    if (adapter.receiptRequirements.requireMaturityField) {
      const ok = Boolean(maturity);
      checks.push({
        id: 'receipt-maturity-field',
        passed: ok,
        detail: ok ? `constitutionalMaturity=${maturity}` : 'constitutionalMaturity missing',
      });
      if (!ok) blockers.push('receipt missing constitutionalMaturity');
    }

    if (adapter.receiptRequirements.requireReceiptHash) {
      const ok = Boolean(receiptHash);
      checks.push({
        id: 'receipt-hash-field',
        passed: ok,
        detail: ok ? `receiptHash=${receiptHash}` : 'receiptHash missing',
      });
      if (!ok) blockers.push('receipt missing receiptHash');
    }
  } else {
    checks.push({
      id: 'constitutional-receipt-present',
      passed: true,
      detail: 'not required for this adapter mode',
    });
  }

  // Fail-closed: any failed check ⇒ fail
  const verdict: AdapterContractVerdict = checks.every((c) => c.passed) && blockers.length === 0 ? 'pass' : 'fail';

  const body = {
    adapterId: adapter.adapterId,
    siblingId: adapter.siblingId,
    verdict,
    checks,
    blockers,
    remoteUrl: sibling?.observed.remoteUrl ?? null,
    headCommit: sibling?.observed.headCommit ?? null,
  };

  return {
    artifact: 'sibling-adapter-contract-receipt',
    version: '0.1.0',
    adapterId: adapter.adapterId,
    siblingId: adapter.siblingId,
    family: adapter.family,
    mode: adapter.mode,
    failClosed: true,
    verdict,
    checkedAt,
    evidenceHash: hashJson(body),
    siblingEvidenceHash: siblingEvidence.aggregateHash,
    path: sibling?.path ?? null,
    remoteUrl: sibling?.observed.remoteUrl ?? null,
    headCommit: sibling?.observed.headCommit ?? null,
    checks,
    blockers,
    knownLimitations: adapter.knownLimitations ?? [],
    observedReceipt: {
      path: receiptRel,
      maturity,
      receiptHash,
      verificationDate,
    },
    truthBoundary: TRUTH_BOUNDARY,
  };
}

function writeEvidence(outputDir: string, index: AdapterContractEvidenceIndex): void {
  mkdirSync(outputDir, { recursive: true });
  const receiptsDir = path.join(outputDir, 'receipts');
  mkdirSync(receiptsDir, { recursive: true });

  for (const receipt of index.receipts) {
    writeFileSync(
      path.join(receiptsDir, `${receipt.adapterId}.json`),
      `${JSON.stringify(receipt, null, 2)}\n`,
      'utf8',
    );
  }

  writeFileSync(path.join(outputDir, 'adapter-contract-evidence-index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  writeFileSync(path.join(outputDir, 'latest.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');

  const lines = [
    '# Sibling Adapter Contract Evidence',
    '',
    `Generated: ${index.generatedAt}`,
    '',
    `Status: \`${index.status}\` (fail-closed)`,
    '',
    `Aggregate hash: \`${index.aggregateHash}\``,
    '',
    `Passed / failed: ${index.summary.passed} / ${index.summary.failed} (declared ${index.summary.declared})`,
    '',
    '| Adapter | Family | Sibling | Verdict | Remote |',
    '| --- | --- | --- | --- | --- |',
    ...index.receipts.map(
      (r) =>
        `| \`${r.adapterId}\` | ${r.family} | ${r.siblingId} | **${r.verdict}** | ${r.remoteUrl ?? '—'} |`,
    ),
    '',
    '## Deferred families',
    '',
    ...(index.deferredFamilies.length === 0
      ? ['None.']
      : index.deferredFamilies.map((d) => `- **${d.family}**: ${d.reason}`)),
    '',
    index.truthBoundary,
    '',
  ];
  writeFileSync(path.join(outputDir, 'README.md'), `${lines.join('\n')}\n`, 'utf8');

  console.log(`adapter-contract evidence written: ${path.join(outputDir, 'adapter-contract-evidence-index.json')}`);
  console.log(`status: ${index.status} (${index.summary.passed} pass / ${index.summary.failed} fail)`);
  console.log(`aggregate hash: ${index.aggregateHash}`);
}

function normalizeRemote(value: string): string {
  return value.trim().replace(/\.git$/i, '').toLowerCase();
}

function hashJson(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  buildSiblingAdapterContractEvidence({ write: true });
}
