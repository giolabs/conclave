# Model Config per Subagent & Sprint Orchestrator

> **Estado:** DRAFT
>
> **Status:** PENDING PROPOSAL/CHANGE — no OpenSpec change has been generated yet. Run `/openspec-propose` (or `/opsx:propose`) using this spec as input.

## 1. Objetivo *(Goal)*

Deliver two complementary capabilities that give a Conclave team explicit control over both **what runs** and **how smart it runs**:

1. **Model configuration** — Allow the team to declare, once in `conclave/config.md`, which Claude model each role subagent uses (global default plus per-role overrides). Every command reads this config and passes the resolved `model` parameter to its `Agent` tool calls. Existing installs where the block is absent continue to behave exactly as today (parent session model).

2. **Sprint orchestrator** (`/conclave-sprint`) — A new command that drives an entire active sprint end-to-end: planning (if needed) → dev all ready stories → QA all review stories → Tech Lead PR review (if the profile requires it). Each phase is profile-aware, each story advances only if the previous phase succeeded, and failures are isolated per story so the rest of the sprint continues.

The combined outcome: a team can run `/conclave-sprint` once and have the whole sprint execute autonomously, with each role using the right model for its cognitive budget.

## 2. Alcance *(Scope)*

### Incluido en esta fase

- New `models:` block in `conclave/config.md` YAML frontmatter: `models.default` (string) and `models.overrides` (map of role key → model string). Added to `skills/conclave/templates/config.template.md` with sensible commented-out defaults.
- Model resolution logic added to every command that spawns an `Agent` call: read `models.overrides.<role>` first, fall back to `models.default`, fall back to parent session model if the entire block is absent. Invalid model name → warn once, fall back to default.
- New command `commands/conclave-sprint.md` — four phases, each profile-aware:
  - **Phase 1 — Planning**: skipped if `sprint.status: active`; otherwise runs the same agent orchestration as `/conclave-planning`.
  - **Phase 2 — Dev**: collects all `ready` stories in the active sprint, dispatches them via the same concurrent-batch-of-≤3 pattern as `/conclave-dev US-NNN [US-NNN ...]`.
  - **Phase 3 — QA**: collects all `review` stories after Phase 2, dispatches them via the same pattern as `/conclave-qa US-NNN [US-NNN ...]`.
  - **Phase 4 — PR Review**: runs only when `ceremonies.peer_pr_review.required: true`; collects all `verified` stories after Phase 3, dispatches one Tech Lead Agent call per story (batched ≤3).
- Phase-to-phase story hand-off: after each phase, re-read story frontmatter to collect the stories that successfully advanced to the next status. Failed stories are reported but do not block the next phase.
- Final sprint summary table: one row per story, showing status after all phases.
- `skills/conclave/SKILL.md` §3 updated: new `/conclave-sprint` row, model-config note.
- `README.md`, `CHANGELOG.md`, `site/content/en/configuration.mdx`, `site/content/es/configuration.mdx` updated.
- New site docs: `site/content/en/commands/sprint.mdx`, `site/content/es/commands/sprint.mdx`.
- Plugin version bump: `0.6.0` → `0.7.0`.

### Fuera de scope

- **Interactive model selection during `/conclave-init`** — model config is set by manual edit of `config.md`, not via a setup wizard question. Rationale: model choice is a team decision that can change sprint-to-sprint; baking it into init flow would make it feel one-time and immutable.
- **Per-story model overrides** — models are set per role (tech_lead, developer, qa, …), not per individual story or discipline. Reason: the role is the natural unit of cognitive budget allocation.
- **Cost estimation or automatic model optimization** — no inference of "use haiku for simple stories, opus for complex ones." The team decides. Reason: explicit, auditable, and deterministic.
- **A dependency graph between stories** — `/conclave-sprint` assumes stories in the same sprint are independent. Sprint planning is expected to have resolved dependencies. Reason: adding dependency tracking would require a new artifact format and ceremony.
- **Pausing and resuming a sprint run mid-flight** — `/conclave-sprint` is a single invocation. If interrupted, individual story statuses are the recovery mechanism; re-running `/conclave-sprint` or individual commands picks up where the frontmatter left off. No checkpoint file is introduced.
- **Changing the prose-orchestration pattern** — the orchestration DSL remains numbered-steps markdown. No YAML/DAG workflow engine. Reason: same as the existing system — auditable, Git-diffable, human-readable.
- **Changing any agent charter (`agents/*.md`)** — model selection is a call-site concern (the command passes the model parameter); the charter itself is model-agnostic.
- **Changing the story, acceptance, or sprint template schemas** — no new fields on story/sprint artifacts.

