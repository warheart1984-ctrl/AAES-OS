import type { SemVer } from '../types.js';

const SEMVER_RE =
  /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export function parseSemVer(version: string): SemVer {
  const match = SEMVER_RE.exec(version);
  if (!match) {
    throw new Error(`VERSION: invalid semver "${version}"`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4],
  };
}

export function formatSemVer(semver: SemVer): string {
  const base = `${semver.major}.${semver.minor}.${semver.patch}`;
  return semver.prerelease ? `${base}-${semver.prerelease}` : base;
}

export function compareSemVer(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && !b.prerelease) return -1;
  if (a.prerelease && b.prerelease) {
    return a.prerelease.localeCompare(b.prerelease);
  }
  return 0;
}

export function compareVersionStrings(a: string, b: string): number {
  return compareSemVer(parseSemVer(a), parseSemVer(b));
}

export function isUpgrade(from: string, to: string): boolean {
  return compareVersionStrings(from, to) < 0;
}

export function isDowngrade(from: string, to: string): boolean {
  return compareVersionStrings(from, to) > 0;
}
