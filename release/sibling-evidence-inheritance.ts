import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildSiblingRepoEvidence,
  type SiblingRepoEvidenceIndex,
  type SiblingRepoObservation,
} from '../tools/sibling-repo-evidence.ts';
import {
  buildSiblingAdapterContractEvidence,
  type AdapterContractEvidenceIndex,
} from '../tools/sibling-adapter-contracts.ts';
import {
  buildRuntimeFederationEvidence,
  type RuntimeFederationEvidenceIndex,
} from '../tools/runtime-federation.ts';
import { getRepoRoot } from './shared.ts';

export const CCR_AAES_OS_SIBLING_REPO_DISCOVERY = 'CCR-AAES-OS-SiblingRepoDiscovery';
export const CCR_AAES_OS_SIBLING_ADAPTER_CONTRACTS = 'CCR-AAES-OS-SiblingAdapterContracts';
export const CCR_AAES_OS_RUNTIME_FEDERATION = 'CCR-AAES-OS-RuntimeFederation';

export interface CanonicalLineageSnapshot {
  siblingId: string;
  path: string;
  status: SiblingRepoObservation['status'];
  remoteUrl: string | null;
  headCommit: string | null;
  scorecardPresent: boolean;
  receiptPresent: boolean;
  observedMaturity: string | null;
  receiptVerificationDate: string | null;
  receiptHash: string | null;
  truthBoundary: string;
}

export interface SiblingRepoEvidenceInheritance {
  ccrId: typeof CCR_AAES_OS_SIBLING_REPO_DISCOVERY;
  condition: string;
  inherited: boolean;
  evidenceSource: string;
  generatedAt: string;
  siblingAggregateStatus: SiblingRepoEvidenceIndex['status'];
  inheritedFields: {
    siblingAggregateHash: string;
    siblingSummary: SiblingRepoEvidenceIndex['summary'];
    canonicalLineage: CanonicalLineageSnapshot | null;
    adapterContracts: {
      ccrId: typeof CCR_AAES_OS_SIBLING_ADAPTER_CONTRACTS;
      status: AdapterContractEvidenceIndex['status'];
      aggregateHash: string;
      passed: number;
      failed: number;
      deferredFamilies: number;
    } | null;
    runtimeFederation: {
      ccrId: typeof CCR_AAES_OS_RUNTIME_FEDERATION;
      implementationStatus: RuntimeFederationEvidenceIndex['implementationStatus'];
      promotionConditionsMet: boolean;
      aggregateHash: string;
      liveSessionsGranted: number;
      adaptersVerified: number;
      transportsDeclared: number;
      transportsTested: number;
    } | null;
  };
  authority: {
    source: 'sibling-repo-evidence-index';
    kind: 'aggregate_hash';
    value: string;
  };
  propagation: string[];
  connectionLadder: string[];
  constitutionalGuarantee: string;
}

export function loadSiblingRepoEvidenceIndex(root = getRepoRoot()): SiblingRepoEvidenceIndex | null {
  const evidencePath = join(root, 'docs', 'release', 'sibling-repos', 'sibling-repo-evidence-index.json');
  if (!existsSync(evidencePath)) {
    return null;
  }
  return JSON.parse(readFileSync(evidencePath, 'utf8')) as SiblingRepoEvidenceIndex;
}

export function ensureSiblingRepoEvidence(options: { root?: string; write?: boolean } = {}): SiblingRepoEvidenceIndex {
  return buildSiblingRepoEvidence({
    root: options.root ?? getRepoRoot(),
    write: options.write ?? true,
  });
}

