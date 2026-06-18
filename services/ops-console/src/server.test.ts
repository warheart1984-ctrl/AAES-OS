import { createServer, type Server } from 'node:http';

import { describe, expect, it, afterAll, beforeAll } from 'vitest';

import { app } from './server.js';

describe('GET /telemetry', () => {
  let server: Server;
  let baseUrl = '';

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : 4000;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  it('returns drift, topPatterns, and lastFaults keys', async () => {
    const response = await fetch(`${baseUrl}/telemetry`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      drift: { score: number; totalFaults: number; uniquePatterns: number };
      topPatterns: unknown[];
      lastFaults: unknown[];
    };

    expect(body.drift).toEqual(
      expect.objectContaining({
        score: expect.any(Number),
        totalFaults: expect.any(Number),
        uniquePatterns: expect.any(Number),
      }),
    );
    expect(Array.isArray(body.topPatterns)).toBe(true);
    expect(Array.isArray(body.lastFaults)).toBe(true);
  });
});
