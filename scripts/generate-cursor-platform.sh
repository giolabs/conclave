#!/usr/bin/env bash
# Wrapper — prefer scripts/generate-cursor-platform.py
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec python3 "$ROOT/scripts/generate-cursor-platform.py" "$@"
