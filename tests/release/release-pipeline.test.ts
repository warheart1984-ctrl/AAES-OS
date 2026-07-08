import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('release pipeline', () => {
  it('packages and verifies a real release bundle', () => {
    const buildOutput = execFileSync('node', ['release/build-release.ts'], { encoding: 'utf8' });
    const packageOutput = execFileSync('node', ['release/package-release.ts'], { encoding: 'utf8' });
    const signOutput = execFileSync('node', ['release/sign-release.ts'], { encoding: 'utf8' });
    const verifyOutput = execFileSync('node', ['release/verify-release.ts'], { encoding: 'utf8' });

    expect(buildOutput).not.toContain('scaffold');
    expect(packageOutput).not.toContain('scaffold');
    expect(signOutput).not.toContain('scaffold');
    expect(verifyOutput).not.toContain('scaffold');
    expect(verifyOutput).toContain('release verified');
    expect(existsSync('release/checksums.json')).toBe(true);
    expect(existsSync('release/signature.json')).toBe(true);
    expect(existsSync('release/bundle/release-package.json')).toBe(true);
    expect(existsSync('release/bundle/signature.json')).toBe(true);
  }, 30000);
});
