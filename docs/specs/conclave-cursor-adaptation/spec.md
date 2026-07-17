# Conclave on Cursor — Dual-Platform Full Parity

> **Status:** PENDING PROPOSAL/CHANGE — no OpenSpec change has been generated yet. Run `/openspec-propose` (or `/opsx:propose`) using this spec as input.

Architecture decision: `docs/adr/ADR-002-cursor-platform-adaptation.md` (proposed). This spec implements that ADR.

## 1. Objetivo *(Goal)*

Make Conclave runnable on **both Claude Code and Cursor** against the **same** target-repo `conclave/` markdown contract, without regressing the existing Claude Code plugin (v0.10.0 → 0.11.0).

Ship a second installable package under `platforms/cursor/` (`conclave-cursor`) with **full parity** of all eleven shipped slash commands and all seven role charters on day one. Methodology (`SKILL.md`) and artifact templates stay single-sourced under `skills/conclave/` and are synced into the Cursor tree on release. Teams can mix runtimes (one member on Claude Code, another on Cursor) and still coordinate via git + `conclave/`.

## 2. Alcance *(Scope)*

### Incluido en esta fase

- **ADR-002** already authored at `docs/adr/ADR-002-cursor-platform-adaptation.md` — this spec is the implementation plan that ADR references.
- **New Cursor plugin tree** at `platforms/cursor/` with `.cursor-plugin/plugin.json` (`name: conclave-cursor`, version **0.11.0** lockstep with Claude Code).
- **Port all 11 commands** into `platforms/cursor/commands/`:
  - `conclave-init`, `conclave-spec`, `conclave-planning`, `conclave-dev`, `conclave-qa`, `conclave-pr-review`, `conclave-board`, `conclave-sprint`, `conclave-story`, `conclave-adr`, `conclave-bug`
- **Port all 7 role charters** into `platforms/cursor/agents/` with Cursor agent frontmatter (`name`, `description`) + body adapted from `skills/conclave/agents/*.md`.
- **Sync script** `scripts/sync-cursor-platform.sh` that copies canonical `skills/conclave/SKILL.md` and `skills/conclave/templates/**` into `platforms/cursor/skills/conclave/`, then applies a small allowlisted patch to skill frontmatter/description so Cursor discovery works (platform-neutral wording). CI or release checklist fails if the Cursor copies are stale vs canonical.
- **Primitive mapping** in every Cursor command/agent per ADR-002 §5: `Agent` → `Task`/Cursor agents; `AskUserQuestion` → numbered options in chat; drop `allowed-tools`; hooks best-effort.
- **Optional additive field** on canonical `skills/conclave/templates/config.template.md`: `runtime: claude-code | cursor | both` (optional; unset = either OK). Synced to Cursor templates. No other `conclave/` schema breaks.
- **Board**: port `/conclave-board` command + scaffold behavior; port regenerate script under `platforms/cursor/scripts/`; wire Cursor `hooks/hooks.json` to `afterFileEdit` (or closest event) **best-effort** — if matcher fidelity is weaker than Claude Code’s `PostToolUse`, document the gap; explicit `/conclave-board` remains authoritative.
- **Docs**: `README.md` Cursor install section; `CHANGELOG.md` `[Unreleased]` → 0.11.0 notes; `skills/conclave/SKILL.md` platform-neutral intro (no longer “Claude Code only”); `site/content/{en,es}/installation.mdx`, `getting-started.mdx`, and a new `platforms.mdx` (en+es) describing dual install and the primitive map summary.
- **Version bump**: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `platforms/cursor/.cursor-plugin/plugin.json`, and `conclave_version` in `config.template.md` → **0.11.0**.
- **Smoke verification matrix** (manual) for Claude Code + Cursor on one shared target repo (see §8).

### Fuera de scope

