import { describe, expect, it, vi } from 'vitest';

import { OllamaProvider } from '../../src/model/OllamaProvider.js';

describe('root OllamaProvider compatibility adapter', () => {
  it('returns the validated ModelProvider proposal shape', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          response: JSON.stringify({
            schemaVersion: '1',
            goal: 'fix',
            operations: [
              {
                file: 'src/index.ts',
                type: 'update',
                content: 'export const fixed = true;',
              },
            ],
          }),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const provider = new OllamaProvider({ fetch });

    const proposal = await provider.generate('Fix src/index.ts');

    expect(proposal.goal).toBe('fix');
    expect(proposal.operations[0]?.file).toBe('src/index.ts');
    expect(proposal).not.toHaveProperty('raw');
  });
});
