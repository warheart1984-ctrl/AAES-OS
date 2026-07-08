import type { Invariant } from '../invariants/index.js';

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export const substrateInvariants: Invariant[] = [
  {
    id: 'I-SUB-001',
    description: 'Substrate signals must not violate constitutional freeze',
    check(context) {
      if (context.actor !== 'substrate') {
        return {
          passed: true,
          severity: 'info',
          invariantId: 'I-SUB-001',
          message: 'Not a substrate event',
        };
      }

      const payload = readRecord(context.payload);
      const correctionRequested =
        context.action === 'SUBSTRATE_CORRECTION' || payload.type === 'SUBSTRATE_CORRECTION';

      return {
        passed: context.freezeActive ? correctionRequested : true,
        severity: 'info',
        invariantId: 'I-SUB-001',
        message: context.freezeActive
          ? 'Substrate correction required while frozen'
          : 'Substrate signal respects constitutional freeze',
      };
    },
  },
  {
    id: 'I-SUB-002',
    description: 'Substrate must not mutate runtime state without ledger entry',
    check(context) {
      if (context.actor !== 'substrate') {
        return {
          passed: true,
          severity: 'info',
          invariantId: 'I-SUB-002',
          message: 'Not a substrate mutation',
        };
      }

      if (context.ledgerEntry) {
        return {
          passed: true,
          severity: 'info',
          invariantId: 'I-SUB-002',
          message: 'Ledger entry present',
        };
      }

      const payload = readRecord(context.payload);
      const ledgerLogged = payload.loggedInFaultJournal === true;
      return {
        passed: ledgerLogged,
        severity: ledgerLogged ? 'info' : 'error',
        invariantId: 'I-SUB-002',
        message: ledgerLogged ? 'Correction recorded' : 'Substrate mutation requires ledger entry',
      };
    },
  },
  {
    id: 'I-SUB-003',
    description: 'Substrate corrections must be logged in FaultJournalStore',
    check(context) {
      if (context.actor !== 'substrate') {
        return {
          passed: true,
          severity: 'info',
          invariantId: 'I-SUB-003',
          message: 'Not a substrate correction',
        };
      }

      const payload = readRecord(context.payload);
      const correctionRequested =
        context.action === 'SUBSTRATE_CORRECTION' || payload.type === 'SUBSTRATE_CORRECTION';

      if (!correctionRequested) {
        return {
          passed: true,
          severity: 'info',
          invariantId: 'I-SUB-003',
          message: 'No correction requested',
        };
      }

      const logged = payload.loggedInFaultJournal === true;
      return {
        passed: logged,
        severity: logged ? 'info' : 'error',
        invariantId: 'I-SUB-003',
        message: logged ? 'Fault journal logged the correction' : 'Substrate correction was not logged',
      };
    },
  },
];

export function registerSubstrateInvariants(register: (invariant: Invariant) => void): void {
  for (const invariant of substrateInvariants) {
    register(invariant);
  }
}
