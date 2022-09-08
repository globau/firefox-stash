#!/usr/bin/env python3
import json
import sys


try:
    with open("manifest.json") as f:
        manifest = json.load(f)
        try:
            print(manifest["version"])
        except KeyError:
            print("Failed to find `version` in manifest.json", file=sys.stderr)
            sys.exit(1)
except IOError as e:
    print(f"Failed to load manifest.json: {e}", file=sys.stderr)
    sys.exit(1)
