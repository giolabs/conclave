#!/usr/bin/env bash
# Sync canonical Conclave methodology into the Cursor plugin tree.
# Source of truth: skills/conclave/{SKILL.md,templates/,board-app/,visual-sprint-board/}
# Destination:    platforms/cursor/skills/conclave/
#
# Usage:
#   ./scripts/sync-cursor-platform.sh          # copy + patch frontmatter
#   ./scripts/sync-cursor-platform.sh --check  # exit 1 if destination is stale
#
# Do NOT hand-edit platforms/cursor/skills/conclave/SKILL.md or templates —
# edit the canonical files, then re-run this script.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/skills/conclave"
DST="$ROOT/platforms/cursor/skills/conclave"
CHECK=0

if [[ "${1:-}" == "--check" ]]; then
  CHECK=1
fi

if [[ ! -f "$SRC/SKILL.md" ]]; then
  echo "error: missing canonical $SRC/SKILL.md" >&2
  exit 1
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

stage="$tmpdir/conclave"
mkdir -p "$stage/templates"

cp "$SRC/SKILL.md" "$stage/SKILL.md"
cp -R "$SRC/templates/." "$stage/templates/"

# board-app is required for /conclave-board parity after local Cursor install
if [[ -d "$SRC/board-app" ]]; then
  mkdir -p "$stage/board-app"
  # Copy without node_modules / .next if present
  rsync -a --exclude node_modules --exclude .next --exclude out \
    "$SRC/board-app/" "$stage/board-app/"
fi

# visual-sprint-board skill for /conclave-sprint-board
if [[ -d "$SRC/visual-sprint-board" ]]; then
  mkdir -p "$stage/visual-sprint-board"
  rsync -a "$SRC/visual-sprint-board/" "$stage/visual-sprint-board/"
fi

# Allowlisted Cursor frontmatter tweak: keep name=conclave, ensure description
# mentions Cursor (canonical already does after 0.11.0; re-assert for safety).
python3 - "$stage/SKILL.md" <<'PY'
import re, sys
path = sys.argv[1]
text = open(path, encoding="utf-8").read()
# Ensure description mentions Cursor if somehow missing
if "Cursor" not in text.split("---", 2)[1]:
    text = text.replace(
        "that work with Claude Code.",
        "that work with Claude Code or Cursor.",
        1,
    )
open(path, "w", encoding="utf-8").write(text)
PY

if [[ "$CHECK" -eq 1 ]]; then
  if [[ ! -d "$DST" ]]; then
    echo "error: missing $DST — run ./scripts/sync-cursor-platform.sh first" >&2
    exit 1
  fi
  # Compare SKILL.md + templates (board-app / visual-sprint-board may be large)
  diff -rq "$stage/SKILL.md" "$DST/SKILL.md" >/dev/null
  diff -rq "$stage/templates" "$DST/templates" >/dev/null
  if [[ -d "$stage/board-app" ]]; then
    if [[ ! -d "$DST/board-app" ]]; then
      echo "error: board-app missing from Cursor tree" >&2
      exit 1
    fi
    diff -rq "$stage/board-app" "$DST/board-app" >/dev/null
  fi
  if [[ -d "$stage/visual-sprint-board" ]]; then
    if [[ ! -d "$DST/visual-sprint-board" ]]; then
      echo "error: visual-sprint-board missing from Cursor tree" >&2
      exit 1
    fi
    diff -rq "$stage/visual-sprint-board" "$DST/visual-sprint-board" >/dev/null
  fi
  echo "OK: platforms/cursor/skills/conclave is in sync with canonical skills/conclave"
  exit 0
fi

mkdir -p "$DST"
rsync -a --delete \
  --exclude agents \
  "$stage/" "$DST/"

echo "Synced canonical skills/conclave → platforms/cursor/skills/conclave"
