export { TraceBusClient } from './bus.js';
export { consoleSink, type ConsoleSinkOptions } from './console-sink.js';
export { TraceBus } from './traceBus.js';
export {
  TRACE_FAULT,
  TRACE_RECEIPT,
  type TraceEvent,
  type TraceEventType,
  type TraceFaultEvent,
  type TraceInvariantEvent,
  type TraceReceiptEvent,
  type TraceListener,
  type TraceSpanEvent,
  type TraceUnsubscribe,
} from './traceEvents.js';
export {
  type TraceEvent as LegacyTraceEvent,
  type TraceEventType as LegacyTraceEventType,
  type TraceSubscriber,
} from './types.js';
