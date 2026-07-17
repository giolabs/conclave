#!/usr/bin/env bash
# Best-effort board data regenerate for Cursor afterFileEdit.
# Spec: docs/specs/conclave-cursor-adaptation/spec.md — hooks are best-effort;
# /conclave-board remains authoritative if this no-ops.
#
# Never fail or block the agent turn.

set -u

INPUT="$(cat 2>/dev/null || true)"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  exit 0
fi

GEN_SCRIPT="$REPO_ROOT/conclave-board/scripts/generate-data.mjs"
if [ ! -f "$GEN_SCRIPT" ]; then
  exit 0
fi

FILE_PATH=""
if [ -n "$INPUT" ] && command -v node >/dev/null 2>&1; then
  FILE_PATH="$(node -e '
let data = "";
process.stdin.on("data", (c) => { data += c; });
process.stdin.on("end", () => {
  try {
    const p = JSON.parse(data);
    const candidates = [
      p && p.file_path,
      p && p.path,
      p && p.tool_input && p.tool_input.file_path,
      p && p.file && p.file.path,
    ];
    for (const c of candidates) {
      if (typeof c === "string" && c.length) { process.stdout.write(c); break; }
    }
  } catch {}
});
' <<< "$INPUT" 2>/dev/null || true)"
fi

if [ -n "$FILE_PATH" ]; then
  case "$FILE_PATH" in
    */conclave/*|conclave/*) ;;
    *) exit 0 ;;
  esac
fi

(cd "$REPO_ROOT/conclave-board" && node scripts/generate-data.mjs) >&2 || true
exit 0
