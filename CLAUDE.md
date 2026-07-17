# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This repository **is** the Conclave plugin — it is not a project that *uses* Conclave. Conclave brings Scrum methodology to distributed engineering teams: every Scrum role (Product Manager, Tech Lead, Scrum Master, Developer, QA) is a markdown-defined subagent charter, invoked by slash commands, that reads/writes plain-markdown Scrum artifacts inside a `conclave/` directory in whatever *target* repo the plugin is installed into.

There are three things living in this repo:
1. **The Claude Code plugin** — `commands/`, `skills/conclave/`, `.claude-plugin/` (plugin logic).
2. **The Cursor plugin** — `platforms/cursor/` (`conclave-cursor`; synced methodology via `scripts/sync-cursor-platform.sh`). See ADR-002.
3. **The docs site** — `site/` (Next.js 16 + Nextra 4, single locale pair EN/ES, static export to GitHub Pages at `https://giolabs.github.io/conclave/`, basePath `/conclave`).

## Repo layout

```
commands/                        # Claude Code slash commands
platforms/cursor/                # Cursor package (conclave-cursor)
skills/conclave/
  SKILL.md                       # the methodology spec — read this first (canonical; synced to Cursor)
  agents/                        # Claude Code role charters
  templates/                     # *.template.md — shared via sync to Cursor
docs/
  adr/                           # Architecture Decision Records
  specs/                         # implementation specs
scripts/
  sync-cursor-platform.sh        # canonical skills → platforms/cursor
  install-cursor-local.sh        # rsync Cursor package into ~/.cursor/plugins/local/
  generate-cursor-platform.py    # re-port commands/agents for Cursor
site/                            # Nextra docs site
CHANGELOG.md
.claude-plugin/                  # Claude Code manifest
```

## Development commands

There is no build/lint/test step for the plugin itself — `commands/` and `skills/` are markdown consumed directly by Claude Code. Validate changes by installing the plugin locally and exercising the slash commands:

```bash
ln -s "$(pwd)" ~/.claude/plugins/conclave   # symlink install, then restart Claude Code
```

### Docs site (`site/`)

```bash
cd site
npm run dev       # local dev server
npm run build     # static export to site/out
```

`site/` pins `nextra`/`nextra-theme-docs` to an exact version (`4.5.1`) and ships a `patch-package` fix (`site/patches/`) for a known upstream Zod-validation bug in `Layout` — do not bump those two packages without re-checking whether the patch is still needed. The site auto-deploys to GitHub Pages via `.github/workflows/deploy-docs.yml` on push to `main` when files under `site/**` change.

## Release notes and doc updates

**Every change to this repo must be accompanied by a `CHANGELOG.md` entry** (under `[Unreleased]`, following the existing Keep-a-Changelog-style format) describing what changed and why, from the perspective of someone installing or upgrading the plugin.

In addition, check whether the change affects anything described in these places, and update them if so:
- `skills/conclave/SKILL.md` — the methodology spec (role/discipline model, directory contract, ceremony rules).
- `README.md` — install instructions, quick start, shipped-commands list.
- `site/content/**/*.mdx` — the docs site. If a slash command's steps, a role charter's responsibilities, or the `conclave/config.md`/`roster.md`/story-frontmatter schema changes, the corresponding page (`commands/*.mdx`, `roles.mdx`, `configuration.mdx`, `state-machine.mdx`, `workflow.mdx`) needs the same update — these pages are hand-written prose, not generated, so nothing enforces this automatically.

Do not skip the CHANGELOG entry for "small" changes — an incomplete changelog is worse than a verbose one.

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
