import {
  computeSignature,
  getBundleChecksumsPath,
  getBundleManifestPath,
  getBundleSignaturePath,
  getChecksumsPath,
  getSignaturePath,
  loadManifest,
  readJson,
  writeJson,
} from './shared.ts';

function main() {
  const manifest = loadManifest();
  const checksums = readJson(getChecksumsPath(), null);
  if (!checksums || !Array.isArray(checksums.files)) {
    throw new Error('release checksums are missing; run build-release first');
  }

  const signature = computeSignature(checksums.files, manifest);
  const payload = {
    signature,
    artifactCount: checksums.files.length,
    generatedAt: new Date().toISOString(),
  };

  writeJson(getSignaturePath(), payload);
  writeJson(getBundleSignaturePath(), payload);
  writeJson(getBundleChecksumsPath(), {
    ...checksums,
    signature,
  });

  // Keep the bundle manifest in sync with the signed package state.
  const bundleManifest = readJson(getBundleManifestPath(), {});
  writeJson(getBundleManifestPath(), {
    ...bundleManifest,
    signature,
  });

  console.log(`release signed: ${signature}`);
}

main();
