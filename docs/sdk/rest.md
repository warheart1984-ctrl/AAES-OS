# REST API Reference

Base URL: `http://localhost:4100` (configurable via `PLATFORM_API_PORT`)

## Authentication

All mutating endpoints require `Authorization: Bearer <api-key>` header.

Create a key via CLI or `POST /auth/keys`.

## Examples

### Create API key

```bash
curl -X POST http://localhost:4100/auth/keys \
  -H "Authorization: Bearer org_..." \
  -H "Content-Type: application/json" \
  -d '{"label":"dev","governanceProfile":"balanced"}'
```

### Publish capability

```bash
curl -X POST http://localhost:4100/capabilities/publish \
  -H "Authorization: Bearer org_..." \
  -H "Content-Type: application/json" \
  -d '{
    "id": "cap.analyze",
    "name": "Analyze",
    "version": "1.0.0",
    "governanceProfile": "balanced"
  }'
```

### Invoke capability

```bash
curl -X POST http://localhost:4100/capabilities/invoke \
  -H "Authorization: Bearer org_..." \
  -H "Content-Type: application/json" \
  -d '{"capabilityId":"cap.analyze","input":{"text":"hello"}}'
```

### Mesh topology

```bash
curl http://localhost:4100/mesh/topology
```

See [architecture.md](../architecture.md) for full endpoint list.
