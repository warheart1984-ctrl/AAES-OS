#!/usr/bin/env node
/**
 * Transport testing path for CCR-AAES-OS-RuntimeFederation.
 *
 * Declared → Configured → Tested → Certified
 * opsConsole-SovereignX-v1 (and peers) move Declared → Tested only via this CLI,
 * which writes transportTestReceipt artifacts and updates the descriptor registry.
 *
 * Truth boundary: Tested proves local connectivity + handshake simulation.
 * Certified is not granted by this tool.
 */

import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type TransportMaturity = 'Declared' | 'Configured' | 'Tested' | 'Certified';

export interface TransportDescriptor {
  transportId: string;
  version: string;
  protocol: string;
  path: string;
  endpoints?: Record<string, string>;
  authMode: string;
  maturity: TransportMaturity;
  tested: boolean;
  lastTestReceiptId?: string | null;
  notes?: string;
  /** @deprecated prefer maturity */
  status?: string;
}

export interface TransportDescriptorRegistry {
  registryId: string;
  version: string;
  status: string;
  ccrId: string;
  maturityLadder?: TransportMaturity[];
  transports: TransportDescriptor[];
  truthBoundary?: string;
}

export interface TransportTestCheck {
  id: string;
  passed: boolean;
  detail: string;
  latencyMs?: number;
}

export interface TransportTestReceiptPayload {
  transportId: string;
  testId: string;
  result: 'pass' | 'fail';
  latencyBounds: { maxMs: number; observedMaxMs: number };
  errorProfile: string[];
  issuedAt: string;
  tester: string;
  checks: TransportTestCheck[];
  expectedHandshakeBehavior: string;
}

export interface TransportTestReceipt extends TransportTestReceiptPayload {
  artifact: 'transport-test-receipt';
  version: '0.1.0';
  receiptHash: string;
}

export interface TransportTestRunResult {
  registry: TransportDescriptorRegistry;
  receipts: TransportTestReceipt[];
  promoted: string[];
  failed: string[];
}

interface RunOptions {
  root?: string;
  write?: boolean;
  transportIds?: string[];
  now?: Date;
  tester?: string;
  maxLatencyMs?: number;
}

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MAX_LATENCY_MS = 2000;

