# ADR-002: Dual-Platform Conclave — Claude Code + Cursor via Parallel Plugin Tree

- **Status**: accepted
- **Date**: 2026-07-17
- **Deciders**: Giolabs
- **Tags**: cursor, claude-code, dual-platform, packaging, orchestration, conclave
- **Stack**: Claude Code plugin (markdown commands + prose-orchestrated subagents) at repo root; Cursor plugin package under `platforms/cursor/` (`.cursor-plugin/` manifest, commands, agents, skills, hooks). Shared methodology and templates remain canonical under `skills/conclave/`. No application runtime for plugin logic. Docs site: Next.js 16 + Nextra 4 (`site/`).
- **Implements**: `docs/specs/conclave-cursor-adaptation/spec.md`

## Context

Conclave today is a **Claude Code–only** plugin: slash commands live in root `commands/`, role charters in `skills/conclave/agents/`, templates in `skills/conclave/templates/`, methodology in `skills/conclave/SKILL.md`, and packaging in `.claude-plugin/`. Target-repo state is the shared `conclave/` markdown contract (`SKILL.md` §2).

Teams also run **Cursor**, which now has a first-class plugin model (`.cursor-plugin/plugin.json`, skills, agents, commands, hooks — see Cursor Plugins Reference). Cursor loads Agent Skills (including Claude-compatible skill dirs for compatibility) and can dispatch focused subagents (`Task` / custom agents). Without a Cursor package, Conclave users on Cursor cannot run the same Scrum loop against the same `conclave/` artifacts.

Constraints from product intent:

1. **Work on both Claude Code and Cursor** — same methodology, same target `conclave/` contract.
2. **Do not break the existing Claude Code plugin** (v0.10.0) — root `commands/`, `.claude-plugin/`, and Claude-specific orchestration stay intact.
3. **Full command/charter parity on day one** — all 11 shipped commands and 7 role charters available on Cursor, not a toy subset.
4. **Parallel tree (duplication of orchestration)** — Cursor gets its own adapted command/agent prose; do not overload root `commands/` with platform conditionals that risk Claude Code regressions.
5. **Methodology stays single-sourced** — Cursor must not fork `SKILL.md` into a divergent long-term source of truth (marketplace forbids `..` in manifest paths, so “point at `../../skills/conclave`” is not a valid install layout).

## Decision

Ship Conclave as **two installable packages from one repository**, versioned in lockstep:

### 1. Claude Code package (unchanged root layout)

Keep today’s layout as the Claude Code plugin:

- `.claude-plugin/plugin.json` + `marketplace.json` — name `conclave`
- `commands/*.md`, `skills/conclave/**`, `hooks/` — Claude Code orchestration (`Agent`, `AskUserQuestion`, `allowed-tools`, `${CLAUDE_PLUGIN_ROOT}`)

Additive, backward-compatible schema only (optional `runtime` on `config.md` — see below). No behavioral rewrite of existing Claude Code commands for this ADR.

### 2. Cursor package — parallel tree at `platforms/cursor/`

New plugin package:

```
platforms/cursor/
├── .cursor-plugin/plugin.json     # name: conclave-cursor, version lockstep with Claude Code
├── commands/                      # Cursor-adapted copies of all 11 conclave-*.md commands
├── agents/                        # 7 role charters with Cursor agent frontmatter
├── skills/conclave/
│   ├── SKILL.md                   # synced copy of canonical skills/conclave/SKILL.md
│   └── templates/                 # synced copy of canonical templates/
├── hooks/hooks.json               # best-effort map of board regenerate hook
├── scripts/                       # board regenerate script (path-adapted)
└── README.md                      # Cursor install / local path instructions
```

Plugin **name** is `conclave-cursor` so local/multi-marketplace installs do not collide with Claude Code’s `conclave`. Product branding remains “Conclave.”

### 3. Canonical methodology + templates; sync on release

- **Source of truth**: `skills/conclave/SKILL.md` and `skills/conclave/templates/**` (Claude Code tree).
- **Cursor copies**: produced by `scripts/sync-cursor-platform.sh` (checked into the Cursor tree; CI/release runs the script and fails if the tree is stale).
- Commands and agent charters are **not** byte-identical copies — they are **ported** to Cursor primitives (see mapping table). Role *intent* stays aligned with the Claude Code charters; wording may differ where the tool surface differs.

### 4. Shared `conclave/` contract with one optional extension

Target-repo `conclave/` remains the coordination surface for **both** runtimes.

- Core schema, paths, state machine, and invariants (`SKILL.md` §2) stay identical.
- **Allowed Cursor-aware extension** (optional, additive):

```yaml
# conclave/config.md frontmatter — optional
runtime: both   # claude-code | cursor | both — informational; unset = either runtime OK
```

No generation of target-repo `.cursor/` rules/skills as part of Conclave’s artifact contract (avoids locking teams to one IDE). Teams may still add their own Cursor config; Conclave does not own it.

### 5. Primitive mapping (Claude Code → Cursor)

