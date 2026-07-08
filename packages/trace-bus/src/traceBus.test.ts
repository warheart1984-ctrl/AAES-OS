import { describe, expect, it } from 'vitest';

import { asInvariantId, asRunId, asSpanId } from '@aaes-os/runledger';

import { TraceBus } from './traceBus.js';
import { TRACE_RECEIPT, type TraceFaultEvent, type TraceReceiptEvent } from './traceEvents.js';

describe('TraceBus', () => {
  it('delivers TRACE_FAULT to subscribers', () => {
    const bus = new TraceBus();
    const seen: TraceFaultEvent[] = [];

    bus.subscribe((event) => {
      if (event.type === 'TRACE_FAULT') {
        seen.push(event);
      }
    });

    const runId = asRunId('run-fault');
    const spanId = asSpanId('span-fault');

    bus.emit({
      type: 'TRACE_FAULT',
      timestamp: new Date().toISOString(),
      runId,
      spanId,
      fault: {
        faultId: 'fault-1',
        runId,
        spanId,
        invariantId: asInvariantId('INV_OUTPUT_SHAPE'),
        timestamp: new Date().toISOString(),
        faultCode: 'INV_FAIL_INV_OUTPUT_SHAPE',
        severity: 'ERROR',
        contextSnapshot: {},
        recurrenceCount: 1,
      },
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]?.fault.faultCode).toBe('INV_FAIL_INV_OUTPUT_SHAPE');
  });

  it('filters replay events by run id', () => {
    const bus = new TraceBus();
    const firstRun = asRunId('run-a');
    const secondRun = asRunId('run-b');

    bus.runStart(firstRun);
    bus.emit({
      type: TRACE_RECEIPT,
      runId: firstRun,
      timestamp: new Date().toISOString(),
      receipt: {
        receiptId: 'evidence:run-a',
        kind: 'runtime',
        claimLabel: 'runtime-run-completed',
        subsystem: 'ucr-runtime',
        evidenceRefs: ['run:run-a'],
        subjectHash: 'sha3-256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        issuedAt: new Date().toISOString(),
      },
    });
    bus.runStart(secondRun);

    const firstLog = bus.getLogForRun(firstRun);

    expect(firstLog).toHaveLength(2);
    expect(firstLog.map((event) => event.type)).toEqual(['TRACE_RUN_START', 'TRACE_RECEIPT']);
    expect(bus.getLogForRun(secondRun)).toHaveLength(1);
  });

  it('delivers TRACE_RECEIPT to subscribers', () => {
    const bus = new TraceBus();
    const seen: TraceReceiptEvent[] = [];

    bus.subscribe((event) => {
      if (event.type === TRACE_RECEIPT) {
        seen.push(event as TraceReceiptEvent);
      }
    });

    const runId = asRunId('run-receipt');

    bus.emit({
      type: TRACE_RECEIPT,
      runId,
      timestamp: new Date().toISOString(),
      receipt: {
        receiptId: 'evidence:runtime:receipt',
        kind: 'runtime',
        claimLabel: 'runtime-run-completed',
        subsystem: 'ucr-runtime',
        evidenceRefs: ['run:runtime'],
        subjectHash: 'sha3-256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        issuedAt: new Date().toISOString(),
      },
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]?.receipt).toMatchObject({
      receiptId: 'evidence:runtime:receipt',
      kind: 'runtime',
    });
  });
});
