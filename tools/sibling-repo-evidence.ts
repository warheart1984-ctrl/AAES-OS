#!/usr/bin/env node
/**
 * Sibling-repo discovery evidence.
 *
 * Probes declared paths from docs/release/sibling-repos/sibling-repo-registry.json:
 * presence, .git, origin remote, and expected artifact files.
 *
 * Truth boundary: this proves local checkout discovery and optional git remotes.
 * It does NOT prove live federation, shared runtime authority, or API connectivity.
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type SiblingRepoStatus = 'verified' | 'partial' | 'missing';

export interface SiblingRepoObservation {
  id: string;
  family: string;
  role: string;
  path: string;
  status: SiblingRepoStatus;
  checkedAt: string;
  evidenceHash: string;
  observed: {
    exists: boolean;
    isGitRepo: boolean;
    remoteUrl: string | null;
    headCommit: string | null;
    artifactsPresent: string[];
    artifactsMissing: string[];
  };
  blockers: string[];
}

export interface SiblingRepoEvidenceIndex {
  artifact: 'sibling-repo-evidence-index';
  version: '0.1.0';
  generatedAt: string;
  workspace: string;
  registryPath: string;
  status: 'verified' | 'partial' | 'blocked';
  observations: SiblingRepoObservation[];
  summary: {
    declared: number;
    verified: number;
    partial: number;
    missing: number;
    families: string[];
  };
  aggregateHash: string;
  truthBoundary: string;
}

interface SiblingEntry {
  id: string;
  path: string;
  family: string;
  role: string;
  expectedArtifacts?: string[];
  notes?: string;
}

interface SiblingRegistry {
  siblings: SiblingEntry[];
}

interface BuildOptions {
  root?: string;
  registryPath?: string;
  outputDir?: string;
  now?: Date;
  write?: boolean;
}

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TRUTH_BOUNDARY =
  'This index records local sibling-checkout discovery and optional git remotes. It does not prove live federation, shared runtime authority, or API connectivity between repos.';

export function buildSiblingRepoEvidence(options: BuildOptions = {}): SiblingRepoEvidenceIndex {
  const root = options.root ?? defaultRoot;
  const registryPath =
    options.registryPath ?? path.join(root, 'docs', 'release', 'sibling-repos', 'sibling-repo-registry.json');
  const outputDir = options.outputDir ?? path.join(root, 'docs', 'release', 'sibling-repos');
  const checkedAt = (options.now ?? new Date()).toISOString();

  if (!existsSync(registryPath)) {
    throw new Error(`sibling-repo registry missing: ${registryPath}`);
  }

  const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as SiblingRegistry;
  const observations = (registry.siblings ?? []).map((entry) => probeSibling(entry, checkedAt));

  const verified = observations.filter((o) => o.status === 'verified').length;
  const partial = observations.filter((o) => o.status === 'partial').length;
  const missing = observations.filter((o) => o.status === 'missing').length;
  const families = [...new Set(observations.map((o) => o.family))].sort();

  let status: SiblingRepoEvidenceIndex['status'] = 'blocked';
  if (missing === 0 && partial === 0 && verified > 0) status = 'verified';
  else if (verified + partial > 0) status = 'partial';

  const index: SiblingRepoEvidenceIndex = {
    artifact: 'sibling-repo-evidence-index',
    version: '0.1.0',
    generatedAt: checkedAt,
    workspace: normalizePath(root),
    registryPath: normalizePath(registryPath),
    status,
    observations,
    summary: {
      declared: observations.length,
      verified,
      partial,
      missing,
      families,
    },
    aggregateHash: hashJson(
      observations.map((o) => ({ id: o.id, status: o.status, evidenceHash: o.evidenceHash })),
    ),
    truthBoundary: TRUTH_BOUNDARY,
  };

  if (options.write ?? true) {
    writeEvidenceFiles(outputDir, index);
  }

  return index;
}

export function isSiblingRepoEvidenceIndex(value: unknown): value is SiblingRepoEvidenceIndex {
  if (typeof value !== 'object' || value === null) return false;
  const index = value as Partial<SiblingRepoEvidenceIndex>;
  return (
    index.artifact === 'sibling-repo-evidence-index' &&
    index.version === '0.1.0' &&
    typeof index.generatedAt === 'string' &&
    typeof index.aggregateHash === 'string' &&
    Array.isArray(index.observations)
  );
}

function probeSibling(entry: SiblingEntry, checkedAt: string): SiblingRepoObservation {
  const absPath = path.resolve(entry.path);
  const exists = existsSync(absPath);
  const gitDir = path.join(absPath, '.git');
  const isGitRepo = exists && existsSync(gitDir);
  let remoteUrl: string | null = null;
  let headCommit: string | null = null;

  if (isGitRepo) {
    try {
      remoteUrl = execFileSync('git', ['-C', absPath, 'remote', 'get-url', 'origin'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim();
    } catch {
      remoteUrl = null;
    }
    try {
      headCommit = execFileSync('git', ['-C', absPath, 'rev-parse', 'HEAD'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim();
    } catch {
      headCommit = null;
    }
  }

  const expected = entry.expectedArtifacts ?? ['README.md'];
  const artifactsPresent: string[] = [];
  const artifactsMissing: string[] = [];
  for (const artifact of expected) {
    if (exists && existsSync(path.join(absPath, artifact))) {
      artifactsPresent.push(artifact);
    } else {
      artifactsMissing.push(artifact);
    }
  }

  const blockers: string[] = [];
  if (!exists) blockers.push('path does not exist');
  if (exists && artifactsMissing.length > 0) {
    blockers.push(`missing artifacts: ${artifactsMissing.join(', ')}`);
  }

  let status: SiblingRepoStatus = 'missing';
  if (exists && artifactsMissing.length === 0 && (isGitRepo ? Boolean(headCommit) : true)) {
    status = isGitRepo && remoteUrl ? 'verified' : 'partial';
  } else if (exists) {
    status = 'partial';
  }

  const observed = {
    exists,
    isGitRepo,
    remoteUrl,
    headCommit,
    artifactsPresent,
    artifactsMissing,
  };

  return {
    id: entry.id,
    family: entry.family,
    role: entry.role,
    path: normalizePath(absPath),
    status,
    checkedAt,
    evidenceHash: hashJson({ id: entry.id, path: absPath, observed, blockers }),
    observed,
    blockers,
  };
}

function writeEvidenceFiles(outputDir: string, index: SiblingRepoEvidenceIndex): void {
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'sibling-repo-evidence-index.json');
  writeFileSync(jsonPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');

  const lines = [
    '# Sibling Repo Evidence',
    '',
    `Generated: ${index.generatedAt}`,
    '',
    `Status: \`${index.status}\``,
    '',
    `Aggregate hash: \`${index.aggregateHash}\``,
    '',
    `Declared: ${index.summary.declared} · verified: ${index.summary.verified} · partial: ${index.summary.partial} · missing: ${index.summary.missing}`,
    '',
    '| Id | Family | Path | Git remote | Status |',
    '| --- | --- | --- | --- | --- |',
    ...index.observations.map(
      (o) =>
        `| ${o.id} | ${o.family} | \`${o.path}\` | ${o.observed.remoteUrl ?? '—'} | ${o.status} |`,
    ),
    '',
    index.truthBoundary,
    '',
  ];
  writeFileSync(path.join(outputDir, 'README.md'), `${lines.join('\n')}\n`, 'utf8');
  console.log(`sibling-repo evidence written: ${jsonPath}`);
  console.log(`status: ${index.status} (${index.summary.verified} verified / ${index.summary.partial} partial / ${index.summary.missing} missing)`);
  console.log(`aggregate hash: ${index.aggregateHash}`);
}

function hashJson(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  buildSiblingRepoEvidence({ write: true });
}
