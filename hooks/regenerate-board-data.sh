#!/usr/bin/env bash
# PostToolUse hook (Write|Edit) — regenerates the Kanban board's data
# snapshot whenever a file under conclave/ changes, so a running
# `conclave-board` dev server hot-reloads with the latest state.
#
# Hard rule (spec docs/specs/conclave-board/spec.md §14/§18): this hook must
# NEVER fail or block the tool call it's attached to. Every exit path below
# is 0, and every guard clause is a cheap, early no-op.

set -u

INPUT="$(cat 2>/dev/null || true)"

# Guard 1: no input, or no `node` available to parse it — no-op.
if [ -z "$INPUT" ] || ! command -v node >/dev/null 2>&1; then
  exit 0
fi

FILE_PATH="$(node -e '
let data = "";
process.stdin.on("data", (chunk) => { data += chunk; });
process.stdin.on("end", () => {
  try {
    const payload = JSON.parse(data);
    const filePath = payload && payload.tool_input && payload.tool_input.file_path;
    if (typeof filePath === "string") process.stdout.write(filePath);
  } catch {
    // Malformed/unexpected payload shape — leave stdout empty, guard 2 below no-ops.
  }
});
' <<< "$INPUT" 2>/dev/null || true)"

# Guard 2: couldn't resolve a touched path — no-op.
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Guard 3: the touched path isn't under a conclave/ directory — no-op.
case "$FILE_PATH" in
  */conclave/*|conclave/*) ;;
  *) exit 0 ;;
esac

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  exit 0
fi

GEN_SCRIPT="$REPO_ROOT/conclave-board/scripts/generate-data.mjs"

# Guard 4: this repo never ran /conclave-board — no-op.
if [ ! -f "$GEN_SCRIPT" ]; then
  exit 0
fi

(cd "$REPO_ROOT/conclave-board" && node scripts/generate-data.mjs) >&2 || true

exit 0
