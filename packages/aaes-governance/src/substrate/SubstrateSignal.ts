export interface SubstrateSignal {
  id: string;
  type: 'entropy' | 'order' | 'governance' | 'memory' | 'interaction';
  payload: unknown;
  timestamp: number;
}
