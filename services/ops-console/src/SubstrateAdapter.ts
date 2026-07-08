export interface SubstrateSnapshot {
  frozen: boolean;
  authority: string;
}

export class SubstrateAdapter {
  constructor(
    private readonly frozen: () => boolean,
    private readonly authority = 'AAES governance',
  ) {}

  snapshot(): SubstrateSnapshot {
    return {
      frozen: this.frozen(),
      authority: this.authority,
    };
  }
}
