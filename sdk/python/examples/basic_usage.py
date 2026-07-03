#!/usr/bin/env python3
"""Example: login, publish, invoke, and check usage."""

from aaes_platform import PlatformClient


def main() -> None:
    client = PlatformClient()
    session = client.login("example-dev", "balanced")
    print("session:", session["sessionId"])

    record = client.publish_capability(
        capability_id="cap.example",
        name="Example Capability",
        organ_id="organ-demo",
        version="1.0.0",
    )
    print("published:", record["id"], "@", record["currentVersion"])

    result = client.invoke_capability("cap.example", {"message": "hello mesh"})
    print("invoke allowed:", result["governance"]["allowed"])
    print("billing units:", result["billing"]["units"])

    usage = client.get_usage()
    print("total usage:", usage["totalUnits"])


if __name__ == "__main__":
    main()
