import {
  type ProofSurface,
  ProofSurfaceRegistry,
} from './proofSurface.js';

function createSurface(overrides: ProofSurface): ProofSurface {
  return structuredClone(overrides);
}

export interface ProofSurfaceSummary {
  identity: ProofSurface['identity'];
  proofLevel: string;
  verificationStatus: string;
  replayStatus: string;
  operationalStatus: string;
  truthBoundary: string;
  currentMaturity: string;
  commercialReadiness: ProofSurface['commercialReadiness'];
  nextRequiredEvidence: string[];
}

function governanceSurface(): ProofSurface {
  return createSurface({
    identity: {
      id: '@aaes-os/aaes-governance',
      name: 'AAES Governance Package',
      type: 'repository',
      version: '0.2.0',
    },
    purpose: 'Provide the constitutional proof-surface runtime, registry, and validation law.',
    claims: [
      {
        id: 'gov-impl',
        type: 'Implementation',
        statement: 'The package implements proof-surface types, validation, and registry helpers.',
        evidenceIds: ['gov-impl-evidence'],
        proofLevel: 'P1',
      },
      {
        id: 'gov-verify',
        type: 'Verification',
        statement: 'The package ships tests that validate supported and unsupported proof surfaces.',
        evidenceIds: ['gov-test-evidence'],
        proofLevel: 'P2',
      },
    ],
    evidence: [
      {
        id: 'gov-impl-evidence',
        statement: 'Source files define ProofSurface, ProofSurfaceRegistry, and JSON helpers.',
        proofLevel: 'P1',
        verificationStatus: 'Implemented',
        replayable: true,
        verifiedBy: 'src/proofSurface.ts',
      },
      {
        id: 'gov-test-evidence',
        statement: 'Vitest coverage exercises validation, proof levels, and registry publication.',
        proofLevel: 'P2',
        verificationStatus: 'Test Verified',
        replayable: true,
        verifiedBy: 'src/proofSurface.test.ts',
      },
    ],
    verificationStatus: 'Test Verified',
    proofLevel: 'P2',
    replayStatus: 'Replayable',
    operationalStatus: 'Verified Prototype',
    truthBoundary: 'The package proves proof-surface governance and validation, not application deployments.',
    constitutionalProfile: {
      purpose: 'Govern proof-surface claims across the stack.',
      authority: 'AAES governance law and registry validation.',
      evidenceModel: 'Typed claims, typed evidence, schema documents, and test outputs.',
      verificationProcess: 'Build, test, and schema serialization checks.',
      complianceRequirements: ['No claim may exceed its proof surface', 'Every claim references evidence'],
      truthBoundary: 'The package does not certify external production systems.',
      constitutionalScope: 'Governance primitives, registry, and proof-surface schema.',
      constitutionalLimits: 'Does not replace consumer-specific adapters or deployment pipelines.',
      dependencies: ['runledger'],
      stewardship: 'AAES governance maintainers.',
      replayPath: 'Replay from registry documents and validation output.',
      failurePath: 'Reject unverified or unsupported claims and require stronger evidence.',
      currentMaturity: 'Verified Prototype',
    },
    blindspots: ['Independent verification is still limited to the local workspace.'],
    battleScars: ['Readiness language used to outpace machine-readable evidence.'],
    adversarialClaims: ['A scorecard can be mistaken for a verified artifact.'],
    colorTeamReadiness: {
      redTeam: 'Attack surface is low but claim/data mismatch remains a risk.',
      blueTeam: 'Validation rejects unsupported claims.',
      purpleTeam: 'Claims and evidence can be reconciled mechanically.',
      greenTeam: 'Build/test and schema generation are repeatable.',
      yellowTeam: 'Truth boundaries are explicit for consumers.',
      whiteTeam: 'Authority chain lives in governance code.',
    },
    commercialReadiness: {
      targetTier: 'Builder',
      intendedCustomer: 'Governance teams and tool builders',
      primaryUseCase: 'Machine-readable proof-surface publication',
      valueProposition: 'A standard claim/evidence contract for dashboards and product tiers.',
      currentReadiness: 'Prototype',
    },
    nextRequiredEvidence: ['Independent consumer integration', 'Cross-repo publish/subscribe demos'],
  });
}

