# AAES Super-Platform SDK Documentation

Official SDKs for Python, JavaScript/TypeScript, and REST.

## Quick Start

### 1. Start the platform API

```bash
cd project-infi
pnpm platform-api
```

API listens on `http://localhost:4100`.

### 2. TypeScript / JavaScript

```typescript
import { PlatformClient } from '@aaes-os/platform-sdk';

const client = new PlatformClient({ baseUrl: 'http://localhost:4100' });
await client.login('developer', 'balanced');

const { key } = await client.createApiKey('my-app');
client.setApiKey(key);

await client.publishCapability({
  id: 'cap.demo',
  name: 'Demo',
  organId: 'organ-1',
  version: '1.0.0',
});

const result = await client.invokeCapability('cap.demo', { hello: 'world' });
console.log(result.billing.units);
```

See `docs/sdk/examples/typescript-basic.ts`.

### 3. Python

```bash
pip install -e sdk/python
python sdk/python/examples/basic_usage.py
```

### 4. REST

All endpoints accept `Authorization: Bearer org_...` or `x-session-id` header.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/auth/login` | Create session |
| POST | `/v1/auth/keys` | Generate API key |
| GET | `/v1/governance/profiles` | List governance profiles |
| POST | `/v1/capabilities/publish` | Publish capability |
| POST | `/v1/capabilities/:id/invoke` | Invoke capability |
| GET | `/v1/billing/usage` | Usage metering |
| GET | `/v1/mesh/discover` | Mesh discovery |
| POST | `/v1/mesh/connect` | Connect organisms |
| POST | `/v1/workflows/run` | Cross-organism workflow |

See `docs/sdk/openapi.yaml` for the full REST specification.

## Governance-Safe Request Wrappers

All SDK invoke and workflow calls attach governance trace metadata (`_governance.profile`, `_governance.traceId`). The platform enforces:

- **Strict** — blocks incompatible invokes and major downgrades
- **Balanced** — production default with core invariants
- **Experimental** — sandbox with mesh sharing and cross-organism routing

## CLI

```bash
pnpm organism -- login --owner you --profile balanced
pnpm organism -- keys generate --label ci
pnpm organism -- publish --id cap.x --name X --organ o1 --version 1.0.0
pnpm organism -- governance
pnpm organism -- connect --organism remote-node
pnpm organism -- completion --shell powershell
```

## Developer Dashboard

```bash
pnpm platform-web
```

Open `http://localhost:4200/developer` for API keys, usage, capabilities, governance, and mesh UI.
