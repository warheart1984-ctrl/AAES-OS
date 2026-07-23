import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildRuntimeFederationEvidence,
  buildSignedHandshakeReceipt,
  evaluateFederationDecision,
  isRuntimeFederationEvidenceIndex,
  issueHandshakeReceipt,
  loadTransportRegistry,
  promotionConditionsMet,
  validateHandshakeReceipt,
  type HandshakeRequest,
  type SessionLineageLog,
  type TransportDescriptorRegistry,
} from '../../tools/runtime-federation.ts';
import { buildSiblingAdapterContractEvidence } from '../../tools/sibling-adapter-contracts.ts';
import { runTransportTests } from '../../tools/transport-test.ts';

function withTestedOpsConsole(registry: TransportDescriptorRegistry): TransportDescriptorRegistry {
  return {
    ...registry,
    transports: registry.transports.map((t) =>
      t.transportId === 'opsConsole-SovereignX-v1'
        ? { ...t, tested: true, maturity: 'Tested' as const, authMode: t.authMode ?? 'workspace-local-control-plane' }
        : t,
    ),
  };
}

describe('CCR-AAES-OS-RuntimeFederation', () => {
  it(
    'builds fail-closed evidence with no live grants until receipts + Active lineage',
    () => {
      const index = buildRuntimeFederationEvidence({ write: false });

      expect(isRuntimeFederationEvidenceIndex(index)).toBe(true);
      expect(index.failClosed).toBe(true);
      expect(index.implementationStatus).toBe('machinery-ready-live-grants-denied');
      expect(index.promotionConditionsMet).toBe(false);
      expect(index.summary.liveSessionsGranted).toBe(0);
      expect(index.summary.receiptsValid).toBe(0);
      expect(index.decisions.every((d) => d.allowLiveSession === false)).toBe(true);
      expect(index.summary.decisions.FederationGranted).toBe(0);
    },
    30_000,
  );

  it(
    'marks verified adapters + Tested transport without receipts as HandshakePending',
    () => {
      const adapters = buildSiblingAdapterContractEvidence({ write: false });
      const transports = withTestedOpsConsole(loadTransportRegistry());

      const request: HandshakeRequest = {
        remoteId: 'project-infi',
        adapterId: 'adapter-project-infi-canonical',
        transportId: 'opsConsole-SovereignX-v1',
        requestedCapabilities: ['readEvidence'],
        sessionPurpose: 'test',
      };

      const decision = evaluateFederationDecision(request, {
        adapters,
        transports,
        receipts: [],
      });

      expect(decision.state).toBe('HandshakePending');
      expect(decision.allowLiveSession).toBe(false);
    },
    30_000,
  );

  it(
    'denies production sessions when transport is only Tested (not Certified)',
    () => {
      const adapters = buildSiblingAdapterContractEvidence({ write: false });
      const transports = withTestedOpsConsole(loadTransportRegistry());

      const decision = evaluateFederationDecision(
        {
          remoteId: 'project-infi',
          adapterId: 'adapter-project-infi-canonical',
          transportId: 'opsConsole-SovereignX-v1',
          requestedCapabilities: ['readEvidence'],
          sessionPurpose: 'production',
          production: true,
        },
        { adapters, transports, receipts: [] },
      );

      expect(decision.state).toBe('NotEligible');
      expect(decision.reasons.join(' ')).toMatch(/Certified/i);
    },
    30_000,
  );

  it(
    'validates handshake receipt constraints and grants only when transport eligible',
    () => {
      const adapters = buildSiblingAdapterContractEvidence({ write: false });
      const transports = withTestedOpsConsole(loadTransportRegistry());
      const now = new Date('2026-07-22T12:00:00.000Z');

      const payload = {
        receiptId: 'hr-test-project-infi-001',
        sessionId: 'sess-test-001',
        remoteId: 'project-infi',
        adapterId: 'adapter-project-infi-canonical',
        transportId: 'opsConsole-SovereignX-v1',
        constitutionalMaturity: 'Verified Prototype',
        capabilitiesGranted: ['readEvidence'],
        issuedAt: '2026-07-21T00:00:00.000Z',
        expiresAt: '2026-08-21T00:00:00.000Z',
        issuer: 'test-suite',
        revocationPath: 'CCR-AAES-OS-RuntimeFederation#revoke:hr-test-project-infi-001',
      };

      const good = buildSignedHandshakeReceipt(payload);
      expect(validateHandshakeReceipt(good, { adapters, transports, now })).toEqual([]);

      const granted = evaluateFederationDecision(
        {
          remoteId: 'project-infi',
          adapterId: 'adapter-project-infi-canonical',
          transportId: 'opsConsole-SovereignX-v1',
          requestedCapabilities: ['readEvidence'],
          sessionPurpose: 'test',
          sessionId: 'sess-test-001',
        },
        { adapters, transports, receipts: [good], now },
      );
      expect(granted.state).toBe('FederationGranted');
      expect(granted.allowLiveSession).toBe(true);
    },
    30_000,
  );

  it(
    'denies issueHandshakeReceipt when transport is not Tested',
    () => {
      const result = issueHandshakeReceipt({
        remoteId: 'project-infi',
        adapterId: 'adapter-project-infi-canonical',
        transportId: 'platformWeb-PlatformApi-v1',
        capabilities: ['readEvidence'],
        write: false,
        handshakeSucceeded: true,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.state).toBe('NotEligible');
        expect(result.reasons.join(' ')).toMatch(/not Tested|not declared|Certified/i);
      }
    },
    30_000,
  );

  it(
    'keeps promotionConditionsMet false without indexed receipts and Active lineage',
    () => {
      const index = buildRuntimeFederationEvidence({ write: false });
      expect(index.promotionConditionsMet).toBe(false);
      expect(index.promotionChecklist.verdict).toBe('Fail');
      expect(index.promotionChecklist.met).toBe(false);

      const byId = Object.fromEntries(index.promotionChecklist.items.map((i) => [i.id, i]));
      expect(byId['indexed-handshake-receipts']?.met).toBe(false);
      expect(byId['active-lineage']?.met).toBe(false);
      expect(byId['revocation-paths']?.met).toBe(false);
      expect(byId['transport-maturity']?.met).toBe(true);
    },
    30_000,
  );

  it('sets promotionConditionsMet true only when all four evidence layers Pass', () => {
    const transports = withTestedOpsConsole(loadTransportRegistry());
    const now = new Date('2026-07-22T12:00:00.000Z');
    const payload = {
      receiptId: 'hr-promo-001',
      sessionId: 'sess-promo-001',
      remoteId: 'project-infi',
      adapterId: 'adapter-project-infi-canonical',
      transportId: 'opsConsole-SovereignX-v1',
      constitutionalMaturity: 'Verified Prototype',
      capabilitiesGranted: ['readEvidence'],
      issuedAt: '2026-07-21T00:00:00.000Z',
      expiresAt: '2026-08-21T00:00:00.000Z',
      issuer: 'test-suite',
      revocationPath: 'CCR-AAES-OS-RuntimeFederation#revoke:hr-promo-001',
    };
    const receipt = buildSignedHandshakeReceipt(payload);

    const emptyLineage: SessionLineageLog = {
      artifact: 'session-lineage-log',
      version: '0.1.0',
      ccrId: 'CCR-AAES-OS-RuntimeFederation',
      generatedAt: now.toISOString(),
      entries: [],
      aggregateHash: 'sha256:empty',
      truthBoundary: 'test',
    };

    const registry = {
      registryId: 'test',
      version: '0.1.0',
      status: 'Published',
      ccrId: 'CCR-AAES-OS-RuntimeFederation' as const,
      contractId: 'CRC-AAES-OS-HandshakeReceipt' as const,
      receipts: [
        {
          receiptId: receipt.receiptId,
          sessionId: receipt.sessionId,
          remoteId: receipt.remoteId,
          adapterId: receipt.adapterId,
          transportId: receipt.transportId,
          path: 'test.json',
          receiptHash: receipt.receiptHash,
          revoked: false,
        },
      ],
      truthBoundary: 'test',
    };

    const pendingOnly = promotionConditionsMet({
      transports: transports.transports,
      receipts: [receipt],
      sessionLineage: {
        ...emptyLineage,
        entries: [
          {
            sessionId: 'sess-promo-001',
            remoteId: 'project-infi',
            adapterId: 'adapter-project-infi-canonical',
            transportId: 'opsConsole-SovereignX-v1',
            receiptId: null,
            startedAt: now.toISOString(),
            endedAt: null,
            expiresAt: null,
            status: 'Pending',
            revocationEvent: null,
            entryHash: 'sha256:pending',
          },
        ],
      },
      receiptRegistry: registry,
    });
    expect(pendingOnly.verdict).toBe('Fail');
    expect(pendingOnly.met).toBe(false);

    const activeNoRevocation = promotionConditionsMet({
      transports: transports.transports,
      receipts: [receipt],
      sessionLineage: {
        ...emptyLineage,
        entries: [
          {
            sessionId: 'sess-promo-001',
            remoteId: 'project-infi',
            adapterId: 'adapter-project-infi-canonical',
            transportId: 'opsConsole-SovereignX-v1',
            receiptId: 'hr-promo-001',
            startedAt: now.toISOString(),
            endedAt: null,
            expiresAt: payload.expiresAt,
            status: 'Active',
            revocationEvent: null,
            entryHash: 'sha256:active',
          },
        ],
      },
      receiptRegistry: registry,
    });
    expect(activeNoRevocation.verdict).toBe('Fail');
    expect(activeNoRevocation.items.find((i) => i.id === 'revocation-paths')?.met).toBe(false);

    const allLayers = promotionConditionsMet({
      transports: transports.transports,
      receipts: [receipt],
      sessionLineage: {
        ...emptyLineage,
        entries: [
          {
            sessionId: 'sess-promo-001',
            remoteId: 'project-infi',
            adapterId: 'adapter-project-infi-canonical',
            transportId: 'opsConsole-SovereignX-v1',
            receiptId: 'hr-promo-001',
            startedAt: now.toISOString(),
            endedAt: null,
            expiresAt: payload.expiresAt,
            status: 'Active',
            revocationEvent: {
              path: 'CCR-AAES-OS-RuntimeFederation#revoke:hr-promo-001',
              authority: 'CCR-AAES-OS-RuntimeFederation',
              condition: 'operator may revoke before expiresAt',
              executed: null,
            },
            entryHash: 'sha256:active',
          },
        ],
      },
      receiptRegistry: registry,
    });
    expect(allLayers.verdict).toBe('Pass');
    expect(allLayers.met).toBe(true);
    expect(allLayers.message).toBe('Pass("Promotion conditions satisfied")');
    expect(allLayers.items.every((i) => i.met)).toBe(true);
  });
});

describe('transport testing path', () => {
  it('promotes opsConsole-SovereignX-v1 Declared → Tested with a hashed receipt', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'aaes-transport-test-'));
    try {
      // Minimal workspace: copy endpoint packages + registry via run against real root with write:false
      const dry = runTransportTests({
        write: false,
        transportIds: ['opsConsole-SovereignX-v1'],
      });
      expect(dry.receipts).toHaveLength(1);
      expect(dry.receipts[0]?.result).toBe('pass');
      expect(dry.receipts[0]?.receiptHash).toMatch(/^sha256:/);
      expect(dry.promoted).toContain('opsConsole-SovereignX-v1');
      expect(
        dry.registry.transports.find((t) => t.transportId === 'opsConsole-SovereignX-v1')?.maturity,
      ).toBe('Tested');
      expect(
        dry.registry.transports.find((t) => t.transportId === 'opsConsole-SovereignX-v1')?.tested,
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
