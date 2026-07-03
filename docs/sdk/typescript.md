# TypeScript/JavaScript SDK

Official SDK: `@aaes-os/platform-sdk`

## Install

```bash
pnpm add @aaes-os/platform-sdk
```

## Local (in-process) usage

```typescript
import { LocalPlatform } from '@aaes-os/platform-sdk';

const platform = new LocalPlatform({
  governanceProfile: 'balanced',
  organismId: 'my-organism',
});

// Publish capability
platform.economy.publishCapability({
  id: 'cap.analyze',
  name: 'Analyze',
  description: 'Text analysis',
  organId: 'organ-1',
  ownerId: 'owner-1',
  version: '1.0.0',
  governanceProfile: 'balanced',
});

// Connect mesh peer
platform.mesh.registerPeer({
  nodeId: 'peer-1',
  organismId: 'peer-org',
  endpoint: 'http://localhost:4101',
  governanceProfile: 'balanced',
  capabilities: ['cap.analyze'],
});
```

## REST client

```typescript
import { PlatformClient } from '@aaes-os/platform-sdk';

const client = new PlatformClient({
  baseUrl: 'http://localhost:4100',
  apiKey: 'org_...',
});

const profiles = await client.listGovernanceProfiles();
const result = await client.invokeCapability({
  capabilityId: 'cap.analyze',
  input: { text: 'hello' },
});
```

## Build & publish

```bash
pnpm --filter @aaes-os/platform-sdk build
```

See `.github/workflows/sdk-publish.yml` for CI publish pipeline.
