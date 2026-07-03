"""Governance-safe HTTP client for the AAES platform REST API."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any


@dataclass
class PlatformClient:
    """Python SDK client with auth, billing hooks, and governance wrappers."""

    base_url: str = "http://localhost:4100"
    api_key: str | None = None
    session_id: str | None = None
    governance_profile: str = "balanced"

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        elif self.session_id:
            headers["x-session-id"] = self.session_id
        return headers

    def _request(
        self,
        method: str,
        path: str,
        body: dict[str, Any] | None = None,
        governed: bool = False,
    ) -> Any:
        payload = dict(body or {})
        if governed:
            payload["_governance"] = {
                "profile": self.governance_profile,
                "traceId": f"py-sdk-{id(self)}",
            }

        data = json.dumps(payload).encode() if payload or method != "GET" else None
        req = urllib.request.Request(
            f"{self.base_url.rstrip('/')}{path}",
            data=data,
            headers=self._headers(),
            method=method,
        )
        try:
            with urllib.request.urlopen(req) as resp:
                text = resp.read().decode()
                return json.loads(text) if text else None
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode()
            try:
                parsed = json.loads(detail)
                raise RuntimeError(parsed.get("error", detail)) from exc
            except json.JSONDecodeError:
                raise RuntimeError(detail) from exc

    def login(self, owner_id: str, governance_profile: str | None = None) -> dict[str, Any]:
        session = self._request(
            "POST",
            "/v1/auth/login",
            {"ownerId": owner_id, "governanceProfile": governance_profile or self.governance_profile},
        )
        self.session_id = session["sessionId"]
        self.governance_profile = session["governanceProfile"]
        return session

    def create_api_key(self, label: str, governance_profile: str | None = None) -> dict[str, Any]:
        return self._request(
            "POST",
            "/v1/auth/keys",
            {"label": label, "governanceProfile": governance_profile or self.governance_profile},
        )

    def list_governance_profiles(self) -> list[dict[str, Any]]:
        return self._request("GET", "/v1/governance/profiles")

    def publish_capability(
        self,
        capability_id: str,
        name: str,
        organ_id: str,
        version: str,
        description: str = "",
    ) -> dict[str, Any]:
        return self._request(
            "POST",
            "/v1/capabilities/publish",
            {
                "id": capability_id,
                "name": name,
                "organId": organ_id,
                "version": version,
                "description": description,
            },
        )

    def invoke_capability(
        self,
        capability_id: str,
        input_data: dict[str, Any],
        version: str | None = None,
    ) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/v1/capabilities/{capability_id}/invoke",
            {"input": input_data, "version": version},
            governed=True,
        )

    def get_usage(self) -> dict[str, Any]:
        return self._request("GET", "/v1/billing/usage")

    def test_module(self, module_id: str, version: str) -> dict[str, Any]:
        return self._request("POST", "/v1/modules/test", {"moduleId": module_id, "version": version})

    def discover_organisms(self, capability: str | None = None) -> list[dict[str, Any]]:
        path = "/v1/mesh/discover"
        if capability:
            path += f"?capability={capability}"
        return self._request("GET", path)

    def connect_organism(self, organism_id: str, scope: list[str] | None = None) -> dict[str, Any]:
        return self._request("POST", "/v1/mesh/connect", {"organismId": organism_id, "scope": scope or ["sync"]})

    def run_workflow(self, steps: list[dict[str, Any]]) -> dict[str, Any]:
        return self._request("POST", "/v1/workflows/run", {"steps": steps}, governed=True)
