import { UCRRuntime, type UCRRuntimeOptions } from './ucrRuntime.js';
import type { UCRRunInput, UCRRunResult, UCRRuntime as UCRRuntimeInterface } from './types.js';

export type StubUCRRuntimeOptions = UCRRuntimeOptions;

/** Compatibility adapter that delegates to the governed runtime path. */
export class StubUCRRuntime implements UCRRuntimeInterface {
  private readonly runtime: UCRRuntime;

  constructor(options: StubUCRRuntimeOptions = {}) {
    this.runtime = new UCRRuntime(options);
  }

  async run(input: UCRRunInput): Promise<UCRRunResult> {
    const traceBus = this.runtime.getTraceBus();
    const before = traceBus.getLog().length;
    const result = await this.runtime.run({
      kind: input.label,
      metadata: input.metadata,
      payload: input.payload,
    });
    const after = traceBus.getLog().length;

    return {
      runId: result.runId,
      status: result.status,
      traceEventCount: after - before,
    };
  }
}
