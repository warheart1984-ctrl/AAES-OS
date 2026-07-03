import { PlatformService } from '@aaes-os/platform-core';
import { MeshNetwork } from '@aaes-os/platform-mesh';
import { PatternLedger } from '@aaes-os/aaes-governance';
import { PsomMesh } from '@aaes-os/psom-mesh';
import { SgceEconomy } from '@aaes-os/sgce';
import { SovrenAuthority } from '@aaes-os/sovren';

export interface LocalPlatformOptions {
  organismId?: string;
  lawHash?: string;
  endpoint?: string;
  governanceProfile?: 'strict' | 'balanced' | 'experimental';
}

/** Governance-safe local SDK combining PlatformService, MeshNetwork, PSOM, and SGCE. */
export class LocalPlatform {
  readonly platform: PlatformService;
  readonly mesh: MeshNetwork;
  readonly psom: PsomMesh;
  readonly sgce: SgceEconomy;

  constructor(options: LocalPlatformOptions = {}) {
    const organismId = options.organismId ?? `organism-${Date.now().toString(36)}`;
    const lawHash = options.lawHash ?? 'platform-law-v1';
    const ledger = new PatternLedger();
    const sovren = new SovrenAuthority(process.env.SOVREN_LAW_KEY ?? 'platform-sdk-dev');

    this.platform = new PlatformService();
    this.mesh = new MeshNetwork(organismId, lawHash, sovren, ledger);
    this.sgce = new SgceEconomy();
    this.psom = new PsomMesh({
      nodeId: organismId,
      organismId,
      endpoint: options.endpoint ?? 'http://localhost:4100',
      governanceProfile: options.governanceProfile ?? 'balanced',
    });
  }
}
