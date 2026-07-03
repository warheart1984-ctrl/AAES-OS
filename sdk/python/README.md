# AAES-OS Python SDK

Official Python client for the PSOM + SGCE super-platform.

## Install

```bash
cd sdk/python
pip install -e .
```

## Usage

```python
from aaes_os import PlatformClient

with PlatformClient("http://localhost:4100", api_key="org_...") as client:
    profiles = client.list_governance_profiles()
    result = client.invoke_capability("cap.analyze", {"text": "hello"})
    print(result)
```

## CLI

```bash
aaes-mesh profiles --url http://localhost:4100
aaes-mesh login --owner dev-1 --profile balanced
```
