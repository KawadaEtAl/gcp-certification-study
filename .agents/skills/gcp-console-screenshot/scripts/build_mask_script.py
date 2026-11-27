#!/usr/bin/env python3
"""Build a self-contained JS snippet for /browser evaluate_script.

Merges gitignored local/gcp-mask-config.json (if present) into
mask_gcp_console.js without ever writing personal data into tracked files.
"""

from __future__ import annotations

import json
from pathlib import Path
import sys

REPO_ROOT = Path(__file__).resolve().parents[4]
SCRIPT_PATH = Path(__file__).resolve().parent / "mask_gcp_console.js"
LOCAL_CONFIG_PATH = REPO_ROOT / "local" / "gcp-mask-config.json"


def main() -> int:
    template = SCRIPT_PATH.read_text(encoding="utf-8")

    config: dict = {}
    if LOCAL_CONFIG_PATH.exists():
        config = json.loads(LOCAL_CONFIG_PATH.read_text(encoding="utf-8"))
    else:
        print(
            f"// Warning: {LOCAL_CONFIG_PATH} not found; using generic masking rules only.",
            file=sys.stderr,
        )

    rendered = template.replace(
        "__MASK_CONFIG__",
        json.dumps(config, ensure_ascii=False),
    )
    sys.stdout.write(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
