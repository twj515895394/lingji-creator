#!/usr/bin/env bash
# 修复 continue-run：script 含 direct_llm（能力表 + getStageSupportedRunners）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cp "$ROOT/.scratch/patches/scene-stage-run-capabilities.ts" \
  "$ROOT/src/sceneforge/lib/scene-stage-run-capabilities.ts"
cp "$ROOT/.scratch/patches/scene-continue-run.ts" \
  "$ROOT/src/sceneforge/lib/scene-continue-run.ts"
echo "OK: copied 2 files. Run: npx vitest run tests/sceneforge-continue-run.test.ts"