function runtimeSurface(): ProofSurface {
  return createSurface({
    identity: {
      id: '@aaes-os/ucr-runtime',
      name: 'UCR Runtime',
      type: 'runtime',
      version: '0.2.0',
    },
    purpose: 'Execute governed runtime runs with trace, invariant, and patch wiring.',
    claims: [
      {
        id: 'ucr-impl',
        type: 'Implementation',
        statement: 'The runtime delegates compatibility callers into the governed UCRRuntime execution path and writes terminal evidence receipts.',
        evidenceIds: ['ucr-impl-evidence'],
        proofLevel: 'P1',
      },
      {
        id: 'ucr-verify',
        type: 'Verification',
        statement: 'Package tests prove trace-fault emission, span closure, and deployed patch behavior.',
        evidenceIds: ['ucr-test-evidence'],
        proofLevel: 'P2',
      },
    ],
    evidence: [
      {
        id: 'ucr-impl-evidence',
        statement: 'src/ucrRuntime.ts, src/RuntimeCore.ts, and src/withSpanGuard.ts wire the governed runtime path, trace receipts, and terminal evidence storage.',
        proofLevel: 'P1',
        verificationStatus: 'Implemented',
        replayable: true,
        verifiedBy: 'packages/ucr-runtime/src/ucrRuntime.ts',
      },
      {
        id: 'ucr-test-evidence',
        statement: 'Vitest coverage exercises the governed runtime, fault traces, and patch regression behavior.',
        proofLevel: 'P2',
        verificationStatus: 'Test Verified',
        replayable: true,
        verifiedBy: 'packages/ucr-runtime/src/ucrRuntime.test.ts',
      },
    ],
    verificationStatus: 'Test Verified',
    proofLevel: 'P2',
    replayStatus: 'Replayable',
    operationalStatus: 'Verified Prototype',
    truthBoundary: 'The runtime proves governed execution and trace consistency, not full production orchestration.',
    constitutionalProfile: {
      purpose: 'Governed UCR runtime execution.',
      authority: 'AAES governance invariants, runledger, trace-bus, and tri-core patch ledger.',
      evidenceModel: 'Run records, trace events, invariant faults, and patch ledger states.',
      verificationProcess: 'Package tests and runtime integration checks.',
      complianceRequirements: [
        'Every run must emit trace evidence for invariants and faults',
        'Span boundaries must close deterministically',
      ],
      truthBoundary: 'The runtime does not certify external systems.',
      constitutionalScope: 'UCR runtime execution, trace emission, and patch application.',
      constitutionalLimits: 'Does not replace the governance ledger or downstream services.',
      dependencies: ['aaes-governance', 'runledger', 'trace-bus', 'tri-core-protocol'],
      stewardship: 'UCR runtime maintainers.',
      replayPath: 'Replay from run ledger and trace bus logs.',
      failurePath: 'Fail closed on invariant breaches and orphan spans.',
      currentMaturity: 'Verified Prototype',
    },
    blindspots: ['The runtime still relies on in-memory run, trace, and receipt stores in this workspace.'],
    battleScars: ['Trace-fault emission had to be wired into the invariant engine.'],
    adversarialClaims: ['A compatibility wrapper can masquerade as a governed path if receipt evidence is ignored.'],
    colorTeamReadiness: {
      redTeam: 'Attack surface remains wherever outputs or spans diverge from evidence.',
      blueTeam: 'Trace and ledger events can be inspected deterministically.',
      purpleTeam: 'Execution and governance claims can be reconciled mechanically.',
      greenTeam: 'Build, test, and patch regression checks are repeatable.',
      yellowTeam: 'Truth boundaries are explicit for consumers.',
      whiteTeam: 'Authority remains in the governance package.',
    },
    commercialReadiness: {
      targetTier: 'Builder',
      intendedCustomer: 'Runtime and governance teams',
      primaryUseCase: 'Governed runtime execution',
      valueProposition: 'A traceable execution path with patch-controlled output behavior.',
      currentReadiness: 'Prototype',
    },
    nextRequiredEvidence: ['End-to-end integration in a long-running service', 'Independent replay of fault traces'],
  });
}

