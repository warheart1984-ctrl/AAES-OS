"""Mesh CLI entry point for Python SDK."""

from __future__ import annotations

import argparse
import json
import sys

from aaes_os.client import PlatformClient


def main() -> None:
    parser = argparse.ArgumentParser(description="AAES-OS mesh CLI (Python)")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("profiles", help="List governance profiles")

    login = sub.add_parser("login", help="Login session")
    login.add_argument("--owner", default="developer")
    login.add_argument("--profile", default="balanced")
    login.add_argument("--url", default="http://localhost:4100")

    invoke = sub.add_parser("invoke", help="Invoke capability")
    invoke.add_argument("--id", required=True)
    invoke.add_argument("--input", default="{}")

    parser.add_argument("--url", default="http://localhost:4100")
    parser.add_argument("--key", default=None)

    args = parser.parse_args()
    client = PlatformClient(base_url=args.url, api_key=args.key)

    try:
        if args.command == "profiles":
            print(json.dumps(client.list_governance_profiles(), indent=2))
        elif args.command == "login":
            print(json.dumps(client.login(args.owner, args.profile), indent=2))
        elif args.command == "invoke":
            data = json.loads(args.input)
            print(json.dumps(client.invoke_capability(args.id, data), indent=2))
        else:
            parser.print_help()
            sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    main()