export function buildCanonicalLineageSnapshot(
  index: SiblingRepoEvidenceIndex,
): CanonicalLineageSnapshot | null {
  const canonical = index.observations.find((o) => o.id === 'project-infi' || o.role === 'canonical-mirror-source');
  if (!canonical?.observed.exists) {
    return null;
  }

  const scorecardPath = join(canonical.path, 'docs', 'scorecards', 'project-infi.md');
  const receiptPath = join(canonical.path, 'release', 'constitutional-release-receipt.json');
  const scorecardPresent = existsSync(scorecardPath);
  const receiptPresent = existsSync(receiptPath);

  let observedMaturity: string | null = null;
  let receiptVerificationDate: string | null = null;
  let receiptHash: string | null = null;

  if (receiptPresent) {
    try {
      const receipt = JSON.parse(readFileSync(receiptPath, 'utf8')) as {
        constitutionalMaturity?: string;
        verificationDate?: string;
        receiptHash?: string;
      };
      observedMaturity = receipt.constitutionalMaturity ?? null;
      receiptVerificationDate = receipt.verificationDate ?? null;
      receiptHash = receipt.receiptHash ?? null;
    } catch {
      // leave nulls — malformed sibling receipt is not inherited
    }
  }

  if (!observedMaturity && scorecardPresent) {
    try {
      const scorecard = readFileSync(scorecardPath, 'utf8');
      const match = scorecard.match(/\|\s*Current maturity\s*\|\s*(.+?)\s*\|/i);
      observedMaturity = match?.[1]?.trim() ?? null;
    } catch {
      // ignore
    }
  }

  return {
    siblingId: canonical.id,
    path: canonical.path,
    status: canonical.status,
    remoteUrl: canonical.observed.remoteUrl,
    headCommit: canonical.observed.headCommit,
    scorecardPresent,
    receiptPresent,
    observedMaturity,
    receiptVerificationDate,
    receiptHash,
    truthBoundary:
      'Canonical lineage records what project-infi publishes locally. It does not automatically raise AAES-OS-clone maturity claims.',
  };
}

export function ensureSiblingAdapterContracts(options: { root?: string; write?: boolean } = {}): AdapterContractEvidenceIndex {
  return buildSiblingAdapterContractEvidence({
    root: options.root ?? getRepoRoot(),
    write: options.write ?? true,
  });
}

export function ensureRuntimeFederationEvidence(options: {
  root?: string;
  write?: boolean;
} = {}): RuntimeFederationEvidenceIndex {
  return buildRuntimeFederationEvidence({
    root: options.root ?? getRepoRoot(),
    write: options.write ?? true,
  });
}

export function buildSiblingRepoEvidenceInheritance(
  index: SiblingRepoEvidenceIndex | null = loadSiblingRepoEvidenceIndex(),
  adapterIndex: AdapterContractEvidenceIndex | null = null,
  federationIndex: RuntimeFederationEvidenceIndex | null = null,
): SiblingRepoEvidenceInheritance | null {
  if (!index || (index.status !== 'verified' && index.status !== 'partial')) {
    return null;
  }

  const adapters = adapterIndex;
  const federation = federationIndex;

  return {
    ccrId: CCR_AAES_OS_SIBLING_REPO_DISCOVERY,
    condition: 'sibling-repo-evidence-index exists with status verified|partial',
    inherited: true,
    evidenceSource: 'docs/release/sibling-repos/sibling-repo-evidence-index.json',
    generatedAt: index.generatedAt,
    siblingAggregateStatus: index.status,
    inheritedFields: {
      siblingAggregateHash: index.aggregateHash,
      siblingSummary: index.summary,
      canonicalLineage: buildCanonicalLineageSnapshot(index),
      adapterContracts: adapters
        ? {
            ccrId: CCR_AAES_OS_SIBLING_ADAPTER_CONTRACTS,
            status: adapters.status,
            aggregateHash: adapters.aggregateHash,
            passed: adapters.summary.passed,
            failed: adapters.summary.failed,
            deferredFamilies: adapters.summary.deferredFamilies,
          }
        : null,
      runtimeFederation: federation
        ? {
            ccrId: CCR_AAES_OS_RUNTIME_FEDERATION,
            implementationStatus: federation.implementationStatus,
            promotionConditionsMet: federation.promotionConditionsMet,
            aggregateHash: federation.aggregateHash,
            liveSessionsGranted: federation.summary.liveSessionsGranted,
            adaptersVerified: federation.summary.adaptersVerified,
            transportsDeclared: federation.summary.transportsDeclared,
            transportsTested: federation.summary.transportsTested,
          }
        : null,
    },
    authority: {
      source: 'sibling-repo-evidence-index',
      kind: 'aggregate_hash',
      value: index.aggregateHash,
    },
    propagation: [
      'sibling-evidence-index',
      'adapter-contract-evidence',
      'handshake-receipt-evidence',
      'federation-lineage-log',
      'production-hardening-index',
      'scorecard',
      'verification-lineage',
    ],
    connectionLadder: [
      'discovery-registry',
      'local-evidence-probe',
      'canonical-inheritance',
      'adapter-contracts',
      'runtime-federation',
    ],
    constitutionalGuarantee:
      'Cross-repo maturity language must inherit the latest sibling discovery evidence. Verified adapters prove checkout authority only; live federation requires a valid handshake receipt under CCR-AAES-OS-RuntimeFederation.',
  };
}
