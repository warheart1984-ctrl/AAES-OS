import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@aaes-os/runledger': path.join(rootDir, 'packages/runledger/src/index.ts'),
      '@aaes-os/aaes-governance': path.join(rootDir, 'packages/aaes-governance/src/index.ts'),
      '@aaes-os/trace-bus': path.join(rootDir, 'packages/trace-bus/src/index.ts'),
      '@aaes-os/ucr-runtime': path.join(rootDir, 'packages/ucr-runtime/src/index.ts'),
      '@aaes-os/tri-core-protocol': path.join(rootDir, 'packages/tri-core-protocol/src/index.ts'),
    },
  },
  test: {
    include: ['tests/integration/**/*.test.ts', 'packages/**/src/**/*.test.ts', 'services/**/src/**/*.test.ts'],
    environment: 'node',
  },
});
