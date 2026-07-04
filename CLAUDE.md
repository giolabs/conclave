# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This repository **is** the Conclave Claude Code plugin — it is not a project that *uses* Conclave. Conclave brings Scrum methodology to distributed engineering teams: every Scrum role (Product Manager, Tech Lead, Scrum Master, Developer, QA) is a markdown-defined subagent charter, invoked by slash commands, that reads/writes plain-markdown Scrum artifacts inside a `conclave/` directory in whatever *target* repo the plugin is installed into.

This repo contains just the plugin itself — `commands/`, `skills/conclave/` (plugin logic, this is the product). There is no docs site currently (a prior Astro/Nextra docs site under `site/` was removed; if one is reintroduced, document it here).

## Repo layout

```
commands/                        # slash commands (/conclave-init, /conclave-spec, /conclave-planning, /conclave-dev, /conclave-qa, /conclave-pr-review)
skills/conclave/
  SKILL.md                       # the methodology spec — read this first, it's the source of truth for the whole system
  agents/                        # role charters: product-manager.md, tech-lead.md, scrum-master.md, developer.md, qa.md
  templates/                     # *.template.md files with {{placeholders}} filled in by commands when writing artifacts
docs/
  adr/                           # Architecture Decision Records
  specs/                         # implementation specs
.claude-plugin/
  plugin.json                    # plugin manifest (name, version, description)
  marketplace.json               # marketplace listing metadata
```

## Development commands

There is no build/lint/test step for this plugin — `commands/` and `skills/` are markdown consumed directly by Claude Code. Validate changes by installing the plugin locally and exercising the slash commands:

```bash
ln -s "$(pwd)" ~/.claude/plugins/conclave   # symlink install, then restart Claude Code
```

## Architecture

### The core pattern: prose-orchestrated subagents

There is no orchestration DSL. A slash command is a markdown file with numbered steps in its body. When a step says "spawn a subagent loaded with `skills/conclave/agents/tech-lead.md`," Claude reads that role-charter file and dispatches an `Agent` tool call using its full content as system-prompt context, then continues once the subagent returns. Two role subagents can run concurrently by issuing both `Agent` calls in the same message (e.g. PM + TL in `/conclave-spec`).

Role charters (`skills/conclave/agents/*.md`) have **no frontmatter** — pure prose, loaded by name/path from command bodies. This is the same pattern used by the `code-review` and `skill-creator` skills elsewhere in the Claude Code ecosystem.

### Templates

All generated artifacts come from `skills/conclave/templates/*.template.md`. Commands read a template, substitute `{{placeholders}}`, and write the result into the target repo's `conclave/` directory. When adding a new artifact type, add its template here first, then reference it from the command/skill prose.

### The `conclave/` directory contract (in target repos, not this repo)

Commands read/write a `conclave/` directory at the root of whatever repo the plugin is installed into:

```
conclave/
├── config.md              # team_profile: lean | full-scrum | custom, plus per-ceremony required: flags
├── team/roster.md, ceremonies.md
├── product/backlog.md, architecture.md, definition-of-ready.md, definition-of-done.md
├── context/                # frozen snapshots (CLAUDE.md, skills inventory, rules) for auditability
└── sprints/SPRINT-NNN/meta.md, spec.md, stories/US-NNN-*.md, acceptance/AC-US-NNN.md
```

Invariants any command touching this directory must respect (defined in `skills/conclave/SKILL.md`):
- Markdown only — structured data goes in YAML frontmatter, never JSON/SQLite/binary.
- Append, don't clobber — a second `/conclave-spec` run creates `SPRINT-002/`, doesn't overwrite `SPRINT-001/`.
- Every artifact-generating command snapshots its inputs to `conclave/context/`.
- `SPRINT-NNN` / `US-NNN` IDs increment monotonically and are never reused.

### Team profiles and the two structural gates

`conclave/config.md` sets `team_profile: lean | full-scrum | custom`, which toggles ceremonies (standup, grooming, peer PR review, sprint review, retro) on/off. Two gates are **structurally required and cannot be turned off** regardless of profile:
- **Sprint Planning** (`/conclave-planning`) — no sprint exists without a locked goal + story list.
- **QA Verification** (`/conclave-qa`) — every `done` story must carry a verification report.

These two gates are separate from **Tech Lead PR approval** (`/conclave-pr-review`), which only runs when `ceremonies.peer_pr_review.required: true`. QA never runs `gh pr review --approve`; only the TL does. Story status flow:

```
backlog → ready → in-progress → review → [verified] → done
```
`review → verified` happens only when peer PR review is required (QA passed, awaiting TL); `review → done` is direct otherwise. Any failure sends the story back to `review`.

### Adding a new slash command

1. Write `commands/conclave-<name>.md` with YAML frontmatter (`description`, `allowed-tools` — an explicit allowlist of exactly the Bash subcommands / tools needed) followed by numbered-step prose.
2. If it needs a new role behavior, add or extend a charter in `skills/conclave/agents/`.
3. If it produces a new artifact, add a template in `skills/conclave/templates/`.
4. Update the table in `skills/conclave/SKILL.md` section 3 (role-to-subagent mapping) and section 5 (templates list) so future commands/agents stay discoverable from the single source-of-truth skill file.
