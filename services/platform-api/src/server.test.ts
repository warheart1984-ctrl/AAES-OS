import { describe, expect, it } from 'vitest';

import { createApp } from './server.js';
import { platform } from './state.js';

describe('platform-api', () => {
  it('creates app with health route', async () => {
    const app = createApp();
    expect(app).toBeTruthy();

    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('ok');

    server.close();
    expect(platform.listProfiles()).toHaveLength(3);
  });
});
