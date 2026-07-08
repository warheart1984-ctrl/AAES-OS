export interface ConstitutionalFreezeState {
  frozen: boolean;
  reason?: string;
}

/**
 * Constitutional freeze state machine.
 */
export class ConstitutionalFreeze {
  private state: ConstitutionalFreezeState = {
    frozen: false,
  };

  freeze(reason: string): ConstitutionalFreezeState {
    this.state = {
      frozen: true,
      reason,
    };
    return this.getState();
  }

  unfreeze(): ConstitutionalFreezeState {
    this.state = {
      frozen: false,
      reason: undefined,
    };
    return this.getState();
  }

  isFrozen(): boolean {
    return this.state.frozen;
  }

  getReason(): string | undefined {
    return this.state.reason;
  }

  getState(): ConstitutionalFreezeState {
    return structuredClone(this.state);
  }
}