function opsConsoleSurface(): ProofSurface {
  return createSurface({
    identity: {
      id: '@aaes-os/ops-console',
      name: 'AAES Ops Console',
      type: 'runtime',
      version: '0.2.0',
    },
    purpose: 'Expose governance, telemetry, and proof-surface records to operators.',
    claims: [
      {
        id: 'ops-impl',
        type: 'Implementation',
        statement: 'The console exposes telemetry routes and a proof-surface endpoint.',
        evidenceIds: ['ops-impl-evidence'],
        proofLevel: 'P1',
      },
      {
        id: 'ops-verify',
        type: 'Verification',
        statement: 'The console has route coverage and API tests for operator surfaces.',
        evidenceIds: ['ops-test-evidence'],
        proofLevel: 'P2',
      },
    ],
    evidence: [
      {
        id: 'ops-impl-evidence',
        statement: 'Server routes expose telemetry and proof-surface catalog JSON.',
        proofLevel: 'P1',
        verificationStatus: 'Implemented',
        replayable: true,
        verifiedBy: 'services/ops-console/src/server.ts',
      },
      {
        id: 'ops-test-evidence',
        statement: 'Vitest routes prove the operator console behavior.',
        proofLevel: 'P2',
        verificationStatus: 'Test Verified',
        replayable: true,
        verifiedBy: 'services/ops-console/src/server.test.ts',
      },
    ],
    verificationStatus: 'Test Verified',
    proofLevel: 'P2',
    replayStatus: 'Replayable',
    operationalStatus: 'Verified Prototype',
    truthBoundary: 'The console proves operator visibility and proof-surface exposure, not governance authority itself.',
    constitutionalProfile: {
      purpose: 'Operator telemetry and proof-surface visualization.',
      authority: 'AAES governance and runtime telemetry adapters.',
      evidenceModel: 'HTTP JSON routes, test output, and registry snapshots.',
      verificationProcess: 'Build, test, route smoke, and JSON serialization checks.',
      complianceRequirements: ['No claim beyond route evidence', 'Every surface references a proof source'],
      truthBoundary: 'The console is an operator view, not the source of truth.',
      constitutionalScope: 'Telemetry, proof surfaces, and operator dashboards.',
      constitutionalLimits: 'Does not replace governance or runtime execution.',
      dependencies: ['aaes-governance'],
      stewardship: 'Ops console maintainers.',
      replayPath: 'Replay from route output and serialized proof-surface catalog.',
      failurePath: 'Degrade to read-only operator view when proof-surface data is unavailable.',
      currentMaturity: 'Verified Prototype',
    },
    blindspots: ['Some upstream telemetry remains seeded or synthesized.'],
    battleScars: ['Operator surfaces previously outpaced evidence wiring.'],
    adversarialClaims: ['A dashboard can be mistaken for the governing authority.'],
    colorTeamReadiness: {
      redTeam: 'Routes can be probed, so the proof surface should stay read-only.',
      blueTeam: 'Validation and JSON output are inspectable.',
      purpleTeam: 'Telemetry plus proof surfaces can be reconciled.',
      greenTeam: 'Build/test and server routes are repeatable.',
      yellowTeam: 'Operator truth boundaries are visible.',
      whiteTeam: 'Authority and evidence are separated from presentation.',
    },
    commercialReadiness: {
      targetTier: 'Professional',
      intendedCustomer: 'Operators and governance teams',
      primaryUseCase: 'Operational proof-surface visibility',
      valueProposition: 'A single pane for evidence-backed governance claims.',
      currentReadiness: 'Prototype',
    },
    nextRequiredEvidence: ['Live registry-backed operator demo', 'Independent dashboard integration'],
  });
}

