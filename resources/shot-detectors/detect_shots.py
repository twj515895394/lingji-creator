#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import traceback
from typing import Any

from fast_pyscenedetect import run_fast_detection


def run_detection(request: dict[str, Any]) -> dict[str, Any]:
    mode = request.get("mode", "fast")
    if mode == "fast":
        return run_fast_detection(request)
    if mode == "accurate":
        raise RuntimeError("TransNetV2 accurate worker is not implemented yet; use fallback in TypeScript runner.")
    raise RuntimeError(f"Unsupported shot detection mode: {mode}")


def main() -> int:
    try:
        raw = sys.stdin.read()
        request = json.loads(raw)
        result = run_detection(request)
        print(json.dumps({"ok": True, **result}, ensure_ascii=False))
        return 0
    except Exception as exc:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": str(exc),
                    "notes": ["Shot detector worker failed."],
                },
                ensure_ascii=False,
            )
        )
        print(traceback.format_exc(), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