## 3. Tecnologias y convenciones del proyecto *(Technologies & conventions)*

### Stack

- **Plugin logic**: markdown only — no runtime, no application code.
- **Model parameter**: Claude Code's `Agent` tool accepts a `model` parameter. Valid current model IDs: `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`. The command reads the configured string and passes it verbatim; Claude Code rejects unknown model IDs at dispatch time (see §11 edge cases).
- **Config storage**: `conclave/config.md` YAML frontmatter — same format, same file, same GitOps flow as all existing config.

### Versiones relevantes

| Dependency | Version | Source |
|---|---|---|
| Conclave plugin | 0.6.0 → **0.7.0** (this change) | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` |
| `conclave_version` (per-install schema) | unchanged — no new artifact schema fields | `skills/conclave/templates/config.template.md` |

### Patrones existentes a respetar

- **Model resolution follows config-read patterns**: every command already reads `conclave/config.md` frontmatter in an early step. Model resolution is a one-liner addition to that same step — no new file read.
- **Warn-and-continue for invalid config**: matches the existing pattern for missing `Discipline` column in roster (treat as `multi`, print one-time warning).
- **Single-story path backward-compatible**: all command changes that add model resolution must leave the single-story, no-`models`-block path producing identical output to v0.6.0.
- **Agent charter files (`agents/*.md`) stay frontmatter-free**: model is passed at call-site in the command, not embedded in the charter. This is the existing pattern (charters are pure prose).
- **Batch-of-3 concurrency from v0.6.0**: `/conclave-sprint` Phases 2–4 reuse this pattern exactly — no new concurrency model.

## 4. Dependencias previas *(Prerequisites)*

- [ ] `commands/conclave-dev.md` v0.6.0 multi-story Step 0 exists (this spec modifies it to add model resolution).
- [ ] `commands/conclave-qa.md` v0.6.0 multi-story Step 0 exists (same).
- [ ] `commands/conclave-planning.md`, `commands/conclave-spec.md`, `commands/conclave-pr-review.md`, `commands/conclave-init.md` exist in shipped form.
- [ ] `skills/conclave/templates/config.template.md` exists and contains the `ceremonies:` block (this spec adds `models:` alongside it).
- [ ] `conclave/config.md` (per-install) already exists in any target repo using Conclave ≥ v0.1.0. The new `models:` block is optional — absent block → no change in behavior.
- [ ] `site/content/en/configuration.mdx` and `site/content/es/configuration.mdx` exist (confirmed — both files present in `site/content/`).

## 5. Arquitectura *(Architecture)*

### Patron

Prose-orchestrated subagents (unchanged). The two additions are:
- **Model resolution** — a pure read step inserted into each command's existing "Load context" step. No new file, no new agent, no new artifact.
- **Sprint orchestrator** — a new command file (`commands/conclave-sprint.md`) that sequences the existing per-command agent orchestrations as phases, re-reading story frontmatter between phases to determine which stories advanced.

### Capas afectadas

| Layer | Affected? | Description |
|---|---|---|
| `conclave/config.md` schema (per-install) | Yes | New optional `models:` YAML frontmatter block. Absent block = silent no-op. |
| `skills/conclave/templates/config.template.md` | Yes | Add `models:` block with commented-out defaults. |
| Commands (`commands/conclave-*.md`) — all 6 existing | Yes | Add model-resolution logic to the "Load context" step. Pass resolved model to every `Agent` tool call. |
| Commands — new `commands/conclave-sprint.md` | Yes (new) | Sprint orchestrator: four phases, profile-aware, failure-isolated, final summary table. |
| Agent charters (`skills/conclave/agents/*.md`) | No | Entirely unchanged. |
| Other templates | No | Entirely unchanged. |
| Methodology doc, repo docs, site docs | Yes | Per §2's doc-update list. |

### Model resolution logic (per command, per Agent call)

```
RESOLVE_MODEL(role_key):
  if models.overrides[role_key] is set and non-empty:
    if models.overrides[role_key] is a known model ID:
      return models.overrides[role_key]
    else:
      WARN: "Unknown model '<value>' for role <role_key>. Falling back to default."
      fall through to default
  if models.default is set and non-empty:
    if models.default is a known model ID:
      return models.default
    else:
      WARN: "Unknown model '<value>' for models.default. Using parent session model."
      return null (Agent call with no model param = parent session model)
  return null  # models block absent or empty — parent session model
```

Role keys and their corresponding charters:

| Role key | Charter file |
|---|---|
| `product_manager` | `agents/product-manager.md` |
| `tech_lead` | `agents/tech-lead.md` |
| `scrum_master` | `agents/scrum-master.md` |
| `developer` | `agents/developer.md` |
| `designer` | `agents/designer.md` |
| `devops` | `agents/devops.md` |
| `qa` | `agents/qa.md` |

### Flujo esperado — `/conclave-sprint`

```
/conclave-sprint
```

1. **Resolve workspace** — same as existing commands (git root, config.md, clean working tree).
2. **Load config** — read `conclave/config.md` frontmatter: `team_profile`, `ceremonies.*`, `models.*`. Resolve models for all roles using the logic above. Print a one-line model summary: `Models: default=sonnet, tech_lead=opus, developer=haiku, qa=sonnet`.
3. **Resolve active sprint** — find the sprint with `status: active` or `status: draft`. No sprint → refuse. Multiple active → refuse.
4. **Phase 1 — Planning** (skipped if `sprint.status: active`): if the sprint is `draft`, run the full planning agent orchestration (PM + TL concurrent Wave 1, SM Wave 2) — same as `/conclave-planning`'s Steps 2–9. Advances sprint to `active`.
5. **Collect Phase 2 stories** — list all `status: ready` stories in the active sprint. If none, skip Phase 2 and 3.
6. **Phase 2 — Dev** — dispatch all ready stories using the batch-of-≤3 concurrent-Agent pattern from `/conclave-dev` Step 0. Each Agent call uses the resolved model for the story's discipline, using the same routing table as `/conclave-dev` Step 6: `design` → `models.overrides.designer`, `devops` → `models.overrides.devops`, and `frontend | backend | mobile | multi | unset` → `models.overrides.developer`. Collect results. Failed stories are reported but do not block Phase 3.
7. **Collect Phase 3 stories** — re-read frontmatter; collect all `status: review` stories (only those that succeeded in Phase 2, plus any that were already in `review` before the sprint run).
8. **Phase 3 — QA** — dispatch all review stories using the batch-of-≤3 pattern from `/conclave-qa` Step 0, using the resolved `qa` model. Collect results.
9. **Phase 4 — PR Review** (skipped if `ceremonies.peer_pr_review.required: false`): re-read frontmatter; collect all `status: verified` stories. Dispatch one Tech Lead Agent call per story (batched ≤3), using the resolved `tech_lead` model.
10. **Print final sprint summary table** — one row per story that was touched, showing starting status → final status and any failure notes.

### Flujo esperado — model config (per existing command)

No new step added — model resolution is inserted into the existing "Load context" step:

```
## Step N — Load context (in parallel)

Read:
- `$REPO_ROOT/conclave/config.md` — `team_profile`, `ceremonies.*`, and now also `models.*`
  Resolve MODEL_FOR_<ROLE> = RESOLVE_MODEL(<role_key>) for each role this command uses.
  Print one line: "Model for <role>: <model_id or 'session default'>".
```

Then each `Agent` tool call gains:
```
Issue an `Agent` tool call with:
- **Model**: MODEL_FOR_<ROLE> (omit the param entirely if null — same as today)
- Prompt prefix: full content of the charter...
```

### Layout de archivos

```
commands/
  conclave-sprint.md          # NUEVO
  conclave-dev.md             # MODIFICAR — model resolution in Load context + Agent calls
  conclave-qa.md              # MODIFICAR — same
  conclave-planning.md        # MODIFICAR — same
  conclave-spec.md            # MODIFICAR — same
  conclave-pr-review.md       # MODIFICAR — same
  conclave-init.md            # MODIFICAR — same (for any Agent calls inside init)
skills/conclave/templates/
  config.template.md          # MODIFICAR — add models: block
skills/conclave/
  SKILL.md                    # MODIFICAR — new command, model-config note
site/content/en/commands/
  sprint.mdx                  # NUEVO
site/content/es/commands/
  sprint.mdx                  # NUEVO
site/content/en/
  configuration.mdx           # MODIFICAR
site/content/es/
  configuration.mdx           # MODIFICAR
README.md                     # MODIFICAR
CHANGELOG.md                  # MODIFICAR
.claude-plugin/plugin.json    # MODIFICAR — version bump
.claude-plugin/marketplace.json # MODIFICAR — version bump
```

## 6. Archivos a crear o modificar *(Files to create / modify)*

| Ruta | Accion | Proposito | Ejemplo del proyecto a seguir |
|---|---|---|---|
| `commands/conclave-sprint.md` | NUEVO | Sprint orchestrator — 4-phase sequential runner | `commands/conclave-dev.md` Step 0 (batch-of-3 dispatch pattern) + `commands/conclave-planning.md` (planning phase) |
| `commands/conclave-dev.md` | MODIFICAR | Model resolution in Load context step; pass model to Agent calls in Step 0 and Step 6 | Existing Step 3 "Load context" block |
| `commands/conclave-qa.md` | MODIFICAR | Same model-resolution pattern | Existing Step 4 "Load context" block |
| `commands/conclave-planning.md` | MODIFICAR | Same model-resolution pattern (for PM, TL, SM agents) | Existing Load context step |
| `commands/conclave-spec.md` | MODIFICAR | Same model-resolution pattern (for PM, TL agents) | Existing Load context step |
| `commands/conclave-pr-review.md` | MODIFICAR | Same model-resolution pattern (for TL agent) | Existing Load context step |
| `commands/conclave-init.md` | No change | `conclave-init.md` contains no `Agent` tool calls — it is a pure question-gather-and-write command. No model-resolution change is required. Listed here for completeness; the implementer should confirm and skip. | n/a |
| `skills/conclave/templates/config.template.md` | MODIFICAR | Add `models:` YAML block with commented-out defaults | Existing `ceremonies:` block (same style) |
| `skills/conclave/SKILL.md` | MODIFICAR | §3 new `/conclave-sprint` row; model-config note in §2 invariants | Existing §3 table rows |
| `README.md` | MODIFICAR | Add `/conclave-sprint` to Quick start; mention model config | Existing Quick start section |
| `CHANGELOG.md` | MODIFICAR | Add `[Unreleased]` / v0.7.0 entry | Existing `[0.6.0]` entry shape |
| `site/content/en/commands/sprint.mdx` | NUEVO | English docs for `/conclave-sprint` | `site/content/en/commands/dev.mdx` (command doc style) |
| `site/content/es/commands/sprint.mdx` | NUEVO | Spanish translation of same | `site/content/es/commands/dev.mdx` |
| `site/content/en/configuration.mdx` | MODIFICAR | Document `models:` config block | Existing `ceremonies:` section in the same file |
| `site/content/es/configuration.mdx` | MODIFICAR | Spanish translation of same | Existing ES config page |
| `.claude-plugin/plugin.json` | MODIFICAR | Version bump `0.6.0` → `0.7.0` | Current version field |
| `.claude-plugin/marketplace.json` | MODIFICAR | Version bump `0.6.0` → `0.7.0` | Current version field |

### Detalle por archivo

#### `skills/conclave/templates/config.template.md`

Add after the `ceremonies:` block in YAML frontmatter:

```yaml
# Model configuration (optional). Omit this block entirely to use the parent session model for all roles.
# Valid model IDs: claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5-20251001
models:
  default: claude-sonnet-4-6          # fallback for any role not listed below
  overrides:
    # product_manager: claude-opus-4-6
    # tech_lead: claude-opus-4-6
    # scrum_master: claude-sonnet-4-6
    # developer: claude-haiku-4-5-20251001
    # designer: claude-sonnet-4-6
    # devops: claude-sonnet-4-6
    # qa: claude-sonnet-4-6
```

Add a `## Model configuration` prose section at the bottom of `config.template.md` explaining the block, the fallback chain, and the valid model IDs.

**No mezclar**: do not touch the `ceremonies:` block logic or the `team_profile` section.

#### `commands/conclave-dev.md`

In the existing "Step 3 — Load context" (or whichever step reads `config.md`), add:

```
- `models.*` — resolve MODEL_FOR_DEVELOPER = RESOLVE_MODEL('developer') (and MODEL_FOR_DESIGNER, MODEL_FOR_DEVOPS for the routing table). Print one line per resolved model.
```

In Step 0's Agent call dispatch and in Step 6's single-story Agent call, pass:
```
- **Model**: MODEL_FOR_<charter> (omit entirely if null)
```

**No mezclar**: no changes to the batch-of-3 logic or the guardrails.

#### `commands/conclave-qa.md`

Same pattern: add `models.qa` resolution in Load context; pass MODEL_FOR_QA to both the Step 5 and Step 7 Agent calls.

#### `commands/conclave-planning.md`

Resolve `product_manager`, `tech_lead`, `scrum_master` models in Load context. Pass to the three Wave 1/2 Agent calls.

#### `commands/conclave-spec.md`

Resolve `product_manager`, `tech_lead` models. Pass to the two concurrent Agent calls.

#### `commands/conclave-pr-review.md`

Resolve `tech_lead` model. Pass to the TL Agent call.

#### `commands/conclave-init.md`

Resolve any role models for Agent calls init spawns. Pass accordingly.

#### `commands/conclave-sprint.md` (NEW)

Full command structure:

```markdown
---
description: Drive an entire active sprint from ready → done in one invocation. Phase 1: planning (if sprint is draft). Phase 2: dev all ready stories (batch-of-3). Phase 3: QA all review stories (batch-of-3). Phase 4: Tech Lead PR review for verified stories (if peer_pr_review.required). Each phase uses configured models. Failures are isolated per story.
allowed-tools: Bash(git rev-parse:*), Bash(git status:*), Bash(git checkout:*), Bash(git switch:*), Bash(git branch:*), Bash(git push:*), Bash(git stash:*), Bash(git fetch:*), Bash(git add:*), Bash(git commit:*), Bash(git diff:*), Bash(git log:*), Bash(git rev-parse HEAD:*), Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(gh pr create:*), Bash(gh pr view:*), Bash(gh pr comment:*), Bash(gh pr checks:*), Bash(gh pr review:*), Bash(gh pr diff:*), Bash(gh run list:*), Bash(gh run view:*), Read, Write, Edit, Agent, AskUserQuestion
---

# /conclave-sprint

[Steps 1–10 as described in §5 Architecture]
```

The command must:
- Print a phase header before each phase: `## Phase N — <Name> (<N> stories)`
- Print per-phase results using the same summary-table format from `/conclave-dev`
- Print a final `## Sprint run complete` summary table
- Never silently skip a phase without saying why (e.g. "Phase 1 — Planning: skipped (sprint already active)")

## 7. API Contract

Sin API surface — no aplica. No HTTP layer. The `Agent` tool `model` parameter is an internal Claude Code call-site parameter, not an external API.

## 8. Criterios de exito *(Success criteria)*

- [ ] `conclave/config.md` with `models.default: claude-sonnet-4-6` and `models.overrides.tech_lead: claude-opus-4-6`: `/conclave-spec` prints "Model for product_manager: claude-sonnet-4-6, tech_lead: claude-opus-4-6" before dispatching. Each Agent call receives the correct model parameter.
- [ ] `conclave/config.md` with NO `models:` block: every command behaves identically to v0.6.0 — no model param passed to any Agent call, no warning printed.
- [ ] `models.overrides.developer: claude-opus-99` (invalid): command prints "WARNING: Unknown model 'claude-opus-99' for role developer. Falling back to default: claude-sonnet-4-6" and continues. Story is processed with `claude-sonnet-4-6`.
- [ ] `/conclave-sprint` on a sprint with 4 ready stories: Phase 2 runs them in batch-of-3+1, Phase 3 runs only the stories that succeeded in Phase 2, final summary shows all 4 rows.
- [ ] `/conclave-sprint` on an already-active sprint: Phase 1 prints "skipped (sprint already active)" — no Agent calls dispatched for planning.
- [ ] `/conclave-sprint` with `peer_pr_review.required: false`: Phase 4 prints "skipped (peer_pr_review.required: false)" — no TL Agent calls dispatched.
- [ ] One story fails in Phase 2 (dev): it stays `ready`, is excluded from Phase 3's collection, and appears as `✗ failed` in the final summary. Remaining stories proceed to Phase 3 normally.
- [ ] All stories fail in Phase 2: Phase 3 collects zero stories → prints "Phase 3 — QA: skipped (0 stories in review)" → Phase 4 likewise skipped → final summary shows all failures.
- [ ] `CHANGELOG.md` and all named doc pages updated.

### Tests requeridos

No automated test suite exists for this plugin (`CLAUDE.md` §"Development commands"). All scenarios above are verified manually.

### Comandos de verificacion

```bash
ln -s "$(pwd)" ~/.claude/plugins/conclave   # restart Claude Code after this

# In a scratch target repo:
#   1. /conclave-init → /conclave-spec → /conclave-planning
#      → confirm sprint active with multiple ready stories

#   2. Add to config.md:
#      models:
#        default: claude-sonnet-4-6
#        overrides:
#          tech_lead: claude-opus-4-6
#          developer: claude-haiku-4-5-20251001

#   3. /conclave-sprint → confirm phase headers, model summary line,
#      per-phase story tables, and final sprint summary

#   4. Remove models block → /conclave-sprint again
#      → confirm identical behavior to v0.6.0 (no model-related output)

#   5. Set models.default: invalid-model-xyz
#      → confirm WARNING line printed, fallback to session model

#   6. Make one story's acceptance file malformed → /conclave-sprint
#      → confirm that story fails, appears in summary, other stories continue
```

## 9. Criterios de UX *(UX criteria)*

### Loading

The model summary line is printed before the first phase starts so the user can abort if they see the wrong model:
```
Models: default=claude-sonnet-4-6, tech_lead=claude-opus-4-6, developer=claude-haiku-4-5-20251001
```

Each phase prints a header with story count before dispatching Agent calls. The user sees live progress as each Agent call returns, exactly as in the existing multi-story flow.

### Formularios

No new interactive prompts. `/conclave-sprint` may trigger the existing `AskUserQuestion` prompts inside individual per-story Agent calls (e.g. "story already has branch — resume?") — these block only that story's Agent call; others continue.

### Passwords

No aplica.

### Errores

- **No active or draft sprint**: `"No sprint to run. Create one with /conclave-spec, then lock it with /conclave-planning."` Stop.
- **Invalid model name**: `WARNING: Unknown model '<value>' for role <role>. Falling back to <fallback>.` Continue.
- **Phase produces zero stories**: `"Phase N — <Name>: skipped (0 stories in <expected-status>)."` Continue to next phase.
- **All stories in a phase fail**: same skip message for the next phase; final summary shows all failures.
- **Phase 1 (planning) itself fails** (e.g. subagent error): refuse to continue to Phase 2. Surface the planning error and stop: `"Sprint run aborted: Phase 1 (Planning) failed. Fix the error above and re-run /conclave-sprint."` Reason: proceeding to dev without a locked sprint goal is structurally unsound.

### Navegacion

No aplica — text-only CLI.

### Accesibilidad

No aplica — text-only CLI.

## 10. Decisiones tomadas *(Decisions made — locked)*

| Decision | Why |
|---|---|
| Model config in `conclave/config.md` (not a separate file) | Explicit user decision. Config is the single place the team edits team-level decisions; separate `models.md` would fragment config discovery. |
| Global default + per-role overrides (not per-command) | Explicit user decision. Role is the natural unit of cognitive budget — a Tech Lead is expensive regardless of which command invokes it. |
| Invalid model → warn and fall back (not hard error) | Explicit user decision. A typo in model config should not block a sprint run; the warning is loud enough to notice. |
| Absent `models:` block → silent no-op (no warning) | Backward-compatibility — existing teams should not see any change unless they opt in. |
| `/conclave-sprint` phases are sequential (Phase N waits for Phase N-1) | Architectural necessity — Phase 3 QA can only run on stories that Phase 2 Dev moved to `review`. |
| Failed stories skip the next phase (not all-or-nothing) | Explicit user decision. One flaky story should not block the sprint for everyone. |
| Phase 1 (Planning) failure is a hard stop (unlike other phases) | A sprint without a locked plan is structurally invalid — proceeding to dev would produce stories with no goal alignment. This asymmetry is intentional. |
| Agent charters stay frontmatter-free | Existing invariant (all agent charters are pure prose). Model is a call-site concern, passed by the command, not embedded in the charter. Changing this would break the role-charter pattern every command depends on. |
| `/conclave-sprint` cannot be partially resumed via a checkpoint file | Explicit decision — story `status` frontmatter is the recovery mechanism. Re-running `/conclave-sprint` after a failure picks up the remaining stories from their current status. Adding a checkpoint file would be new artifact schema and new invariant to maintain. |

## 11. Edge cases

### Datos invalidos

- Invalid model name (unknown string): warn once per role, fall back. Never fail silently without the warning.
- Empty string for model value (`developer: ""`): treated same as absent — fall back to `models.default`.
- `models.default` absent but `models.overrides` present: roles without an override use the parent session model (no default to fall back to).
- Story with `discipline: mobile` in Phase 2: routed to `developer.md` — uses `models.overrides.developer` as today's routing already does.

### API errors / Agent call failures

- One story's Agent call throws during Phase 2: reset that story to `status: ready`; record error; other stories in the batch continue.
- One story's QA Agent call produces `verdict: blocked` during Phase 3: this is a normal QA outcome, not an error. Story stays `review`. Reported in final summary as `✗ blocked`.
- Phase 4 TL Agent call fails for one story: story stays `verified`, error reported in summary. Does not block other PR reviews.

### No sprint

- No sprint exists at all: refuse with a message pointing to `/conclave-spec` and `/conclave-planning`. Stop.
- Multiple `active` sprints: refuse (this should not happen in normal flow). Stop.

### Sin conexion

- `git push` or `gh pr create` fails for one story in Phase 2: that story's Agent call records the failure; story status reflects the last successful commit (likely `in-progress` rather than `review`). Error surfaced in summary. CI/network failure does not affect other stories.

### Timeout

- `/conclave-qa`'s CI wait applies within Phase 3. `ceremonies.qa_verification.ci_wait_timeout_minutes` (default 20) is still respected per-story. A CI timeout for one story produces `verdict: blocked` for that story; other QA Agent calls are unaffected.

### Respuesta vacia o inesperada

- Agent call returns unrecognized output during any phase: treat as failure for that story; record in summary; continue.

### Doble submit / re-run

- Re-running `/conclave-sprint` when some stories are already `review`/`verified`/`done`: Phase 2 only collects `ready` stories; Phase 3 collects `review` stories (including those left over from a prior partial run); Phase 4 collects `verified` stories. The command picks up where frontmatter left off.

## 12. Estados de UI requeridos *(Required UI states)*

No aplica — text-only CLI. The observable states are story `status` values in frontmatter, which are unchanged by this spec. The new user-visible artifacts are:

- **Model summary line** (before Phase 1): `Models: default=<x>, <role>=<y>, ...`
- **Phase header** (before each phase): `## Phase N — <Name> (<count> stories)`
- **Phase skip notice**: `Phase N — <Name>: skipped (<reason>)`
- **Per-phase summary table** (same format as `/conclave-dev`/`/conclave-qa`)
- **Final sprint summary table** (one row per story, all phases)

## 13. Validaciones *(Validations)*

### Validaciones de cliente

| Campo | Regla | Mensaje |
|---|---|---|
| `models.default` | Must be a known Claude model ID string, or absent | `WARNING: Unknown model '<value>' for models.default. Using parent session model.` |
| `models.overrides.<role>` | Must be a known Claude model ID or absent | `WARNING: Unknown model '<value>' for role <role>. Falling back to default: <default>.` |
| `models.overrides.<role>` empty string | Treated as absent | Silent — treated as "not set" |
| Active sprint exists | At least one sprint with `status: active` or `status: draft` | `No sprint to run. Create one with /conclave-spec then lock with /conclave-planning.` |
| Phase 1 (planning) result | Sprint must be `active` after Phase 1 before Phase 2 proceeds | `Sprint run aborted: Phase 1 (Planning) failed.` |

Known Claude model IDs (validate against this list; update when new models ship):
`claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`

### Validaciones de servidor

No aplica.

## 14. Seguridad y permisos *(Security & permissions)*

- **Model names are config strings** — no secrets, no API keys, no credentials. They live in `conclave/config.md` which is committed to git and visible to the entire team. Same exposure level as all other Conclave config.
- **No new network calls** — model selection happens entirely at Agent call-site; Claude Code handles model routing internally. No new external API surface.
- **No new permission surface** — `/conclave-sprint` invokes the same role subagents as the existing commands. The existing per-role guardrails (QA never approves, TL never deploys, etc.) apply unchanged.

## 15. Observabilidad y logging *(Observability & logging)*

- **Model summary line** is printed to the terminal before Phase 1. This is the primary audit surface: the user sees exactly which model will be used for each role before any Agent call fires.
- **Existing audit trail**: each story's verification report, PR body, and commit history remain the audit trail. This spec does not add model metadata to story files or PR bodies (out of scope for v0.7.0).
- **Warnings** for invalid model names are printed to the terminal. They are not written to any artifact file.
- **Never log**: model names are configuration strings, not secrets — logging them is safe. Still, no persistent log file is introduced; the terminal output and the Git history of `config.md` are the only records.

## 16. i18n / textos visibles *(i18n / user-facing copy)*

No aplica — no translation-key system in this plugin. All new user-facing text (model summary line, phase headers, skip notices, warning messages, summary tables) is English plain text. The two new site doc pages (`site/content/es/commands/sprint.mdx` and the `configuration.mdx` update) will be translated Spanish prose matching the existing ES page style.

## 17. Performance

- **Model config resolution** adds one additional key-read to the existing config-read step — negligible overhead.
- **Phase-to-phase frontmatter re-read**: between Phase 2 and Phase 3, `/conclave-sprint` re-reads every story file's frontmatter to collect the `review` set. For a typical sprint of 5–10 stories this is trivial. For very large sprints (>20 stories), file reads are bounded and fast (markdown, no network).
- **Concurrent batch-of-3 across phases**: the same performance characteristics as v0.6.0. Wall-clock time for a full sprint run is approximately `(P1_planning) + ceil(N_dev/3) × single-story-dev-time + ceil(N_qa/3) × single-story-qa-time + ceil(N_pr/3) × single-story-pr-time`.
- **Faster models for bulk work**: assigning `claude-haiku-4-5-20251001` to the `developer` role across a batch of 9 stories (3 batches of 3) meaningfully reduces wall-clock time at lower cost — this is the primary user motivation for per-role model config.

## 18. Restricciones *(Restrictions / hard "do not" rules)*

The implementer must NOT:

- [ ] Add frontmatter or a `model:` field to any file under `skills/conclave/agents/` — model is a call-site parameter, not a charter property.
- [ ] Change any story, acceptance, sprint-meta, or sprint-spec template schema.
- [ ] Change the batch-of-3 concurrency logic introduced in v0.6.0.
- [ ] Introduce a checkpoint file or any new artifact for sprint-run state tracking — story frontmatter `status` is the recovery mechanism.
- [ ] Make the `models:` block required in `config.md` — absent block must be a silent no-op.
- [ ] Proceed to Phase 2 (Dev) if Phase 1 (Planning) failed — this is a hard stop.
- [ ] Let a failed story in Phase 2 or 3 block the next phase for other stories — failures are per-story isolated.
- [ ] Change any agent charter file.
- [ ] Skip the `CHANGELOG.md` entry or the doc updates this change requires per `CLAUDE.md`.
- [ ] Pass an invalid model ID to an Agent call after a warning — always fall back to a valid model (or null for session default).

## 19. Entregables *(Deliverables)*

- [ ] `skills/conclave/templates/config.template.md` updated: `models:` YAML block + prose section.
- [ ] Model resolution logic added to 5 command files (conclave-dev, conclave-qa, conclave-planning, conclave-spec, conclave-pr-review). `conclave-init.md` requires no change (contains no Agent calls).
- [ ] New `commands/conclave-sprint.md` with all 4 phases, profile-awareness, failure isolation, final summary table.
- [ ] `skills/conclave/SKILL.md` §3 updated: `/conclave-sprint` row, model-config note.
- [ ] `README.md` updated: quick start includes `/conclave-sprint`, mentions model config.
- [ ] `CHANGELOG.md` updated: `[Unreleased]` / v0.7.0 entry.
- [ ] `site/content/en/commands/sprint.mdx` and `site/content/es/commands/sprint.mdx` created.
- [ ] `site/content/en/configuration.mdx` and `site/content/es/configuration.mdx` updated: `models:` section.
- [ ] `.claude-plugin/plugin.json` and `marketplace.json` bumped to `0.7.0`.
- [ ] Manual verification per §8 completed and reported.

## 20. Checklist final para el agente *(Final agent checklist)*

Before delivering, verify:

- [ ] Read this spec end-to-end.
- [ ] Confirmed all prerequisites (§4) are satisfied.
- [ ] Modified only files listed in §6 — no unrelated refactors.
- [ ] `models:` block absent from `config.md` → zero change in behavior vs. v0.6.0 (regression test).
- [ ] Model resolution logic is identical across all 6 modified command files — no copy-paste drift.
- [ ] Model summary line is printed before Phase 1 in `/conclave-sprint`.
- [ ] Phase 1 failure is a hard stop; all other phase failures are per-story isolated.
- [ ] Phase skip notices printed for every skipped phase (including sprint-already-active and peer_pr_review off).
- [ ] Final sprint summary table covers all stories touched during the run.
- [ ] No agent charter was modified.
- [ ] No template other than `config.template.md` was modified.
- [ ] `CHANGELOG.md` and all named doc pages reflect the new behavior.
- [ ] Version bumped in both plugin manifest files.
- [ ] No temporary notes, TODOs, or scratch files left in `docs/`, `commands/`, or `skills/`.
