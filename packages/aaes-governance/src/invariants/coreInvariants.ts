import type { GovernanceContext } from '../context/GovernanceContext.js';

import type { Invariant, InvariantResult } from './index.js';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function includesKeyword(value: unknown, keyword: string): boolean {
  return typeof value === 'string' && value.toLowerCase().includes(keyword.toLowerCase());
}

function failure(message: string, severity: InvariantResult['severity'], details?: unknown): InvariantResult {
  return {
    passed: false,
    severity,
    message,
    details,
  };
}

export const coreInvariants: Invariant[] = [
  {
    id: 'I-001',
    description: 'No agent may mutate global state without ledger entry',
    check(context: GovernanceContext): InvariantResult {
      const payload = asRecord(context.payload);
      const mutatesState =
        includesKeyword(context.action, 'mutate') ||
        includesKeyword(context.action, 'write') ||
        payload.mutatesState === true ||
        payload.mutation === true;

      if (!mutatesState) {
        return { passed: true, severity: 'info' };
      }

      const hasLedgerEntry =
        Boolean(context.ledgerEntry) ||
        Boolean(payload.ledgerEntry) ||
        Boolean(payload.ledgerId) ||
        Boolean(context.parentHash);

      return hasLedgerEntry
        ? { passed: true, severity: 'info' }
        : failure('State mutation attempted without ledger entry', 'error', {
            action: context.action,
          });
    },
  },
  {
    id: 'I-002',
    description: 'No agent may execute unverified ULX bytecode',
    check(context: GovernanceContext): InvariantResult {
      const payload = asRecord(context.payload);
      const executesUlx =
        includesKeyword(context.action, 'ulx') ||
        payload.bytecodeType === 'ulx' ||
        payload.type === 'ULX_EXEC' ||
        payload.execute === 'ulx';

      if (!executesUlx) {
        return { passed: true, severity: 'info' };
      }

      const verified = context.verified === true || payload.verified === true || payload.validated === true;
      return verified
        ? { passed: true, severity: 'info' }
        : failure('Attempted to execute unverified ULX bytecode', 'fatal', {
            action: context.action,
          });
    },
  },
  {
    id: 'I-003',
    description: 'No LLM output may bypass validator',
    check(context: GovernanceContext): InvariantResult {
      const payload = asRecord(context.payload);
      const isLlmOutput =
        includesKeyword(context.action, 'llm') ||
        payload.model === 'llm' ||
        payload.kind === 'llm' ||
        payload.outputType === 'llm';

      if (!isLlmOutput) {
        return { passed: true, severity: 'info' };
      }

      const validated = payload.validated === true || payload.validatorPassed === true || context.approved === true;
      return validated
        ? { passed: true, severity: 'info' }
        : failure('LLM output bypassed the validator', 'error', {
            action: context.action,
          });
    },
  },
  {
    id: 'I-004',
    description: 'No substrate signal may violate constitutional freeze',
    check(context: GovernanceContext): InvariantResult {
      if (context.actor !== 'substrate') {
        return { passed: true, severity: 'info' };
      }
      if (context.freezeActive !== true) {
        return { passed: true, severity: 'info' };
      }

      const payload = asRecord(context.payload);
      const isCorrection =
        context.action === 'SUBSTRATE_CORRECTION' ||
        payload.type === 'SUBSTRATE_CORRECTION' ||
        payload.correction === true;

      return isCorrection
        ? { passed: true, severity: 'info' }
        : failure('Substrate signal violated constitutional freeze', 'fatal', {
            action: context.action,
          });
    },
  },
  {
    id: 'I-005',
    description: 'No cross-agent message may exceed capability boundary',
    check(context: GovernanceContext): InvariantResult {
      const payload = asRecord(context.payload);
      const crossAgent =
        context.actor === 'agent' || payload.crossAgent === true || payload.messageScope === 'cross-agent';

      if (!crossAgent) {
        return { passed: true, severity: 'info' };
      }

      const capabilityBoundaryOk =
        payload.capabilityBoundaryOk === true ||
        payload.authorized === true ||
        payload.boundary === 'allowed';

      return capabilityBoundaryOk
        ? { passed: true, severity: 'info' }
        : failure('Cross-agent message exceeded capability boundary', 'warn', {
            action: context.action,
          });
    },
  },
  {
    id: 'I-006',
    description: 'No runtime may execute without governance approval',
    check(context: GovernanceContext): InvariantResult {
      if (context.actor !== 'runtime') {
        return { passed: true, severity: 'info' };
      }

      const payload = asRecord(context.payload);
      const approved = context.approved === true || payload.governanceApproved === true || payload.approved === true;
      return approved
        ? { passed: true, severity: 'info' }
        : failure('Runtime attempted execution without governance approval', 'error', {
            action: context.action,
          });
    },
  },
  {
    id: 'I-007',
    description: 'No ledger entry may be missing parent-hash',
    check(context: GovernanceContext): InvariantResult {
      const payload = asRecord(context.payload);
      const isLedgerOperation =
        includesKeyword(context.action, 'ledger') ||
        payload.entryType === 'ledger' ||
        payload.kind === 'ledger' ||
        Boolean(context.ledgerEntry);

      if (!isLedgerOperation) {
        return { passed: true, severity: 'info' };
      }

      const candidate = context.ledgerEntry ?? (payload.ledgerEntry as { parentHash?: unknown } | undefined);
      const parentHash = candidate?.parentHash ?? context.parentHash ?? payload.parentHash;
      return typeof parentHash === 'string' && parentHash.length > 0
        ? { passed: true, severity: 'info' }
        : failure('Ledger entry missing parent-hash', 'error', { action: context.action });
    },
  },
];

export function registerCoreInvariants(engine: { register(invariant: Invariant): void }): void {
  for (const invariant of coreInvariants) {
    engine.register(invariant);
  }
}