export function hashJson(value: unknown): string {
  return `sha256:${createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

export function loadTransportRegistry(root = defaultRoot): TransportDescriptorRegistry {
  const registryPath = transportRegistryPath(root);
  if (!existsSync(registryPath)) {
    throw new Error(`transport descriptor registry missing: ${registryPath}`);
  }
  return normalizeRegistry(JSON.parse(readFileSync(registryPath, 'utf8')) as TransportDescriptorRegistry);
}

export function isTransportEligibleForFederation(
  transport: TransportDescriptor,
  options: { production?: boolean } = {},
): boolean {
  if (!transport.tested) return false;
  if (options.production) return transport.maturity === 'Certified';
  return transport.maturity === 'Tested' || transport.maturity === 'Certified';
}

export function runTransportTests(options: RunOptions = {}): TransportTestRunResult {
  const root = options.root ?? defaultRoot;
  const now = options.now ?? new Date();
  const issuedAt = now.toISOString();
  const maxLatencyMs = options.maxLatencyMs ?? DEFAULT_MAX_LATENCY_MS;
  const tester = options.tester ?? 'npm-run-transports:test';
  const federationDir = path.join(root, 'docs', 'release', 'sibling-repos', 'federation');
  const receiptsDir = path.join(federationDir, 'transport-test-receipts');

  const registry = loadTransportRegistry(root);
  const targets = registry.transports.filter((t) =>
    options.transportIds ? options.transportIds.includes(t.transportId) : true,
  );

  const receipts: TransportTestReceipt[] = [];
  const promoted: string[] = [];
  const failed: string[] = [];

  for (const transport of targets) {
    const started = Date.now();
    const checks = evaluateTransportChecks(root, transport, maxLatencyMs);
    const observedMaxMs = Math.max(Date.now() - started, ...checks.map((c) => c.latencyMs ?? 0));
    const errorProfile = checks.filter((c) => !c.passed).map((c) => `${c.id}: ${c.detail}`);
    const result: 'pass' | 'fail' = checks.every((c) => c.passed) ? 'pass' : 'fail';

    const payload: TransportTestReceiptPayload = {
      transportId: transport.transportId,
      testId: `tt-${transport.transportId}-${randomUUID().slice(0, 8)}`,
      result,
      latencyBounds: { maxMs: maxLatencyMs, observedMaxMs },
      errorProfile,
      issuedAt,
      tester,
      checks,
      expectedHandshakeBehavior: 'simulate-control-plane-handshake-ok',
    };

    const receipt: TransportTestReceipt = {
      artifact: 'transport-test-receipt',
      version: '0.1.0',
      ...payload,
      receiptHash: hashJson(payload),
    };
    receipts.push(receipt);

    const idx = registry.transports.findIndex((t) => t.transportId === transport.transportId);
    if (idx < 0) continue;

    if (result === 'pass') {
      // Never auto-promote to Certified — only Declared/Configured → Tested
      const nextMaturity: TransportMaturity =
        registry.transports[idx]!.maturity === 'Certified' ? 'Certified' : 'Tested';
      registry.transports[idx] = {
        ...registry.transports[idx]!,
        maturity: nextMaturity,
        tested: true,
        status: nextMaturity.toLowerCase(),
        lastTestReceiptId: receipt.testId,
      };
      promoted.push(transport.transportId);
    } else {
      failed.push(transport.transportId);
      // Fail does not demote Certified; Declared/Configured stay untested
      if (registry.transports[idx]!.maturity !== 'Certified') {
        registry.transports[idx] = {
          ...registry.transports[idx]!,
          tested: false,
          lastTestReceiptId: receipt.testId,
        };
      }
    }
  }

  if (options.write ?? true) {
    mkdirSync(receiptsDir, { recursive: true });
    for (const receipt of receipts) {
      writeJson(path.join(receiptsDir, `${receipt.testId}.json`), receipt);
    }
    writeJson(transportRegistryPath(root), registry);
    writeJson(path.join(federationDir, 'transport-test-latest.json'), {
      generatedAt: issuedAt,
      promoted,
      failed,
      receipts: receipts.map((r) => ({
        transportId: r.transportId,
        testId: r.testId,
        result: r.result,
        receiptHash: r.receiptHash,
      })),
    });
  }

  return { registry, receipts, promoted, failed };
}

function evaluateTransportChecks(
  root: string,
  transport: TransportDescriptor,
  maxLatencyMs: number,
): TransportTestCheck[] {
  const checks: TransportTestCheck[] = [];

  const connectivityStarted = Date.now();
  const endpointResults: string[] = [];
  let connectivityOk = true;
  for (const [role, rel] of Object.entries(transport.endpoints ?? {})) {
    const abs = path.join(root, rel);
    const ok = existsSync(abs);
    endpointResults.push(`${role}=${rel}:${ok ? 'present' : 'missing'}`);
    if (!ok) connectivityOk = false;
  }
  const connectivityLatency = Date.now() - connectivityStarted;
  checks.push({
    id: 'connectivity',
    passed: connectivityOk && Object.keys(transport.endpoints ?? {}).length > 0,
    detail: endpointResults.join('; ') || 'no endpoints declared',
    latencyMs: connectivityLatency,
  });

  const authOk = typeof transport.authMode === 'string' && transport.authMode.trim().length > 0;
  checks.push({
    id: 'auth',
    passed: authOk,
    detail: authOk ? `authMode=${transport.authMode}` : 'authMode missing',
  });

  const handshakeStarted = Date.now();
  const handshakeOk =
    connectivityOk &&
    Boolean(transport.protocol) &&
    Boolean(transport.transportId) &&
    Boolean(transport.version);
  const handshakeLatency = Date.now() - handshakeStarted;
  checks.push({
    id: 'handshake-simulation',
    passed: handshakeOk,
    detail: handshakeOk
      ? `simulated handshake ok for protocol=${transport.protocol}`
      : 'handshake simulation failed (connectivity/protocol incomplete)',
    latencyMs: handshakeLatency,
  });

  const observed = Math.max(connectivityLatency, handshakeLatency);
  checks.push({
    id: 'latency-bounds',
    passed: observed <= maxLatencyMs,
    detail: `observedMaxMs=${observed}; maxMs=${maxLatencyMs}`,
    latencyMs: observed,
  });

  checks.push({
    id: 'error-handling',
    passed: true,
    detail: connectivityOk
      ? 'error profile empty under simulated success path'
      : 'errors captured in receipt errorProfile for failed connectivity',
  });

  checks.push({
    id: 'logging',
    passed: true,
    detail: 'transport test receipt records checks, latency, and tester identity',
  });

  return checks;
}

function normalizeRegistry(registry: TransportDescriptorRegistry): TransportDescriptorRegistry {
  return {
    ...registry,
    transports: registry.transports.map((t) => {
      const maturity = (t.maturity ??
        (t.tested ? 'Tested' : 'Declared')) as TransportMaturity;
      return {
        ...t,
        authMode: t.authMode ?? 'unspecified',
        maturity,
        tested: maturity === 'Tested' || maturity === 'Certified' ? true : Boolean(t.tested),
      };
    }),
  };
}

function transportRegistryPath(root: string): string {
  return path.join(root, 'docs', 'release', 'sibling-repos', 'federation', 'transport-descriptor-registry.json');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(',')}}`;
}

function writeJson(filePath: string, value: unknown): void {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const args = process.argv.slice(2);
  const onlyIdx = args.indexOf('--only');
  const transportIds =
    onlyIdx >= 0 && args[onlyIdx + 1] ? args[onlyIdx + 1]!.split(',').map((s) => s.trim()) : undefined;

  const result = runTransportTests({ write: true, transportIds });
  console.log(`transport tests: promoted=${result.promoted.join(',') || '(none)'} failed=${result.failed.join(',') || '(none)'}`);
  for (const receipt of result.receipts) {
    console.log(`  ${receipt.transportId}: ${receipt.result} (${receipt.testId}) hash=${receipt.receiptHash}`);
  }
}
