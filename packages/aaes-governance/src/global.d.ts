import type { FaultJournal } from './faultJournal.js';
import type { PatternLedger } from './patternLedger.js';

declare global {
  var faultJournal: FaultJournal | undefined;
  var patternLedger: PatternLedger | undefined;
}

export {};
