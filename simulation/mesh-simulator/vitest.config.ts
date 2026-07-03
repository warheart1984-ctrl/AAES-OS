import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const simDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@aaes-os/psom-mesh': path.join(simDir, '../../packages/psom-mesh/src/index.ts'),
      '@aaes-os/sgce': path.join(simDir, '../../packages/sgce/src/index.ts'),
      '@aaes-os/platform-core': path.join(simDir, '../../packages/platform-core/src/index.ts'),
      '@aaes-os/governed-runtime': path.join(simDir, '../../packages/governed-runtime/src/index.ts'),
      '@aaes-os/federation': path.join(simDir, '../../packages/federation/src/index.ts'),
      '@aaes-os/aaes-governance': path.join(simDir, '../../packages/aaes-governance/src/index.ts'),
      '@aaes-os/sovren': path.join(simDir, '../../packages/sovren/src/index.ts'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