function novaStudioSurface(): ProofSurface {
  return createSurface({
    identity: {
      id: '@aaes-os/nova-studio',
      name: 'Nova Studio',
      type: 'runtime',
      version: '0.1.0',
    },
    purpose: 'Render proof-surface records for operators and contributors in a studio UI.',
    claims: [
      {
        id: 'studio-impl',
        type: 'Implementation',
        statement: 'The studio can render proof-surface registry records from a direct import.',
        evidenceIds: ['studio-impl-evidence'],
        proofLevel: 'P1',
      },
    ],
    evidence: [
      {
        id: 'studio-impl-evidence',
        statement: 'The studio source tree contains components for proof-surface visualization.',
        proofLevel: 'P1',
        verificationStatus: 'Implemented',
        replayable: true,
        verifiedBy: 'nova-studio/src/components/StudioApp.tsx',
      },
    ],
    verificationStatus: 'Implemented',
    proofLevel: 'P1',
    replayStatus: 'Replayable',
    operationalStatus: 'Prototype',
    truthBoundary: 'The studio proves the visualization concept, not a full packaged desktop runtime.',
    constitutionalProfile: {
      purpose: 'Studio UI for proof-surface visualization.',
      authority: 'AAES governance package and studio adapters.',
      evidenceModel: 'Direct registry import and rendered summary data.',
      verificationProcess: 'Static render and local UI smoke.',
      complianceRequirements: ['No visual claim beyond imported registry data'],
      truthBoundary: 'The studio is a consumer view, not a verifier of external systems.',
      constitutionalScope: 'Proof-surface rendering in the studio UI.',
      constitutionalLimits: 'Does not replace the authoritative registry or backend verification.',
      dependencies: ['aaes-governance'],
      stewardship: 'Nova Studio maintainers.',
      replayPath: 'Replay via the imported registry snapshot.',
      failurePath: 'Fallback to empty or seeded visualization when the registry is unavailable.',
      currentMaturity: 'Prototype',
    },
    blindspots: ['The desktop bundle is still scaffolded.'],
    battleScars: ['Studio surfaces can become pretty before they are verified.'],
    adversarialClaims: ['A studio screenshot can be mistaken for authoritative evidence.'],
    colorTeamReadiness: {
      redTeam: 'UI surfaces are visible and should be scrutinized.',
      blueTeam: 'Imported records can be inspected deterministically.',
      purpleTeam: 'UI and registry claims can be reconciled.',
      greenTeam: 'Components can render seeded or direct registry data.',
      yellowTeam: 'Truth boundaries can be shown in the interface.',
      whiteTeam: 'Authority remains in the governance package.',
    },
    commercialReadiness: {
      targetTier: 'Builder',
      intendedCustomer: 'Operators, reviewers, and contributors',
      primaryUseCase: 'Proof-surface visualization and review',
      valueProposition: 'A clear UI for claim/evidence maturity.',
      currentReadiness: 'Prototype',
    },
    nextRequiredEvidence: ['Real bundle build', 'Backend integration with operator and proof surfaces'],
  });
}

export function createDemoProofSurfaceRegistry(): ProofSurfaceRegistry {
  const registry = new ProofSurfaceRegistry();
  const surfaces = [governanceSurface(), runtimeSurface(), opsConsoleSurface(), novaStudioSurface()];
  for (const surface of surfaces) {
    registry.publish(surface);
  }
  return registry;
}

export function listProofSurfaceSummaries(
  registry: ProofSurfaceRegistry = createDemoProofSurfaceRegistry(),
): ProofSurfaceSummary[] {
  return registry.list().map((surface) => ({
    identity: surface.identity,
    proofLevel: surface.proofLevel,
    verificationStatus: surface.verificationStatus,
    replayStatus: surface.replayStatus,
    operationalStatus: surface.operationalStatus,
    truthBoundary: surface.truthBoundary,
    currentMaturity: surface.constitutionalProfile.currentMaturity,
    commercialReadiness: surface.commercialReadiness,
    nextRequiredEvidence: surface.nextRequiredEvidence,
  }));
}