- **Publishing to Cursor Marketplace** (`cursor.com/marketplace`) — this phase is same-repo local/path install only (explicit decision). Marketplace submission can follow in a later release once the package is proven.
- **Rewriting or behaviorally changing Claude Code commands** beyond the optional `runtime` field and platform-neutral `SKILL.md` wording. No Claude Code orchestration rewrites.
- **Shared-core / single command tree with platform conditionals** — rejected by ADR-002; parallel tree only.
- **Symlinks from Cursor tree into `../../skills/conclave`** — packaging/Windows/marketplace-unsafe; sync script instead.
- **Generating target-repo `.cursor/rules` or `.cursor/skills` as Conclave artifacts** — `conclave/` stays the only Conclave-owned contract; teams may add IDE config themselves.
- **Forking methodology** into a long-lived divergent Cursor `SKILL.md` edited by hand — edits go to canonical `skills/conclave/SKILL.md`, then sync.
- **GitLab / non-`gh` hosts**, new ceremonies, new Scrum roles, or new story state-machine values.
- **Automated unit/integration test harness for markdown commands** — none exists today; verification remains manual install + smoke (same as every prior Conclave release).
- **Changing `skills/conclave/board-app` source** — no file edits required there; scaffolding is entirely owned by the ported `platforms/cursor/commands/conclave-board.md` (same as Claude Code’s command copies the board-app into the target repo). Target `conclave-board/` continues to read the same `conclave/` contract.

## 3. Tecnologias y convenciones del proyecto *(Technologies & conventions)*

### Stack

- **Claude Code plugin (existing)**: markdown commands, prose-orchestrated `Agent` subagents, `AskUserQuestion`, `allowed-tools` frontmatter, `.claude-plugin/` packaging, hooks via `hooks/hooks.json` + `${CLAUDE_PLUGIN_ROOT}`.
- **Cursor plugin (new)**: `.cursor-plugin/plugin.json`, commands under `commands/`, agents under `agents/`, skills under `skills/<name>/SKILL.md`, hooks under `hooks/hooks.json` (Cursor events such as `afterFileEdit`). Subagent dispatch via Cursor `Task` / custom agents. Interactive prompts via numbered chat options (no `AskUserQuestion` guarantee).
- **Shared artifacts**: target-repo `conclave/` markdown + YAML frontmatter only (`SKILL.md` §2 invariants).
- **Docs site**: Next.js 16 + Nextra 4 under `site/` (unchanged stack; new/updated MDX pages only).
- **Board app**: existing `skills/conclave/board-app` (Next.js) scaffolded by `/conclave-board` as sibling `conclave-board/` in the target repo — Cursor port must produce the same scaffold contract.

### Versiones relevantes

