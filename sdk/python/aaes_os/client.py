"""REST client for the AAES-OS super-platform API."""

from __future__ import annotations

from typing import Any, Optional

import httpx


class PlatformClient:
    """Governance-safe Python client with auth, billing, and capability invocation."""

    def __init__(
        self,
        base_url: str = "http://localhost:4100",
        api_key: Optional[str] = None,
        timeout: float = 30.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self._client = httpx.Client(base_url=self.base_url, timeout=timeout)

    def set_api_key(self, key: str) -> None:
        self.api_key = key

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _request(self, method: str, path: str, json: Optional[dict] = None) -> Any:
        resp = self._client.request(method, path, json=json, headers=self._headers())
        resp.raise_for_status()
        return resp.json()

    def login(self, owner_id: str, governance_profile: str = "balanced") -> dict:
        return self._request("POST", "/auth/login", {"ownerId": owner_id, "governanceProfile": governance_profile})

    def create_api_key(self, label: str, governance_profile: str = "balanced") -> dict:
        return self._request("POST", "/auth/keys", {"label": label, "governanceProfile": governance_profile})

    def list_api_keys(self) -> list:
        return self._request("GET", "/auth/keys")

    def invoke_capability(
        self,
        capability_id: str,
        input_data: Optional[dict] = None,
        version: Optional[str] = None,
    ) -> dict:
        body: dict = {"capabilityId": capability_id, "input": input_data or {}}
        if version:
            body["version"] = version
        return self._request("POST", "/capabilities/invoke", body)

    def publish_capability(self, **kwargs: Any) -> dict:
        return self._request("POST", "/capabilities/publish", kwargs)

    def list_capabilities(self) -> list:
        return self._request("GET", "/capabilities")

    def get_usage_summary(self) -> dict:
        return self._request("GET", "/billing/usage")

    def get_mesh_topology(self) -> dict:
        return self._request("GET", "/mesh/topology")

    def connect_organism(self, **kwargs: Any) -> dict:
        return self._request("POST", "/mesh/connect", kwargs)

    def list_governance_profiles(self) -> list:
        return self._request("GET", "/governance/profiles")

    def get_drift_report(self) -> list:
        return self._request("GET", "/governance/drift")

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "PlatformClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()
