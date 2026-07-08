export interface RuntimeSnapshot {
  status: 'healthy' | 'degraded' | 'frozen';
  note: string;
}

export class RuntimeAdapter {
  constructor(private readonly isFrozen: () => boolean) {}

  snapshot(): RuntimeSnapshot {
    return {
      status: this.isFrozen() ? 'frozen' : 'healthy',
      note: this.isFrozen() ? 'constitutional freeze active' : 'runtime accepting governed work',
    };
  }
}