| Dependency | Version | Source |
|---|---|---|
| Conclave Claude Code plugin | 0.10.0 → **0.11.0** | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` |
| Conclave Cursor plugin | **0.11.0** (new) | `platforms/cursor/.cursor-plugin/plugin.json` |
| `conclave_version` (per-install) | → **0.11.0** | `skills/conclave/templates/config.template.md` (synced to Cursor) |
| Cursor Plugins / Skills surface | Verified 2026-07-17 against live docs (no platform semver) | https://cursor.com/docs/reference/plugins , https://cursor.com/docs/skills , https://cursor.com/docs/plugins |
| Docs site `nextra` / `nextra-theme-docs` | 4.5.1 (unchanged) | `site/package.json` |

### Patrones existentes a respetar

- **Prose-orchestrated subagents** — Cursor commands still spell out numbered steps; no new orchestration DSL.
- **Append, don't clobber** / markdown-only / sticky IDs — unchanged across runtimes (`SKILL.md` §2).
- **Multi-ID batching ≤ 3** on `/conclave-dev` and `/conclave-qa` — preserve in Cursor port; if Cursor serializes parallel `Task` calls, document and still issue ≤ 3 per wave (correctness over wall-clock).
- **Never commit / never merge for the user** — same as every existing command.
- **Release notes + doc parity** — every change gets `CHANGELOG.md` + `SKILL.md` / `README.md` / `site/content/**` updates per `CLAUDE.md`.
- **ADR → spec** — this feature follows ADR-001’s precedent: architectural decision recorded, then implementation spec.

## 4. Dependencias previas *(Prerequisites)*

- [ ] Claude Code plugin at **v0.10.0** shipped shape: all 11 `commands/conclave-*.md`, 7 agents, templates including `bug.template.md`, hooks + board-app.
- [ ] `docs/adr/ADR-002-cursor-platform-adaptation.md` exists (this work’s architecture lock).
- [ ] Cursor IDE with Agent mode, permission to load **third-party / local plugins**, and ability to symlink into `~/.cursor/plugins/local/<name>/` (manifest at that root — see §5 install flow). On Team/Enterprise, org admin must allow local plugins (`userLocal` not forced false).
- [ ] Maintainer can run **both** Claude Code and Cursor against a scratch git repo for the §8 smoke matrix.
- [ ] `gh` available for commands that already depend on it (unchanged prerequisite for those flows on both runtimes).
- [ ] Docs site bilingual layout `site/content/{en,es}/` present (since v0.4.0).

## 5. Arquitectura *(Architecture)*

### Patron

**Dual-package, parallel orchestration trees, single methodology/templates source** (ADR-002).

```
ssd-project/                          # this repo
├── .claude-plugin/                   # Claude Code package (name: conclave)
├── commands/                         # Claude Code commands — DO NOT rewrite for Cursor
├── skills/conclave/                  # CANONICAL SKILL.md + templates + agents (Claude)
├── hooks/                            # Claude Code hooks
├── scripts/sync-cursor-platform.sh   # NEW — copies SKILL.md + templates → platforms/cursor/
└── platforms/cursor/                 # NEW Cursor package (name: conclave-cursor)
    ├── .cursor-plugin/plugin.json
    ├── commands/                     # ported commands (Cursor primitives)
    ├── agents/                       # ported charters + Cursor frontmatter
    ├── skills/conclave/              # SYNCED from canonical
    ├── hooks/ + scripts/             # board regenerate, best-effort
    └── README.md
```

Target repos stay:

```
<team-repo>/
├── conclave/           # shared contract — both runtimes read/write here
└── conclave-board/     # optional scaffold from /conclave-board (either runtime)
```

### Capas afectadas

| Layer | Affected? | Description |
|---|---|---|
| `platforms/cursor/**` | Yes (NEW) | Entire Cursor plugin package |
| `scripts/sync-cursor-platform.sh` | Yes (NEW) | Canonical → Cursor sync |
| `skills/conclave/SKILL.md` | Yes (MODIFICAR) | Platform-neutral wording; document dual runtime |
| `skills/conclave/templates/config.template.md` | Yes (MODIFICAR) | Optional `runtime` field |
| Root `commands/*.md` | No (behavior) | Untouched orchestration; Claude Code stays stable |
| `skills/conclave/agents/*.md` | No (required) | Canonical Claude charters stay; Cursor gets separate copies under `platforms/cursor/agents/` |
| `.claude-plugin/*` | Yes | Version bump 0.11.0 + marketplace blurb mentioning Cursor sibling package |
| `hooks/` (root) | No | Claude Code hooks unchanged |
| `README.md`, `CHANGELOG.md`, `site/content/{en,es}/**` | Yes | Install + platforms docs |
| `docs/adr/ADR-002-…` | Yes | Already written; status may move `proposed` → `accepted` when this ships |

### Flujo esperado — install

1. User clones/updates this repo at a release that includes `platforms/cursor/`.
2. **Claude Code**: existing symlink install `ln -s "$(pwd)" ~/.claude/plugins/conclave` (unchanged); restart Claude Code.
3. **Cursor** (local plugin under `~/.cursor/plugins/local/` — docs also mention symlinks, but **external symlink targets outside that directory are often rejected** by Cursor’s security validation; prefer a real copy for reliable loading):
   ```bash
   mkdir -p ~/.cursor/plugins/local
   rsync -a --delete "$(pwd)/platforms/cursor/" ~/.cursor/plugins/local/conclave-cursor/
   # Dev iteration alternative (may fail if Cursor rejects external symlink targets):
   # ln -s "$(pwd)/platforms/cursor" ~/.cursor/plugins/local/conclave-cursor
   ```
   Ensure `.cursor-plugin/plugin.json` sits at `~/.cursor/plugins/local/conclave-cursor/.cursor-plugin/plugin.json`. Enable **Include third-party Plugins, Skills, and other configs** if present in settings, then **Developer: Reload Window**. Re-run `rsync` after pulling Conclave updates (or after `scripts/sync-cursor-platform.sh`).
4. In a target repo, either runtime runs `/conclave-init` → writes the same `conclave/` shape (with optional `runtime` if collected).
5. Subsequent `/conclave-*` commands from either runtime mutate the same files; git is the sync point.

Document the **rsync/copy primary path**, symlink caveats, setting + reload sequence in `platforms/cursor/README.md` and `site/content/{en,es}/installation.mdx`. Optionally ship a tiny helper `scripts/install-cursor-local.sh` that wraps the rsync (listed as optional in §6 if added).

### Flujo esperado — Cursor command dispatch (example `/conclave-dev`)

1. User invokes `/conclave-dev US-001` in Cursor Agent chat.
2. Cursor loads `platforms/cursor/commands/conclave-dev.md` (or plugin-registered command).
3. Orchestrator follows the same step structure as Claude Code’s command, but:
   - Spawns role work via **Task** / `agents/developer.md` (or designer/devops per `discipline`).
   - Replaces every `AskUserQuestion` site with an explicit numbered option list in chat; waits for the user’s reply in the conversation.
   - Omits `allowed-tools`; relies on Cursor’s permission prompts.
4. Writes story frontmatter, branch, PR via `gh` — same artifacts as Claude Code.
5. Multi-ID: validate all upfront, batches of ≤ 3 Task calls per wave, failure isolation unchanged.

### Flujo esperado — sync script

1. Maintainer edits canonical `skills/conclave/SKILL.md` or `templates/*`.
2. Runs `scripts/sync-cursor-platform.sh` (or CI does).
3. Script overwrites `platforms/cursor/skills/conclave/SKILL.md` and `templates/**`.
4. Script applies allowlisted frontmatter tweaks for Cursor skill discovery (`name`, `description` mentioning Cursor + Claude Code).
5. Diff check: if Cursor tree diverges without a script run, CI fails.

### Layout de archivos nuevos

```
platforms/cursor/
  .cursor-plugin/plugin.json
  README.md
  commands/conclave-*.md          # 11 files
  agents/{product-manager,tech-lead,scrum-master,developer,designer,devops,qa}.md
  skills/conclave/SKILL.md        # synced
  skills/conclave/templates/*.template.md  # synced
  hooks/hooks.json
  scripts/regenerate-board-data.sh
scripts/sync-cursor-platform.sh
site/content/en/platforms.mdx
site/content/es/platforms.mdx
docs/adr/ADR-002-cursor-platform-adaptation.md   # already present
docs/specs/conclave-cursor-adaptation/spec.md    # this file
```

## 6. Archivos a crear o modificar *(Files to create / modify)*

| Ruta | Accion | Proposito | Ejemplo a seguir |
|---|---|---|---|
| `docs/adr/ADR-002-cursor-platform-adaptation.md` | NUEVO (done) | Architecture lock | `docs/adr/ADR-001-…` |
| `platforms/cursor/.cursor-plugin/plugin.json` | NUEVO | Cursor package manifest | `.claude-plugin/plugin.json` + Cursor Plugins Reference |
| `platforms/cursor/README.md` | NUEVO | Local install for Cursor | root `README.md` install section tone |
| `platforms/cursor/commands/conclave-*.md` | NUEVO ×11 | Cursor-adapted commands | root `commands/conclave-*.md` step structure |
| `platforms/cursor/agents/*.md` | NUEVO ×7 | Cursor agents + frontmatter | `skills/conclave/agents/*.md` body + Cursor agent frontmatter |
| `platforms/cursor/skills/conclave/**` | NUEVO (synced) | Methodology + templates | canonical `skills/conclave/` |
| `platforms/cursor/hooks/hooks.json` | NUEVO | Best-effort board regenerate | root `hooks/hooks.json` mapped to Cursor events |
| `platforms/cursor/scripts/regenerate-board-data.sh` | NUEVO | Board data regen | `hooks/regenerate-board-data.sh` |
| `scripts/install-cursor-local.sh` | NUEVO (optional but recommended) | Wraps `rsync` into `~/.cursor/plugins/local/conclave-cursor/` | — |
| `skills/conclave/SKILL.md` | MODIFICAR | Dual-runtime wording + pointer to Cursor package | existing sections 1–5 style |
| `skills/conclave/templates/config.template.md` | MODIFICAR | Optional `runtime` field | existing frontmatter fields |
| `.claude-plugin/plugin.json` | MODIFICAR | 0.11.0 + description note | current file |
| `.claude-plugin/marketplace.json` | MODIFICAR | 0.11.0 + Cursor mention | current file |
| `README.md` | MODIFICAR | Cursor install + dual-runtime | existing install section |
| `CHANGELOG.md` | MODIFICAR | 0.11.0 / Unreleased entry | Keep-a-Changelog style |
| `site/content/en/installation.mdx` | MODIFICAR | Cursor path install | existing Claude Code instructions |
| `site/content/es/installation.mdx` | MODIFICAR | Spanish counterpart | en page |
| `site/content/en/getting-started.mdx` | MODIFICAR | Mention either runtime | existing |
| `site/content/es/getting-started.mdx` | MODIFICAR | Spanish counterpart | en page |
| `site/content/en/platforms.mdx` | NUEVO | Dual-platform page | `methodology.mdx` tone |
| `site/content/es/platforms.mdx` | NUEVO | Spanish counterpart | en page |
| `site/content/en/_meta.js` / `es/_meta.js` | MODIFICAR | Nav entry for platforms | existing `_meta.js` |

### Detalle por archivo

#### `platforms/cursor/.cursor-plugin/plugin.json`

- **Responsabilidad**: Cursor package identity (`conclave-cursor`, version `0.11.0`, description, optional keywords). Point `skills`/`commands`/`agents`/`hooks` at default folders inside `platforms/cursor/` (no `..` paths).
- **Ejemplo a seguir**: `.claude-plugin/plugin.json` for metadata tone; Cursor Plugins Reference for required fields.
- **No mezclar**: Claude Code marketplace fields; do not set paths outside `platforms/cursor/`.

#### `platforms/cursor/commands/conclave-*.md` (each)

- **Responsabilidad**: Same ceremony outcomes as the Claude Code twin. Replace tool names per ADR-002 mapping table. Keep step numbering and guardrails. Use paths relative to the Cursor package for agents (`agents/developer.md`) and synced templates (`skills/conclave/templates/...`).
- **Ejemplo a seguir**: the matching root `commands/conclave-*.md`.
- **No mezclar**: Claude-only tool names left unmapped; do not invent new ceremony behavior.

#### `platforms/cursor/agents/*.md`

- **Responsabilidad**: Same role mindset/inputs/outputs as Claude charters; add Cursor YAML frontmatter (`name`, `description`). Adjust any “spawned via Agent tool” wording to Task/custom-agent language.
- **Ejemplo a seguir**: `skills/conclave/agents/<same>.md`.
- **No mezclar**: methodology that belongs in `SKILL.md`; do not change Definition of Done semantics.

#### `scripts/sync-cursor-platform.sh`

- **Responsabilidad**: Idempotent copy of `SKILL.md` + `templates/` into `platforms/cursor/skills/conclave/`; apply allowlisted frontmatter patch; exit non-zero if destinations missing or copy fails. Optionally support `--check` mode for CI (diff only).
- **Ejemplo a seguir**: other repo shell scripts’ strict `set -euo pipefail` style if present; otherwise keep the script small and boring.
- **No mezclar**: copying `agents/` or `commands/` (those are hand-ported, not synced).

#### `skills/conclave/templates/config.template.md`

- **Responsabilidad**: Document optional `runtime` field; default omit or `both` when `/conclave-init` on either platform asks (or skip asking — unset is fine).
- **Ejemplo a seguir**: existing optional blocks (`models:`, `commands.dev.interactive`).
- **No mezclar**: required new fields that would break old installs’ parsers — keep optional.

#### Root Claude Code `commands/` + `skills/conclave/agents/`

- **Responsabilidad**: unchanged behavior.
- **No mezclar**: Cursor Task wording, Cursor hook events, or `#ifdef`-style platform branches.

## 7. API Contract

Sin API surface -- no aplica.

No HTTP API is introduced. Optional integrations remain the same CLIs already used (`gh`, git) and optional MCP tools already referenced by existing commands (e.g. `/conclave-bug`). No `api-contract.md` file is created for this spec.

## 8. Criterios de exito *(Success criteria)*

- [ ] `platforms/cursor/` installs in Cursor and exposes all 11 `/conclave-*` commands (or skill-invoked equivalents with the same names).
- [ ] Running `/conclave-init` on Cursor produces a `conclave/` tree accepted by Claude Code’s `/conclave-spec` (and vice versa) without migration.
- [ ] Smoke path on **Cursor**: `init → spec → planning → dev → qa` (and `pr-review` if `peer_pr_review.required`) completes against a scratch repo.
- [ ] Smoke path on **Claude Code** after 0.11.0 bump: same ceremony path still works (no regression).
- [ ] Mixed runtime: init on Claude Code, `dev` on Cursor (or reverse) on the same `conclave/` without schema errors.
- [ ] `scripts/sync-cursor-platform.sh --check` passes in CI (or release checklist) when trees match; fails when canonical templates change without sync.
- [ ] Board: `/conclave-board` on Cursor scaffolds usable `conclave-board/`; hook either regenerates data or documented degradation is present in `platforms/cursor/README.md`.
- [ ] Docs site builds (`cd site && npm run build`) with new `platforms.mdx` pages linked from `_meta.js`.
- [ ] Version strings are **0.11.0** in both package manifests and `conclave_version`.
- [ ] Root Claude Code command files have **no** Cursor-specific orchestration edits (verify via diff review).

### Tests requeridos

| Test file | Scenarios |
|---|---|
| *(none — markdown plugin)* | Manual smoke matrix below replaces automated tests, matching prior Conclave releases |

### Comandos de verificacion

```bash
# Sync freshness
./scripts/sync-cursor-platform.sh --check

# Docs site
cd site && npm run build

# Claude Code (existing install path)
ln -s "$(pwd)" ~/.claude/plugins/conclave   # if not already; restart Claude Code
# In scratch target repo:
# /conclave-init → /conclave-spec → /conclave-planning → /conclave-dev US-001 → /conclave-qa US-001

# Cursor — preferred reliable local install (copy, not external symlink)
mkdir -p ~/.cursor/plugins/local
rsync -a --delete "$(pwd)/platforms/cursor/" ~/.cursor/plugins/local/conclave-cursor/
# Then: enable third-party plugins if required → Developer: Reload Window
# Repeat the same slash-command smoke path in Cursor Agent chat

# Mixed:
# Init on Claude Code, then /conclave-dev US-001 on Cursor (clean tree, same clone)

# Org-blocked local plugins (Team/Enterprise):
# If plugins never appear after correct rsync + reload, check Cursor logs for userLocal=false
# and ask the org admin to allow local/third-party plugins — do not treat as a Conclave packaging bug.
```

## 9. Criterios de UX *(UX criteria)*

### Loading

Cursor commands print the same progress conventions as Claude Code twins where applicable (model summary line when `models:` present; batch summary tables for multi-ID). Before long Task waves, print which IDs are in the current batch.

### Formularios

Prefer Cursor’s structured **`AskQuestion` tool** when the orchestrating `/conclave-*` command is running in the **top-level Agent chat** (Cursor docs expose AskQuestion there). Fall back to an explicit **numbered option list** in chat when AskQuestion is unavailable (e.g. inside a `Task`/subagent context that cannot call it — only escalate-to-parent works). Include defaults in the prompt text. Do not proceed until the user answers; autonomous mode still applies documented defaults / `AUTONOMOUS_ABORT` with no prompts.

### Passwords

No aplica — no new credential collection; `gh` auth remains session-level.

### Errores

Reuse Claude Code refusal strings where behavior is identical (dirty tree, missing `conclave/config.md`, invalid ID prefix). Add Cursor-specific notes only when a primitive is unavailable (e.g. hook not firing): one-line degradation message, never a crash.

### Navegacion

No aplica — Agent chat / slash invocation only. Docs site gains a Platforms page linked from installation.

### Accesibilidad

No aplica — text-only agent interaction, same as existing Conclave commands.

## 10. Decisiones tomadas *(Decisions made — locked)*

| Decision | Why |
|---|---|
| **ADR + implementation spec** (not ADR-only) | User chose full dual-runtime delivery, not planning-only |
| **Full parity day one** (11 commands + 7 charters) | Explicit user decision — subset vertical slice rejected |
| **Parallel Cursor tree** under `platforms/cursor/` | Protects Claude Code from conditional orchestration; user chose duplication of orchestration |
| **Package name `conclave-cursor`** | Avoids install-name collision with Claude Code `conclave` |
| **Do not break Claude Code** — no behavioral rewrite of root commands | Hard user constraint |
| **Canonical `SKILL.md` + templates**; Cursor gets **synced copies** via script | Honors single methodology source without illegal `..` manifest paths |
| **Optional `runtime` field only** as Cursor-aware schema extension | Keeps `conclave/` shared; rejects generating `.cursor/` in target repos |
| **Same-repo local install**; Marketplace publish later | Explicit distribution decision for this phase |
| **Map primitives; document gaps** (`AskUserQuestion` → Cursor `AskQuestion` when available, else numbered options; hooks best-effort; local install via `rsync` into `~/.cursor/plugins/local/`) | Prefer working dual runtime over blocking on missing 1:1 APIs; external symlinks are unreliable on Cursor today |
| **Lockstep semver 0.11.0** for both packages | One product version across runtimes |
| **Board included; hooks best-effort** | Parity for the command users see; honest about event-model differences |

## 11. Edge cases

### Datos invalidos

- Unknown `runtime` value if present: warn once, treat as unset (either runtime OK) — never refuse the whole command for a cosmetic field.
- Cursor command invoked without the Cursor plugin installed: Cursor simply won’t resolve `/conclave-*`; docs must show the local-install step first.
- **External symlink install rejected**: if the user only symlinked `platforms/cursor` into `~/.cursor/plugins/local/` and Cursor logs `symlink target ... is outside .../plugins/local`, treat as expected platform limitation — instruct `rsync`/`cp -R` per §5; not a Conclave bug.

### API errors

No aplica for a first-party HTTP API. `gh` / git failures: same degradation patterns as the Claude Code twins (print prepared command, leave local markdown valid).

### Sin conexion

Artifact writes remain offline-capable. Network needed only for `gh` / remote git / optional MCP — same as today.

### Timeout

Cursor `Task` calls inherit session timeouts; no new Conclave numeric timeout except existing ones already defined (e.g. QA CI-wait). If a Task hangs, user cancels; orchestrator should not invent a second timeout layer.

### Respuesta vacia o inesperada

If the user replies to a numbered prompt / AskQuestion with an unparseable answer: re-ask once with the option list; on second failure, refuse with a clear message (interactive mode) or `AUTONOMOUS_ABORT` (autonomous mode) matching the twin’s abort posture.

### Doble submit

Same as Claude Code: dirty-tree guard and `in-progress` branch checks prevent double-claiming a story. Two runtimes racing on the same story without pulling remain a git-coordination problem (unchanged philosophy — no lock server).

### Org-admin block (Team / Enterprise)

On managed Cursor accounts, org policy can disable local/third-party plugins (`userLocal=false` in Cursor plugin logs). Correct `rsync` + reload still yields **zero** Conclave commands. Surface in docs and `platforms/cursor/README.md`: ask the org admin to allow local plugins; Conclave cannot bypass this. Smoke-matrix failures in this situation are environment blocks, not packaging defects.

## 12. Estados de UI requeridos *(Required UI states)*

No aplica — no graphical UI in the plugin packages. Story/bug `status` machine unchanged (`state-machine.mdx`). Board UI remains the existing Next.js scaffold, not redesigned here.

## 13. Validaciones *(Validations)*

### Validaciones de cliente

| Campo | Regla | Mensaje |
|---|---|---|
| `runtime` (optional) | If set, must be `claude-code \| cursor \| both` | Warn + ignore if invalid |
| Story/bug IDs | Same `US-NNN` / `BUG-NNN` rules as Claude Code twins | Same refusal strings |
| Sync check | Cursor `skills/conclave` must match canonical after script | `sync-cursor-platform.sh --check` failure output |

### Validaciones de servidor

No aplica — no server of this plugin’s own.

## 14. Seguridad y permisos *(Security & permissions)*

- **Secrets**: unchanged — `testing-environments.md` stores names not values; no new secret fields.
- **Sensitive payloads**: same visibility as existing `conclave/` commits.
- **Permission checks**: Cursor may prompt for shell/network permissions per its sandbox — commands must not assume Claude Code’s `allowed-tools` allowlist exists.
- **401/403 flow**: only via `gh`/git as today; no new auth layer.

## 15. Observabilidad y logging *(Observability & logging)*

- **Log**: runtime package in use (Cursor vs Claude Code) can be inferred from which command tree is executing; print batch tables and refusal reasons via terminal/chat as today.
- **Never log**: tokens, `gh` auth material, raw MCP secrets — same posture.
- **Mechanism**: plain agent/terminal output; no new telemetry SDK.

## 16. i18n / textos visibles *(i18n / user-facing copy)*

Plugin command/agent prose remains **English** (existing convention).

Docs site (bilingual) gains/updates:

| Key / page | Texto |
|---|---|
| `site/content/en/platforms.mdx` | Dual-platform overview + install pointers |
| `site/content/es/platforms.mdx` | Spanish translation of the above |
| `installation.mdx` en/es | Add Cursor local-path install steps |
| `getting-started.mdx` en/es | “Claude Code or Cursor” wording |

No in-app i18n framework applies to plugin markdown.

## 17. Performance

- Sync script is O(templates count) file copy — negligible.
- Multi-ID waves remain ≤ 3 concurrent Tasks; if Cursor runs them serially, wall-clock increases but correctness/isolation rules stay.
- No new caching layer.

## 18. Restricciones *(Restrictions / hard "do not" rules)*

The implementer must NOT:

- [ ] Modify root `commands/*.md` orchestration to add Cursor branches or `#if cursor` prose.
- [ ] Put `..` paths in `platforms/cursor/.cursor-plugin/plugin.json`.
- [ ] Edit `platforms/cursor/skills/conclave/SKILL.md` or templates by hand as a long-term source of truth — change canonical files, then sync.
- [ ] Publish to Cursor Marketplace as part of this phase’s required deliverables.
- [ ] Generate Conclave-owned `.cursor/` artifacts inside target repos.
- [ ] Change the story/bug state machine or invent Cursor-only ceremony statuses.
- [ ] Skip `CHANGELOG.md` / docs site updates required by `CLAUDE.md`.
- [ ] Ship mismatched versions between `.claude-plugin` and `platforms/cursor/.cursor-plugin`.
- [ ] Remove or weaken Claude Code install docs while adding Cursor docs.

## 19. Entregables *(Deliverables)*

- [ ] ADR-002 present and referenced (status `accepted` when the implementation merges, or left `proposed` until merge — implementer updates on ship).
- [ ] Complete `platforms/cursor/` package with 11 commands, 7 agents, synced skill/templates, hooks/scripts, README.
- [ ] `scripts/sync-cursor-platform.sh` with `--check` mode.
- [ ] Optional `runtime` on `config.template.md`; platform-neutral `SKILL.md` edits.
- [ ] Version **0.11.0** on both manifests + `conclave_version`.
- [ ] `README.md`, `CHANGELOG.md`, site EN/ES installation/getting-started/platforms pages + `_meta.js`.
- [ ] Manual smoke matrix (§8) executed on Claude Code and Cursor; results noted in PR description.
- [ ] No `api-contract.md` (N/A).

## 20. Checklist final para el agente *(Final agent checklist)*

Before delivering, verify:

- [ ] Read this spec and ADR-002 end-to-end.
- [ ] Confirmed prerequisites (§4).
- [ ] Created/modified only files in §6 (plus incidental `_meta.js` / changelog as listed).
- [ ] Root Claude Code commands behaviorally unchanged (diff review).
- [ ] Every Cursor command has a mapped replacement for `Agent` / `AskUserQuestion` / `allowed-tools`.
- [ ] Sync script `--check` passes after a clean sync.
- [ ] Mixed-runtime smoke: init on one runtime, next ceremony on the other.
- [ ] Board command works on Cursor; hook gap documented if any.
- [ ] Docs site `npm run build` succeeds.
- [ ] Both packages report `0.11.0`.
- [ ] No locked §10 decision changed without user approval.
- [ ] No temporary notes/TODOs left in `platforms/cursor/` or `docs/specs/`.
