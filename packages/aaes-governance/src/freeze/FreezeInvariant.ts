import type { Invariant } from '../invariants/index.js';

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export const freezeInvariant: Invariant = {
  id: 'I-FRZ-001',
  description: 'Any fatal invariant violation triggers constitutional freeze',
  check(context) {
    const metadata = readRecord(context.metadata);
    const payload = readRecord(context.payload);
    const fatalTriggered =
      metadata.severity === 'fatal' ||
      metadata.fatalInvariant === true ||
      payload.severity === 'fatal' ||
      payload.fatalInvariant === true;

    if (!fatalTriggered) {
      return {
        passed: true,
        severity: 'info',
        invariantId: 'I-FRZ-001',
        message: 'No fatal violation observed',
      };
    }

    return {
      passed: Boolean(context.freezeActive),
      severity: 'fatal',
      invariantId: 'I-FRZ-001',
      message: context.freezeActive
        ? 'Freeze is active after fatal violation'
        : 'Fatal violation requires constitutional freeze',
    };
  },
};

export const freezeInvariants: Invariant[] = [freezeInvariant];

export function registerFreezeInvariants(register: (invariant: Invariant) => void): void {
  for (const invariant of freezeInvariants) {
    register(invariant);
  }
}