| Claude Code | Cursor equivalent | Notes / gaps |
|---|---|---|
| Slash command `commands/conclave-*.md` + `allowed-tools` | `platforms/cursor/commands/conclave-*.md` with Cursor command frontmatter (`name`, `description`); drop `allowed-tools` | Cursor permissions are session/sandbox policy, not Conclave frontmatter |
| `Agent` tool + charter path as system prompt | `Task` / custom agent from `platforms/cursor/agents/<role>.md` (frontmatter `name`/`description` + body charter) | Same concurrent-batch pattern: ≤ 3 parallel Task calls per message where Cursor supports it; document if runtime serializes |
| `AskUserQuestion` | Prefer Cursor **`AskQuestion`** in top-level Agent chat; fall back to numbered chat options inside `Task`/subagent contexts | Subagents cannot call AskQuestion — escalate or list options |
| `.claude-plugin/` | `.cursor-plugin/` under `platforms/cursor/` | Separate package identity |
| `hooks` `PostToolUse` + `Write\|Edit` + `${CLAUDE_PLUGIN_ROOT}` | `afterFileEdit` (or closest available) + relative `scripts/` under the Cursor package | **Best-effort** — if the event or matcher cannot express “only conclave/ writes,” document degradation; board command still works via explicit `/conclave-board` |
| Plugin install symlink `~/.claude/plugins/conclave` | **Primary:** `rsync`/`cp -R` of `platforms/cursor/` → `~/.cursor/plugins/local/conclave-cursor/` + Reload Window. Symlink to the repo is optional and may be rejected when the target is outside `plugins/local` | Cursor Marketplace publish is **out of this phase** |

### 6. Versioning

When the Cursor package ships, bump **both** packages to the same semver (first dual-platform release: **0.11.0**). `conclave_version` in `config.template.md` follows the same bump. Claude Code and Cursor packages must not advertise different Conclave versions in the same git tag.

### 7. Docs

Update `README.md`, `CHANGELOG.md`, `skills/conclave/SKILL.md` (platform-neutral wording where it claims “Claude Code only”), and `site/content/{en,es}/` with Cursor install + dual-runtime notes (`installation.mdx`, `getting-started.mdx`, optionally a short `platforms.mdx`).

## Alternatives Considered

| Option | Pros | Cons | Why not |
|--------|------|------|---------|
| Shared-core + thin adapters (conditional prose in one command tree) | Single edit surface for ceremony logic | High regression risk on Claude Code; hard to keep `allowed-tools` / AskUserQuestion / Agent vs Task coherent | Rejected — explicit choice was parallel tree to protect Claude Code |
| Full duplication including forked `SKILL.md` forever | Simple packaging | Methodology drift between platforms | Rejected — sync-from-canonical required |
| Symlink `platforms/cursor/skills/conclave` → `../../skills/conclave` | Live single tree | Breaks on Windows; Cursor marketplace checklist forbids `..`; fragile installs | Rejected for packaging; sync script instead |
| Cursor-native rewrite as primary; Claude Code secondary | Cursor-first DX | Breaks existing Claude Code users and install docs | Rejected — “do not break Claude Code” is a hard constraint |
| Subset vertical slice first (`init` only) | Faster learning | User required full parity day one | Rejected by scope decision |
| Separate git repository for Cursor | Cleaner marketplace boundary | Dual-maintenance, version skew | Rejected — same-repo local install preferred this phase |

## Trade-offs

- **Parity vs. drift**: duplicating 11 commands + 7 agents means ceremony bugfixes may need two edits. Mitigated by: (a) templates/`SKILL.md` single-sourced via sync script, (b) a release checklist item “port landed on both trees,” (c) keeping behavior deltas limited to primitive mapping, not methodology.
- **Structured questions**: Cursor lacks a guaranteed `AskUserQuestion` equivalent — interactive UX is slightly worse; autonomous mode and explicit option lists compensate.
- **Hooks**: board auto-regenerate may be less precise on Cursor than Claude Code’s `PostToolUse` matcher — acceptable if `/conclave-board` remains authoritative.
- **Package name `conclave-cursor`**: clearer installs, slightly more branding explanation in docs.

## Technical Gaps

- [ ] Confirm Cursor `Task` concurrency semantics for ≤ 3 parallel role dispatches (document serial fallback if needed). — Owner: implementer during port
- [ ] Confirm exact Cursor hook event + matcher for board regenerate; map or document no-op. — Owner: implementer
- [ ] `scripts/sync-cursor-platform.sh` + CI check that Cursor `skills/conclave/{SKILL.md,templates}` match canonical. — Owner: implementer
- [ ] Manual dual-runtime smoke matrix (Claude Code + Cursor) against one shared target `conclave/`. — Owner: implementer / maintainer

## Consequences

- Teams can run `/conclave-*` on Claude Code **or** Cursor against the **same** `conclave/` directory (mixed-team OK: one member on each runtime).
- Claude Code plugin behavior at v0.10.0 remains the baseline; 0.11.0 adds Cursor package + optional `runtime` field only on the Claude Code side.
- Future ceremony changes that touch templates or `SKILL.md` must run the sync script; command/agent ports must be updated in both trees when behavior changes.

## Related

- Spec: `docs/specs/conclave-cursor-adaptation/spec.md`
- Precedent ADR: `docs/adr/ADR-001-discipline-based-roles-and-solo-team-setup.md`
- Cursor docs: Plugins Reference, Agent Skills
