import {
  computeSignature,
  getBundleChecksumsPath,
  getBundleManifestPath,
  getBundleRoot,
  getBundleSignaturePath,
  getChecksumsPath,
  getManifestPath,
  getSignaturePath,
  getArtifactRecords,
  hashFile,
  loadManifest,
  readJson,
} from './shared.ts';
import { join } from 'node:path';

function main() {
  const manifest = loadManifest();
  const expectedChecksums = readJson(getChecksumsPath(), null);
  const bundleManifest = readJson(getBundleManifestPath(), null);
  const bundleChecksums = readJson(getBundleChecksumsPath(), null);
  const signature = readJson(getSignaturePath(), null);
  const bundleSignature = readJson(getBundleSignaturePath(), null);

  if (!expectedChecksums || !Array.isArray(expectedChecksums.files)) {
    throw new Error('release checksums are missing; run build-release first');
  }
  if (!bundleManifest || !Array.isArray(bundleManifest.artifacts)) {
    throw new Error('release bundle manifest is missing; run package-release first');
  }
  if (!signature || !signature.signature) {
    throw new Error('release signature is missing; run sign-release first');
  }

  const artifacts = getArtifactRecords(manifest);
  const computedSignature = computeSignature(expectedChecksums.files, manifest);
  const expectedByPath = new Map(expectedChecksums.files.map((entry) => [entry.path, entry]));

  if (bundleManifest.artifacts.length !== manifest.artifacts.length) {
    throw new Error('bundle artifact list does not match the manifest');
  }

  for (let index = 0; index < manifest.artifacts.length; index += 1) {
    if (bundleManifest.artifacts[index] !== manifest.artifacts[index]) {
      throw new Error('bundle artifact order does not match the manifest');
    }
  }

  for (const artifact of artifacts) {
    const expected = expectedByPath.get(artifact.path);
    if (!expected) {
      throw new Error(`missing checksum for ${artifact.path}`);
    }
    if (expected.sha256 !== artifact.sha256) {
      throw new Error(`checksum mismatch for ${artifact.path}`);
    }

    const bundledArtifactPath = join(getBundleRoot(), 'artifacts', artifact.path);
    const bundledHash = hashFile(bundledArtifactPath);
    if (bundledHash !== artifact.sha256) {
      throw new Error(`bundle artifact mismatch for ${artifact.path}`);
    }
  }

  if (bundleChecksums?.signature !== signature.signature) {
    throw new Error('bundle signature does not match signed payload');
  }

  if (computedSignature !== signature.signature) {
    throw new Error('signature verification failed');
  }

  if (bundleManifest.signature !== signature.signature) {
    throw new Error('bundle manifest signature does not match');
  }

  console.log(`release verified: ${artifacts.length} artifacts in ${getBundleRoot()}`);
  console.log(`manifest: ${getManifestPath()}`);
  console.log(`checksums: ${getChecksumsPath()}`);
}

main();
