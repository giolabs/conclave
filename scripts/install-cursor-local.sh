#!/usr/bin/env bash
# Install (or refresh) the Conclave Cursor plugin into the local Cursor plugins dir.
# Preferred reliable path: real copy via rsync (external symlinks are often rejected).
#
# Usage:
#   ./scripts/install-cursor-local.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/platforms/cursor"
DEST="${HOME}/.cursor/plugins/local/conclave-cursor"

if [[ ! -f "$SRC/.cursor-plugin/plugin.json" ]]; then
  echo "error: missing $SRC/.cursor-plugin/plugin.json — build the Cursor package first" >&2
  exit 1
fi

# Ensure synced methodology is present
"$ROOT/scripts/sync-cursor-platform.sh"

mkdir -p "$(dirname "$DEST")"
rsync -a --delete "$SRC/" "$DEST/"

echo "Installed Conclave Cursor plugin → $DEST"
echo "Next: enable third-party/local plugins if required, then Developer: Reload Window."
echo "If commands do not appear on Team/Enterprise, ask your org admin (userLocal may be false)."
