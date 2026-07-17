#!/usr/bin/env python3
"""Port Claude Code commands + agents into platforms/cursor/ (idempotent)."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "platforms" / "cursor"

AGENT_DESC = {
    "product-manager": "Conclave Product Manager — backlog, scope, story authoring",
    "tech-lead": "Conclave Tech Lead — architecture, feasibility, PR review, ADRs",
    "designer": "Conclave Designer — design-discipline story execution",
    "devops": "Conclave DevOps — devops-discipline story execution",
    "scrum-master": "Conclave Scrum Master — planning facilitation and assignment",
    "developer": "Conclave Developer — implement stories/bugs with tests and PRs",
    "qa": "Conclave QA — verification, UAT, bug-report authoring",
}

CURSOR_PREAMBLE = """
> **Cursor runtime notes (ADR-002):** This command is the Cursor port of the Claude Code twin.
> - Prefer the **`AskQuestion`** tool for structured prompts when running in top-level Agent chat. If unavailable (e.g. inside a `Task`/subagent), use an explicit numbered option list and wait for the user's reply.
> - Spawn role work with the **`Task`** tool (or Cursor custom agents), loading the matching file under `agents/<role>.md` as the subagent charter — not Claude Code's `Agent` tool.
> - Template and skill paths are relative to this plugin root: `skills/conclave/templates/...` and `skills/conclave/board-app/...`.
> - There is no `allowed-tools` frontmatter; Cursor session permissions apply.
> - Concurrent batches still issue ≤ 3 Task calls per wave (correctness over wall-clock if Cursor serializes them).

"""

REPLACEMENTS = [
    (r"\bAgent tool call\b", "Task tool call"),
    (r"\bAgent calls\b", "Task calls"),
    (r"\bAgent call\b", "Task call"),
    (r"\bno Agent calls\b", "no Task calls"),
    (r"\bno Agent call\b", "no Task call"),
    (r"`Agent` tool", "`Task` tool"),
    (r"the `Agent` tool", "the `Task` tool"),
    (r"Issue one `Agent`", "Issue one `Task`"),
    (r"issue one `Agent`", "issue one `Task`"),
    (r"one `Agent` call", "one `Task` call"),
    (r"one `Agent` tool call", "one `Task` tool call"),
    (r"\bAgent tool error\b", "Task tool error"),
    (r"per-story Agent call", "per-story Task call"),
    (r"each Agent call", "each Task call"),
    (r"Each Agent call", "Each Task call"),
    (r"an Agent call", "a Task call"),
    (r"any Agent call", "any Task call"),
    (r"dispatching ANY Agent", "dispatching ANY Task"),
    (r"inside each Agent call", "inside each Task call"),
    (r"Spawn a subagent", "Spawn a Task/subagent"),
    (r"spawning an Agent subagent", "spawning a Task/subagent"),
    (r"dispatches an `Agent` tool call", "dispatches a `Task` tool call"),
    (r"per-ID Agent calls", "per-ID Task calls"),
    (r"concurrent Agent calls", "concurrent Task calls"),
    (r"ALL the per-story Agent calls", "ALL the per-story Task calls"),
    (r"no Agent call is dispatched", "no Task call is dispatched"),
]


def transform_command(text: str, stem: str) -> str:
    if not text.startswith("---"):
        raise SystemExit(f"no frontmatter: {stem}")
    parts = text.split("---", 2)
    fm, body = parts[1], parts[2]
    m = re.search(r"^description:\s*(.+)$", fm, re.M)
    desc = m.group(1).strip() if m else stem
    new_fm = f"---\nname: {stem}\ndescription: {desc}\n---\n"
    body = body.replace("${CLAUDE_PLUGIN_ROOT}/skills/conclave/agents/", "agents/")
    body = body.replace("${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/", "skills/conclave/templates/")
    body = body.replace("${CLAUDE_PLUGIN_ROOT}/skills/conclave/board-app/", "skills/conclave/board-app/")
    body = body.replace("${CLAUDE_PLUGIN_ROOT}/skills/conclave/", "skills/conclave/")
    body = body.replace("AskUserQuestion", "AskQuestion")
    for pat, rep in REPLACEMENTS:
        body = re.sub(pat, rep, body)
    if stem == "conclave-init":
        body = body.replace(
            "Scrum-for-Claude-Code",
            "Scrum-for-agent-platforms (Claude Code / Cursor)",
        )
    body2 = body.lstrip("\n")
    m = re.match(r"(#[^\n]+\n)", body2)
    if m:
        body2 = m.group(1) + "\n" + CURSOR_PREAMBLE + body2[m.end() :]
    else:
        body2 = CURSOR_PREAMBLE + body2
    return new_fm + "\n" + body2


def transform_agent(text: str, name: str) -> str:
    text = text.replace("${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/", "skills/conclave/templates/")
    text = text.replace("${CLAUDE_PLUGIN_ROOT}/skills/conclave/", "skills/conclave/")
    text = text.replace("AskUserQuestion", "AskQuestion")
    return (
        f"---\nname: {name}\ndescription: {AGENT_DESC[name]}\n---\n\n"
        f"<!-- Cursor port of skills/conclave/agents/{name}.md -->\n\n"
        + text
    )


def main() -> int:
    (OUT / ".cursor-plugin").mkdir(parents=True, exist_ok=True)
    (OUT / "commands").mkdir(exist_ok=True)
    (OUT / "agents").mkdir(exist_ok=True)
    (OUT / "hooks").mkdir(exist_ok=True)
    (OUT / "scripts").mkdir(exist_ok=True)

    manifest = {
        "name": "conclave-cursor",
        "version": "0.12.0",
        "description": (
            "Conclave Scrum for Cursor — same conclave/ contract as the Claude Code "
            "plugin. Twelve slash commands, seven role agents, synced methodology and templates."
        ),
        "author": {"name": "Conclave"},
        "keywords": [
            "scrum",
            "agile",
            "sprint",
            "spec-driven",
            "team-coordination",
            "subagents",
            "conclave",
        ],
        "license": "MIT",
    }
    (OUT / ".cursor-plugin/plugin.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )

    for name in AGENT_DESC:
        src = (ROOT / "skills/conclave/agents" / f"{name}.md").read_text(encoding="utf-8")
        (OUT / "agents" / f"{name}.md").write_text(
            transform_agent(src, name), encoding="utf-8"
        )
        print(f"agent {name}")

    for path in sorted((ROOT / "commands").glob("conclave-*.md")):
        out = transform_command(path.read_text(encoding="utf-8"), path.stem)
        (OUT / "commands" / path.name).write_text(out, encoding="utf-8")
        print(f"command {path.name}")

    (OUT / "hooks/hooks.json").write_text(
        json.dumps(
            {
                "hooks": {
                    "afterFileEdit": [
                        {"command": "./scripts/regenerate-board-data.sh"}
                    ]
                }
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    hook = (OUT / "scripts/regenerate-board-data.sh")
    if not hook.exists():
        print("warning: regenerate-board-data.sh missing — keep existing or copy from prior run", file=sys.stderr)

    print(f"Cursor package written under {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
