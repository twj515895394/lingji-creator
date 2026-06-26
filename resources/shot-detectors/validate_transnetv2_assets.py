#!/usr/bin/env python3
"""Validate local TransNetV2 asset placement for SceneForge Remix.

This script performs file-system checks only. It does not import torch, load the
model, or run inference. It is intended for Phase 0 asset setup verification.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

DEFAULT_WEIGHTS_FILE = "transnetv2-pytorch-weights.pth"


def project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def resolve_model_path(root: Path, warnings: list[str]) -> Path | None:
    env_path = os.environ.get("LINGJI_TRANSNETV2_MODEL_PATH", "").strip()
    if env_path:
        candidate = Path(env_path).expanduser().resolve()
        if candidate.exists():
            return candidate
        warnings.append(f"LINGJI_TRANSNETV2_MODEL_PATH does not exist: {candidate}")

    model_dir = root / "resources" / "models" / "transnetv2"
    default_path = model_dir / DEFAULT_WEIGHTS_FILE
    if default_path.exists():
        return default_path

    pth_files = sorted(model_dir.glob("*.pth")) if model_dir.exists() else []
    if len(pth_files) == 1:
        return pth_files[0]
    if len(pth_files) > 1:
        warnings.append(f"Multiple .pth files found in {model_dir}; set LINGJI_TRANSNETV2_MODEL_PATH")
    return None


def resolve_vendor_dir(root: Path, warnings: list[str]) -> Path | None:
    env_dir = os.environ.get("LINGJI_TRANSNETV2_VENDOR_DIR", "").strip()
    if env_dir:
        candidate = Path(env_dir).expanduser().resolve()
        if has_model_code(candidate):
            return candidate
        warnings.append(f"LINGJI_TRANSNETV2_VENDOR_DIR has no usable Python model code: {candidate}")

    vendor_dir = root / "resources" / "shot-detectors" / "vendor" / "transnetv2"
    if has_model_code(vendor_dir):
        return vendor_dir
    return None


def has_model_code(vendor_dir: Path) -> bool:
    if not vendor_dir.exists() or not vendor_dir.is_dir():
        return False
    return any(path.suffix == ".py" and path.name != "__init__.py" for path in vendor_dir.iterdir())


def build_report() -> dict[str, Any]:
    root = project_root()
    warnings: list[str] = []
    model_path = resolve_model_path(root, warnings)
    vendor_dir = resolve_vendor_dir(root, warnings)
    missing: list[str] = []
    if model_path is None:
        missing.append("weights")
    if vendor_dir is None:
        missing.append("vendor")

    return {
        "ok": len(missing) == 0,
        "projectRoot": str(root),
        "modelPath": str(model_path) if model_path else None,
        "vendorDir": str(vendor_dir) if vendor_dir else None,
        "missing": missing,
        "warnings": warnings,
        "notes": [
            "This script only validates file placement.",
            "It does not import torch or run TransNetV2 inference.",
        ],
    }


def main() -> int:
    report = build_report()
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
