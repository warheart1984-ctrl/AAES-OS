import { PatternLedger } from '@aaes-os/aaes-governance';
import { PlatformService } from '@aaes-os/platform-core';
import { MeshNetwork } from '@aaes-os/platform-mesh';
import { PsomMesh } from '@aaes-os/psom-mesh';
import { SgceEconomy } from '@aaes-os/sgce';
import { SovrenAuthority } from '@aaes-os/sovren';

const globalForPlatform = globalThis as unknown as {
  platform?: PlatformService;
  mesh?: MeshNetwork;
  psom?: PsomMesh;
  sgce?: SgceEconomy;
};

export function getPlatform(): PlatformService {
  if (!globalForPlatform.platform) {
    globalForPlatform.platform = new PlatformService();
  }
  return globalForPlatform.platform;
}

export function getMesh(): MeshNetwork {
  if (!globalForPlatform.mesh) {
    const ledger = new PatternLedger();
    const sovren = new SovrenAuthority(process.env.SOVREN_LAW_KEY ?? 'platform-web-dev');
    globalForPlatform.mesh = new MeshNetwork(
      process.env.ORGANISM_ID ?? 'organism-web',
      process.env.PLATFORM_LAW_HASH ?? 'platform-law-v1',
      sovren,
      ledger,
    );
  }
  return globalForPlatform.mesh;
}

export function getPsom(): PsomMesh {
  if (!globalForPlatform.psom) {
    const organismId = process.env.ORGANISM_ID ?? 'organism-web';
    globalForPlatform.psom = new PsomMesh({
      nodeId: organismId,
      organismId,
      endpoint: process.env.PLATFORM_API_URL ?? 'http://localhost:4100',
      governanceProfile: 'balanced',
    });
  }
  return globalForPlatform.psom;
}

export function getSgce(): SgceEconomy {
  if (!globalForPlatform.sgce) {
    globalForPlatform.sgce = new SgceEconomy();
  }
  return globalForPlatform.sgce;
}
