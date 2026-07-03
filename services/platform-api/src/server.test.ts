import { describe, expect, it } from 'vitest';

import { createApp } from './server.js';

describe('platform-api', () => {
  it('creates app with health route', async () => {
    const { app, state } = createApp();
    expect(app).toBeTruthy();
    expect(state.platform.runtime.nodeId).toBeTruthy();
  });
});
