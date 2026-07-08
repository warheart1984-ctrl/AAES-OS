import { type PatchRecord } from '@aaes-os/tri-core-protocol';

export interface LedgerSnapshot {
  patches: PatchRecord[];
  approved: number;
  deployed: number;
}

export class LedgerAdapter {
  constructor(private readonly listPatches: () => PatchRecord[]) {}

  snapshot(): LedgerSnapshot {
    const patches = this.listPatches();
    return {
      patches,
      approved: patches.filter((patch) => patch.status === 'APPROVED').length,
      deployed: patches.filter((patch) => patch.status === 'DEPLOYED').length,
    };
  }
}
