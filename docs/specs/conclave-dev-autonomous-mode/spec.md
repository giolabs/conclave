# `/conclave-dev` Autonomous Mode

> **Status:** PENDING PROPOSAL/CHANGE — no OpenSpec change has been generated yet. Run `/openspec-propose` (or `/opsx:propose`) using this spec as input.

## 1. Objetivo *(Goal)*

Give teams a way to run `/conclave-dev` **without any user prompts** during a story's implementation, producing a structured run report at the end. This unblocks two use cases:

1. **`/conclave-sprint` and batched multi-story dispatch** — today, a mid-flight `AskUserQuestion` (assignee mismatch, existing-branch prompt, dev-subagent clarification) freezes the whole batch and forces the operator to babysit. Autonomous mode removes every prompt in the story flow and either takes a documented sensible default or aborts with a specific reason.
2. **CI-triggered story runs** — a team that wants to run `/conclave-dev` from a CI job (nightly sweep, auto-implementation of small stories) can point the job at autonomous mode without hacking around a non-interactive terminal.

The mode is opt-in via a new `commands.dev.interactive: false` config field, with a CLI-flag override (`--no-interaction`) for ad-hoc runs. Absent config keeps every existing install behaving exactly as today. The Developer subagent is instructed via its task prompt that it is running autonomously — it never calls `AskUserQuestion` itself; when it hits an ambiguity that isn't covered by a sensible default, it aborts with `AUTONOMOUS_ABORT: <reason>` which the orchestrator surfaces in the run report.

## 2. Alcance *(Scope)*

### Incluido en esta fase

- **New config field**: `commands.dev.interactive: true | false` in `conclave/config.md` YAML frontmatter (defaults to `true` when absent — every existing install unaffected).
- **New CLI flag** for `/conclave-dev`: `--no-interaction` (also accepted as `--headless` as a synonym). Argument-parsing addition to the orchestrator's Step 0/1. Present in single-story and multi-story invocations. Overrides the config field for that invocation only. There is no `--interaction` flag — to force interactive mode ad-hoc, either edit `config.md` or omit the flag on a repo whose config has `interactive: true`.
- **Autonomous mode behavior in the orchestrator** (all applies when the resolved `INTERACTIVE = false`):
  - Never call `AskUserQuestion`.
  - Apply a documented default at every decision point that currently uses `AskUserQuestion` (see §5 for the full defaults table).
  - Extend the Developer-subagent task prompt with an autonomous-mode preamble: *"Autonomous mode: do not use AskUserQuestion. If ambiguous, take the safest documented default or return the single line `AUTONOMOUS_ABORT: <one-line reason>` — nothing else."*
  - On any `AUTONOMOUS_ABORT` return from the subagent: reset the story to `status: ready`, record the reason in the run report, do not push, do not open a PR.
  - On any Agent tool error, test-suite failure, lint failure, or missing scenario coverage: fail the story, reset to `status: ready`, record the failure in the run report.
- **New run-report artifact per story** — a markdown section appended to the story file at `## Autonomous run — <ISO_TIMESTAMP>`. Contents (per §6 file details): outcome, autonomous decisions taken, files touched, test/lint summary, duration, blockers if failed. The section is append-only — repeated autonomous runs each append a new section (never delete prior).
- **Terminal output** — a compact summary is printed to the terminal after the story completes (or aborts), matching the story-file section but in a `+`/`-` bullet format for scanning.
- **`/conclave-sprint` change** — Phase 2 (dev) dispatches inside `/conclave-sprint` always run in autonomous mode, regardless of `commands.dev.interactive` in `config.md`. This makes today's batched dispatches consistent with their real behavior (subagent-inside-subagent has no user to prompt anyway).
- **Config template update** — `skills/conclave/templates/config.template.md` gets a `commands:` block (commented-out defaults) and a prose section explaining `commands.dev.interactive`, alongside the existing `models:` and `ceremonies:` blocks.
- **Charter update** — `skills/conclave/agents/developer.md` gains a "How you operate in autonomous mode" section describing the `AUTONOMOUS_ABORT` contract and the four abort scenarios.
- **Docs** — updates to `skills/conclave/SKILL.md` §3 and the `/conclave-dev` command docs on the site (EN + ES).
- **CHANGELOG entry** and **plugin manifests bumped to 0.9.0**.

### Fuera de scope

- **Autonomous mode for `/conclave-qa`, `/conclave-pr-review`, `/conclave-planning`, `/conclave-story`, `/conclave-adr`** — this spec is scoped to `/conclave-dev` only, per the user decision. The same pattern generalises later once this ships.
- **A separate log file per run** — the run report lives inside the story file (append-only markdown section). No new file artifact under `conclave/runs/` or similar.
- **A `--yes-all` interactive mode** — there is no middle ground. Either fully interactive (every prompt) or fully autonomous (no prompts). Reason: a "confirm-once, apply-to-all" mode has a false sense of safety when applied across a batch of stories.
- **Autonomous decision-making about test framework setup** — if the target repo has no test framework and the Developer subagent would today propose one and confirm with the user, autonomous mode aborts with `AUTONOMOUS_ABORT: no test framework detected; run interactively first to bootstrap`. Bootstrap decisions must involve a human.
- **Autonomous decision-making about a new dependency** — same principle. If the story requires adding a new npm/pip/etc. dependency, autonomous mode aborts unless the dependency is listed in an ADR the Dev is asked to implement (in which case adding it is compliance, not a new decision).
- **A `git status --porcelain`-suppressing "auto-stash-and-restore" flow** — if the working tree is dirty at start, autonomous mode aborts identically to interactive mode. This is a structural guard, not an interaction.
- **Changing the story state machine** — no new statuses. The two terminal outcomes (`review` on success, `ready` on abort/failure) match today's behavior.
- **Changing `/conclave-sprint`'s summary table format** — the sprint runner's post-phase summary is unchanged. It reads each story's frontmatter, sees `status: review` or `status: ready`, and reports as today.
- **A dry-run / plan-only mode** — autonomous mode still writes code, tests, and pushes. There is no "just tell me what you would do" mode in this iteration.
- **Retrying an aborted story automatically** — the run report records the abort reason; the operator decides whether to fix and re-run.

## 3. Tecnologias y convenciones del proyecto *(Technologies & conventions)*

### Stack

- **Plugin logic**: markdown only. No runtime, no code changes to a runtime.
- **Config storage**: `conclave/config.md` YAML frontmatter — same file, same format as v0.7.0's `models:` and v0.8.0's story-frontmatter fields.
- **CLI flags for slash commands**: parsed in prose by the orchestrator's Step 0/1 (same technique v0.6.0 used for multi-story `US-NNN [US-NNN ...]` and v0.8.0 used for `/conclave-story <sub-action>`).

### Versiones relevantes

| Dependency | Version | Source |
|---|---|---|
| Conclave plugin | 0.8.0 → **0.9.0** (this change) | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` |
| `conclave_version` (per-install schema) | unchanged — no new artifact schema fields | `skills/conclave/templates/config.template.md` |
| Story-file schema | unchanged (append-only body section, no new frontmatter fields) | `skills/conclave/templates/story.template.md` |

### Patrones existentes a respetar

- **Config-read pattern from v0.7.0**: every command already reads `conclave/config.md` frontmatter in Step 1 or 2. The new `commands.dev.interactive` field is read alongside the existing `models.*` and `ceremonies.*` blocks — one additional line, no new file access.
- **Absent-block-silent-no-op** (from v0.7.0's `models:` block): the `commands:` block is optional; when absent, `INTERACTIVE = true` (same as before).
- **Argument parsing in the orchestrator** (from v0.6.0's multi-story dispatch): first parse the args, extract positional IDs into a list, extract any `--flag` tokens, then continue. No shift of complexity into the subagent.
- **Append-only artifacts** (from v0.8.0's ADR migration and QA verification report): the story-file's `## Autonomous run —` section is append-only. Repeated runs stack new sections; nothing is ever deleted.
- **`AUTONOMOUS_ABORT: <reason>` sentinel** matches the pattern of `SPLIT_UNSAFE:` from v0.8.0 (`/conclave-story split`) — the subagent returns a single line with a well-known prefix, the orchestrator recognises it and stops without writing outputs.
- **Backward-compat guard**: no user with a v0.8.0 install should see any change in behavior until they explicitly opt in by setting `commands.dev.interactive: false` or passing `--no-interaction`.

## 4. Dependencias previas *(Prerequisites)*

- [ ] `commands/conclave-dev.md` v0.8.0 exists (this spec modifies it — adds Step 0.5 flag parsing, autonomous-mode branching in every current `AskUserQuestion` site, run-report emission at the end).
- [ ] `commands/conclave-sprint.md` v0.8.0 exists (this spec modifies Phase 2 dispatch to always inject `--no-interaction` into the per-story Agent task).
- [ ] `skills/conclave/agents/developer.md` v0.8.0 exists (this spec appends a "How you operate in autonomous mode" section).
- [ ] `skills/conclave/templates/config.template.md` v0.8.0 exists (this spec adds a `commands:` block alongside `ceremonies:` and `models:`).
- [ ] `conclave/config.md` per-install schema is at least v0.7.0 (contains `models:` block — required so the new `commands:` block sits alongside existing structure without confusion).
- [ ] Story-file schema from v0.8.0 (with the optional `retirement_reason` / `retired_at` / `superseded_by` / `split_from` fields) — the new `## Autonomous run —` section appends to the body, not the frontmatter.
- [ ] `site/content/{en,es}/commands/dev.mdx` exist (updates document the new flag and config field).

## 5. Arquitectura *(Architecture)*

### Patron

Prose-orchestrated subagents (unchanged). The additions are:

- **Config-read + flag-parse step**: one new resolution line in `/conclave-dev`'s existing config-read step computes `INTERACTIVE = (CLI --no-interaction flag absent) AND (config commands.dev.interactive != false)`.
- **Autonomous-mode branching**: every existing `AskUserQuestion` site in `/conclave-dev` is prefixed with an `if INTERACTIVE else apply-default` check. Each site has a documented default (see §5.2). If a site has no safe default (see §5.3 abort scenarios), the orchestrator raises the abort itself.
- **Subagent prompt suffix**: when `INTERACTIVE = false`, the Developer-subagent task prompt gains a preamble instructing it not to call `AskUserQuestion` and to return `AUTONOMOUS_ABORT: <reason>` on ambiguity.
- **Run-report emitter**: a new Step 9.5 in `/conclave-dev` (post-push, pre-final-report) renders the `## Autonomous run — <ISO_TIMESTAMP>` section and appends it to the story file. Terminal summary is printed in Step 10 (existing final report), extended with the same content in a compact form.

### 5.1 The `INTERACTIVE` resolution

At `/conclave-dev`'s config-read step:

```
INTERACTIVE = true
if config.commands.dev.interactive == false:
  INTERACTIVE = false
if "--no-interaction" in CLI_ARGS or "--headless" in CLI_ARGS:
  INTERACTIVE = false
  remove that token from CLI_ARGS before parsing story IDs

print "Mode: <interactive|autonomous>" (only when autonomous — interactive is the silent default)
```

Note: there is no CLI flag to force interactive when the config says `false` — this asymmetry is intentional. Someone running from a CI job wants autonomous to be sticky.

### 5.2 Sensible-defaults catalog (applied when `INTERACTIVE = false`)

Every current `AskUserQuestion` site in `/conclave-dev` gets a documented default:

| Current interactive prompt | Autonomous default | Rationale |
|---|---|---|
| **Assignee mismatch** — story's `assignee` is not the runner's git config user. Interactive asks: take over / abort. | **Take over** — set `assignee` to the runner. Record `assignee_takeover: <old> → <new>` in the run report. | Whoever is executing the batch is the effective operator. Ownership follows execution. |
| **Existing local branch** `feat/US-NNN-<slug>` with **no story-related commits** (empty tree matches integration branch). Interactive asks: switch / delete-recreate / abort. | **Delete and recreate** — same as v0.8.0 interactive's most common answer. Record `branch_recreated: reset from <sha> to origin/<integration>`. | An empty local branch is stale; the runner needs a clean slate. |
| **Existing local branch** with **story-related commits** already present (matches `US-NNN` in commit messages). Interactive asks: switch / delete / abort. | **Switch and resume** — take the existing work forward. Record `branch_resumed: from <sha>`. | Prior in-progress work should not be discarded by an automated run. |
| **Story-picked-up by another dev** (someone else has already committed to the branch with a different `git config user.email`). Interactive asks (in current v0.8.0 flow: it doesn't ask, it just uses the local branch state). | **Refuse — abort** with `AUTONOMOUS_ABORT: story branch has commits from another dev (<their email>); manual coordination required`. | Autonomous mode must never trample another human's work. This is one of the safest-default cases. |

The Developer subagent adds its own catalog inside its charter (§ 5.4), covering ambiguities it might otherwise raise via `AskUserQuestion`.

### 5.3 Abort scenarios (no safe default)

**Two sources of abort — one uniform handling by the orchestrator:**

1. **Orchestrator-detected aborts** — the orchestrator hits an infrastructure condition below during its own steps (before or after the subagent call).
2. **Subagent-returned aborts** — the Developer subagent returns `AUTONOMOUS_ABORT: <reason>` as its entire response (see §5.4 for the subagent-side abort catalog).

Both paths converge on the **same orchestrator handling** in the run-report emission step: outcome `aborted`, story reset to `status: ready`, no push, no PR, the exact abort-reason line placed under the run-report's `Blockers` subsection. The orchestrator does not distinguish upstream in the report — it names the source (`Blockers: AUTONOMOUS_ABORT: <reason>` for subagent aborts; `Blockers: <specific message>` for orchestrator-detected ones). Story-file `## Autonomous run —` section still gets emitted, so the audit trail records the abort.

Orchestrator-detected abort cases (each aborts with `AUTONOMOUS_ABORT: <reason>` recorded in the run report; story is reset to `status: ready`; no push, no PR):

- **Working tree dirty** at command start (`git status --porcelain` non-empty). Structural guard from v0.6.0; interactive mode also refuses. Autonomous keeps the same guard for the same reason.
- **Story not in `status: ready`**. Same as interactive.
- **Story is `status: retired`**. Same as interactive (v0.8.0 addition).
- **Multiple sprints in `status: active`** (should never happen; refuse identically to interactive).
- **`assignee_takeover` would be from an already-in-progress-elsewhere state** (see the table above).

### 5.4 Developer subagent behavior in autonomous mode

The charter gains a section that says:

- On any decision the subagent would ordinarily ask about (test framework choice when none exists, whether to add a new dependency not called out in ADRs, whether an interpretive edge in the acceptance file is A or B), **return exactly one line**: `AUTONOMOUS_ABORT: <one-line reason>` — no other text, no code, no partial work.
- On any decision covered by a documented default (using an existing test framework, following an ADR-mandated pattern, respecting the confirmed stack), proceed without asking.
- On completion, return the same structured payload as interactive mode (`branch`, `commits`, `tests_added`, `pr_body`, optional `adr_proposal`) plus a new `autonomous_decisions` list — each entry `{ decision: <label>, chosen: <value>, reason: <one line> }`. Empty when nothing autonomous had to be decided.
- No fabrication: if the subagent cannot cover a Gherkin scenario, it does not shim a passing test; it aborts.

### 5.5 The run-report section (appended to the story file)

Rendered from a new template `skills/conclave/templates/autonomous-run.template.md` (see §6). Appended to the story file's body, after any existing sections. Format:

```markdown
## Autonomous run — 2026-07-06T15:23:11Z

- **Outcome**: done | blocked | aborted
- **Branch**: feat/US-042-jwt-middleware
- **PR**: https://github.com/foo/bar/pull/123   *(present when outcome == done)*
- **Duration**: 4m 22s
- **Runner**: gio (git config user.email = gio@example.com)
- **Config source**: config.md commands.dev.interactive = false  *(or "--no-interaction CLI flag")*

### Autonomous decisions

- Assignee takeover: alice → gio
- Existing branch (no story commits) → recreated from origin/main

### Files touched

- src/middleware/jwt.ts (new, 47 lines)
- tests/middleware/jwt.test.ts (new, 6 tests)

### Tests

- Gherkin scenarios covered: 3/3
- Suite: `pnpm test` → 342 pass, 0 fail
- Lint: 0 warnings

### Blockers  *(only present when outcome != done)*

- AUTONOMOUS_ABORT: <reason>  *(one line — the subagent's exact abort message, verbatim)*
- Or: Test suite failure: <one line summary + first failing test name>
- Or: Agent tool error: <one line + upstream error class>
```

Order of sections is fixed. Every subsection has a fallback when its data is empty:
- No autonomous decisions → `- (none)`
- No files touched (aborted before code writes) → `- (none)`
- No tests run (aborted before test phase) → `- (none — aborted before test phase)`

### 5.6 `/conclave-sprint` Phase 2 change

Phase 2's Agent-per-story dispatch always injects `INTERACTIVE = false` into the per-story task prompt, regardless of `commands.dev.interactive` in `config.md`. The command doc gains a paragraph noting this: sprint runs are inherently batched, so per-story interactive prompts would freeze the batch.

Concretely: in Phase 2's task-prompt template, add: *"Autonomous mode is forced ON for this Phase 2 dispatch (`INTERACTIVE = false`), overriding config.md. Follow the autonomous-mode contract from `commands/conclave-dev.md` and produce the same run-report section on the story file."*

Result: `/conclave-sprint` finishes without ever asking the user anything, and each story file gains a `## Autonomous run —` section documenting exactly what happened.

### 5.7 Layout de archivos

```
commands/
  conclave-dev.md              # MODIFICAR — CLI flag parse, INTERACTIVE resolution, autonomous defaults, run-report emit
  conclave-sprint.md           # MODIFICAR — Phase 2 injects INTERACTIVE = false into per-story dispatch
skills/conclave/
  agents/
    developer.md               # MODIFICAR — new "How you operate in autonomous mode" section
  templates/
    config.template.md         # MODIFICAR — new commands: block + prose section
    autonomous-run.template.md # NUEVO — the run-report section template
  SKILL.md                     # MODIFICAR — §3 note on autonomous mode, §5 new template listed
README.md                      # MODIFICAR — quick-start snippet mentions the CLI flag
CHANGELOG.md                   # MODIFICAR — [Unreleased] / v0.9.0 entry
.claude-plugin/plugin.json     # MODIFICAR — version bump
.claude-plugin/marketplace.json # MODIFICAR — version bump + description text
site/content/en/commands/
  dev.mdx                      # MODIFICAR — CLI flag + config field + example run-report block
site/content/es/commands/
  dev.mdx                      # MODIFICAR — same, Spanish
site/content/en/
  configuration.mdx            # MODIFICAR — document the commands:.dev.interactive field
site/content/es/
  configuration.mdx            # MODIFICAR — same, Spanish
```

## 6. Archivos a crear o modificar *(Files to create / modify)*

| Ruta | Accion | Proposito | Ejemplo del proyecto a seguir |
|---|---|---|---|
| `commands/conclave-dev.md` | MODIFICAR | CLI flag parse, `INTERACTIVE` resolution, autonomous defaults at existing `AskUserQuestion` sites, run-report emission | Existing Step 3 (Load context) — extend it with the `commands.*` block resolution the same way `models.*` was added in v0.7.0 |
| `commands/conclave-sprint.md` | MODIFICAR | Phase 2 dispatch forces `INTERACTIVE = false` in every per-story task prompt | Existing Phase 2 dispatch step |
| `skills/conclave/agents/developer.md` | MODIFICAR | New "How you operate in autonomous mode" section covering the `AUTONOMOUS_ABORT` contract and abort catalog | Existing charter operating-mode sections (e.g. `product-manager.md` v0.8.0 gained `## How you operate inside /conclave-story`) |
| `skills/conclave/templates/config.template.md` | MODIFICAR | New `commands:` YAML block with commented-out `dev.interactive` and a `## Command configuration` prose section | Existing `ceremonies:` block for style; existing `## Model configuration` prose section from v0.7.0 for shape |
| `skills/conclave/templates/autonomous-run.template.md` | NUEVO | The run-report section template appended to a story file | v0.3.0's `verification-report.template.md` — same append-to-story-file pattern, similar structure |
| `skills/conclave/SKILL.md` | MODIFICAR | §3 catalog gains a "modes" column note; §5 template list gains `autonomous-run.template.md` | Existing §3 and §5 |
| `README.md` | MODIFICAR | Quick-start includes `/conclave-dev --no-interaction US-NNN` example; new "Autonomous runs" subsection under the delivery loop | Existing Quick-start section |
| `CHANGELOG.md` | MODIFICAR | `[Unreleased]` / v0.9.0 entry | `[0.8.0]` entry shape |
| `.claude-plugin/plugin.json` | MODIFICAR | Version `0.8.0` → `0.9.0` | Current version field |
| `.claude-plugin/marketplace.json` | MODIFICAR | Version bump; description mentions `--no-interaction` capability | Current description field |
| `site/content/en/commands/dev.mdx` | MODIFICAR | Document the flag, the config field, and show an example run-report | Existing dev.mdx style |
| `site/content/es/commands/dev.mdx` | MODIFICAR | Same, Spanish translation | ES sibling |
| `site/content/en/configuration.mdx` | MODIFICAR | Document the `commands:` block alongside `ceremonies:` and `models:` | Existing `models:` docs section |
| `site/content/es/configuration.mdx` | MODIFICAR | Same, Spanish | ES sibling |

### Detalle por archivo

#### `commands/conclave-dev.md`

Two surgical changes on top of v0.8.0:

**Change 1 — Step 0/1 flag parse and `INTERACTIVE` resolution.** After parsing story IDs from CLI args, scan the same arg list for `--no-interaction` / `--headless`. Remove any match from the ID list. Then read `config.md`'s `commands.dev.interactive` field (default `true` if absent). Compute `INTERACTIVE = (config.interactive != false) AND (no CLI flag)`. Print `Mode: autonomous` only when `INTERACTIVE = false`.

**Change 2 — Autonomous branching at every `AskUserQuestion` site.** For each existing prompt, wrap it: `if INTERACTIVE: AskUserQuestion(...); else: apply-default-from-§5.2-table-and-record-in-run-report`. For sites that have no safe default (§5.3), abort with `AUTONOMOUS_ABORT: <reason>`, reset story to `status: ready`, skip run-report file-writes past the outcome header, and proceed to the final report step.

**Change 3 — Developer-subagent task prompt suffix.** When `INTERACTIVE = false`, prepend: *"Autonomous mode. Do not call AskUserQuestion. If ambiguous, return `AUTONOMOUS_ABORT: <one-line reason>` as your entire response. Otherwise proceed and, in your normal payload, include an `autonomous_decisions` list of `{decision, chosen, reason}` triples covering every non-default choice you made."*

**Change 4 — Run-report emission (new Step 9.5).** Between the current Step 8 (story-status update to `review`) and Step 9 (final report), render `skills/conclave/templates/autonomous-run.template.md` and append it to the story file's body. This runs regardless of outcome — success, abort, or failure. On abort/failure, the story-status update in Step 8 changes to `ready` instead of `review`, and the run-report's `Outcome` field records what happened.

**Change 5 — Multi-story dispatch (Step 0).** Each concurrent Agent call for a story receives `INTERACTIVE = false` inherited from the parent invocation. No new per-story parsing.

**No mezclar**: do not change the batch-of-3 concurrency logic; do not change the guardrails; do not change the retired-story filter added in v0.8.0.

#### `commands/conclave-sprint.md`

One surgical change: in Phase 2's per-story Agent task template, inject a hard `INTERACTIVE = false` clause. The Phase 2 dispatch instruction becomes:

> Issue one Agent call per story in the same message. Each Agent call encapsulates the full single-story dev flow (Steps 1–9 of `/conclave-dev`) for that story **with `INTERACTIVE = false` forced ON regardless of `config.md`**. Follow the autonomous-mode contract from `commands/conclave-dev.md`.

**No mezclar**: no other phase changes. Phases 1, 3, 4 remain as today (they don't use `/conclave-dev`).

#### `skills/conclave/agents/developer.md`

New section appended at the end:

```markdown
## How you operate in autonomous mode

When the orchestrator's task prompt says `Autonomous mode`:

1. **Never call `AskUserQuestion`.** If you were about to, choose one of two options:
   - Take the safest documented default (see catalog below) and proceed. Record the decision in the `autonomous_decisions` list of your final payload.
   - If no safe default applies, return exactly one line: `AUTONOMOUS_ABORT: <one-line reason>` — no other text, no partial code, no explanation. The orchestrator stops.

2. **Default catalog** — proceed without asking when:
   - The confirmed stack in `architecture.md` names a test framework and that framework is present in the repo → use it.
   - An ADR (in `conclave/product/adr/` or inline in `architecture.md`) mandates a pattern applicable to the story → follow the ADR.
   - An acceptance-file scenario has one obvious canonical interpretation given the story's title and technical notes → take it.

3. **Abort scenarios** — return `AUTONOMOUS_ABORT` when:
   - No test framework is present in the repo. Reason string: `no test framework detected; run interactively first to bootstrap`.
   - The story requires adding a new dependency not called out in an ADR. Reason: `new dependency required (<name>) not in any ADR; run interactively to approve`.
   - A Gherkin scenario has two plausible interpretations and no ADR / story text disambiguates. Reason: `ambiguous scenario "<name>": two plausible interpretations; run interactively`.
   - The architecture would need to change to make the story pass. Reason: `story requires architectural change; author an ADR via /conclave-adr first`.

4. **Do not fabricate.** If you cannot cover a Gherkin scenario with a real test, abort. Never write a test that passes vacuously.

5. **Autonomous decisions payload** — include a list in your final payload:
   ```yaml
   autonomous_decisions:
     - decision: "test framework selection"
       chosen: "vitest"
       reason: "already present in package.json; architecture.md Confirmed stack lists it"
     - decision: "handling of scenario 'invalid token'"
       chosen: "return 401 with JSON body { error: 'invalid_token' }"
       reason: "matches existing 401 handler in src/middleware/auth.ts:34"
   ```
   Empty list is fine (`autonomous_decisions: []`) — you did not have to decide anything unusual.

Interactive mode (the default) is unaffected by this section — you may still use `AskUserQuestion` and the orchestrator will surface the prompt to the user.
```

**No mezclar**: do not touch the existing operating-mode sections, do not touch the discipline-based routing note.

#### `skills/conclave/templates/config.template.md`

Add after the existing `models:` block:

```yaml
# Command behavior (optional). Omit this block entirely to keep interactive mode for every command.
# Only /conclave-dev honors this in v0.9.0; other commands ignore the block.
commands:
  dev:
    interactive: true          # false = never call AskUserQuestion; apply sensible defaults or abort with a reason
```

And add a prose section at the bottom:

```markdown
## Command configuration

`commands:` (optional) controls per-command interaction behavior.

### `commands.dev.interactive` (v0.9.0+)

Default: `true`. When `false`, `/conclave-dev` runs in **autonomous mode** — it never calls `AskUserQuestion`. Every prompt it would ordinarily raise is replaced by a documented sensible default (assignee takeover, branch recreate/resume, etc.); ambiguities without a safe default abort the story with `AUTONOMOUS_ABORT: <reason>` and reset it to `status: ready`. A per-run report is appended to the story file as a `## Autonomous run — <ISO>` section.

Set to `false` when running `/conclave-dev` from CI, from `/conclave-sprint`'s Phase 2 (Phase 2 forces autonomous regardless of this setting), or when you want a hands-off "let it run" flow. Interactive mode remains the default for direct terminal use.

You can also force autonomous for a single invocation without editing `config.md` via the CLI flag: `/conclave-dev --no-interaction US-NNN` (or `--headless` as a synonym).
```

**No mezclar**: leave the `ceremonies:` and `models:` blocks untouched.

#### `skills/conclave/templates/autonomous-run.template.md` (NEW)

```markdown
## Autonomous run — {{iso_timestamp}}

- **Outcome**: {{outcome}}   *(done | blocked | aborted)*
- **Branch**: `{{branch}}`
{{#pr_url}}- **PR**: {{pr_url}}
{{/pr_url}}- **Duration**: {{duration_human}}
- **Runner**: {{runner_name}} ({{runner_email}})
- **Config source**: {{config_source}}   *(`config.md commands.dev.interactive = false` or `--no-interaction CLI flag`)*

### Autonomous decisions

{{#autonomous_decisions}}
- {{decision}}: {{chosen}} — {{reason}}
{{/autonomous_decisions}}
{{^autonomous_decisions}}
- (none)
{{/autonomous_decisions}}

### Files touched

{{#files}}
- `{{path}}` ({{change_type}}, {{lines}} lines)
{{/files}}
{{^files}}
- (none)
{{/files}}

### Tests

- Gherkin scenarios covered: {{scenarios_covered}}/{{scenarios_total}}
- Suite: `{{test_command}}` → {{test_pass_count}} pass, {{test_fail_count}} fail
- Lint: {{lint_summary}}

{{#has_blockers}}
### Blockers

{{#blockers}}
- {{blocker_line}}
{{/blockers}}
{{/has_blockers}}
```

Renders three possible `outcome` values:
- `done` — everything green. Section is fully populated. `PR` is present.
- `blocked` — subagent completed but tests failed / lint failed / scenario not covered. `PR` absent. Blockers section present with the failing evidence.
- `aborted` — subagent returned `AUTONOMOUS_ABORT` before writing code. Files / Tests sections show `(none — aborted before ...)`. Blockers section has the abort line.

The story's frontmatter `status` after the run: `review` on `done`, `ready` on `blocked` or `aborted`.

#### `skills/conclave/SKILL.md`

- §3 catalog: add a note next to `/conclave-dev` row: *"Reads `commands.dev.interactive` (v0.9.0+). Forced autonomous when invoked from `/conclave-sprint` Phase 2."*
- §5 template list: add `autonomous-run.template.md`.

**No mezclar**: leave the discipline-based-roles note, the model-config note, and the state-machine section untouched.

#### `README.md`

Add a short subsection under "Shipped so far" or "Delivery loop":

```markdown
### Autonomous mode for `/conclave-dev` (v0.9.0+)

```bash
# From your terminal, one-off
/conclave-dev --no-interaction US-042

# Or make it the default for the repo
# (edit conclave/config.md's commands.dev.interactive to false)

# Or run the entire sprint hands-off (Phase 2 forces autonomous)
/conclave-sprint
```

In autonomous mode, `/conclave-dev` never prompts. It applies documented sensible defaults at every decision point and aborts (with a specific reason) if an ambiguity has no safe default. Every autonomous run appends a `## Autonomous run — <date>` section to the story file with outcome, decisions taken, files touched, test/lint summary, and blockers if any.
```

**No mezclar**: leave the quick-start snippet's existing lines alone.

#### `CHANGELOG.md`

Add under `[Unreleased]`:

```markdown
### Added
- **Autonomous mode for `/conclave-dev`**: new `commands.dev.interactive: true | false` config field in `conclave/config.md` (default `true`); new CLI flag `/conclave-dev --no-interaction US-NNN` (also `--headless`). When autonomous, the command never calls `AskUserQuestion` — it applies documented sensible defaults (assignee takeover, branch recreate/resume, etc.) at every decision site, and aborts with `AUTONOMOUS_ABORT: <reason>` when no safe default applies. A `## Autonomous run — <ISO>` section is appended to the story file with outcome, decisions taken, files touched, test/lint summary, and blockers.
- **`/conclave-sprint` Phase 2 forces autonomous mode** — regardless of `config.md`. Sprint dispatches are inherently batched; per-story prompts would freeze the batch.
- **New template `skills/conclave/templates/autonomous-run.template.md`** — the run-report section format.
- **New Developer-subagent operating mode**: "How you operate in autonomous mode" section in `agents/developer.md` documenting the `AUTONOMOUS_ABORT` contract and the four abort scenarios (no test framework, new dependency not in an ADR, ambiguous scenario, story requires architecture change).

### Changed
- `skills/conclave/templates/config.template.md` — new optional `commands:` block alongside `models:` and `ceremonies:`, with a `## Command configuration` prose section.
- `commands/conclave-dev.md` — argument parse handles `--no-interaction`/`--headless`; every existing `AskUserQuestion` site branches on `INTERACTIVE`; final report emits the new run-report section.
- `commands/conclave-sprint.md` — Phase 2 task prompt hard-codes `INTERACTIVE = false` for every per-story dispatch.
- `.claude-plugin/plugin.json` and `marketplace.json` — version bumped to `0.9.0`.
```

## 7. API Contract

Sin API surface — no aplica. The plugin has no HTTP layer. Everything is local markdown authoring + git.

## 8. Criterios de exito *(Success criteria)*

- [ ] `conclave/config.md` without a `commands:` block → `/conclave-dev US-NNN` behaves identically to v0.8.0 (interactive, no run report, no `Mode:` line).
- [ ] `conclave/config.md` with `commands.dev.interactive: false` → `/conclave-dev US-NNN` prints `Mode: autonomous`, never calls `AskUserQuestion`, appends a `## Autonomous run —` section to the story file. `--no-interaction` explicit flag → same result.
- [ ] Interactive config + `--no-interaction` CLI flag → autonomous (CLI overrides config).
- [ ] Autonomous config + no CLI flag → autonomous (no toggle to opt back into interactive per-invocation).
- [ ] Assignee mismatch in autonomous → auto-take-over; `autonomous_decisions` records `assignee_takeover: <old> → <new>`.
- [ ] Existing local branch with no story commits → recreated from integration branch; recorded in `autonomous_decisions`.
- [ ] Existing local branch with prior story commits → resumed; recorded.
- [ ] Story branch has commits from another dev's email → `AUTONOMOUS_ABORT`; story stays `ready`; no push.
- [ ] No test framework in repo → Developer subagent returns `AUTONOMOUS_ABORT: no test framework detected; run interactively first to bootstrap`; story stays `ready`.
- [ ] Test suite fails at end → outcome `blocked`; run-report `Blockers` section has the failing-test summary; story frontmatter `status: ready`.
- [ ] All scenarios pass → outcome `done`; story frontmatter `status: review`; PR opened.
- [ ] `/conclave-sprint` on a sprint with 3 ready stories, `config.md` has `commands.dev.interactive: true` (or absent) → Phase 2 still forces autonomous; each story file gains a `## Autonomous run —` section with `Config source: forced by /conclave-sprint Phase 2`.
- [ ] `/conclave-sprint` Phase 2 on 3 stories where one fails (abort or blocked) → other two proceed; failed story's run report is written; final sprint summary shows all three with their outcomes.
- [ ] Re-running `/conclave-dev US-NNN --no-interaction` after a prior autonomous run → new `## Autonomous run —` section appended; prior section preserved.
- [ ] `CHANGELOG.md`, `README.md`, `SKILL.md`, and both site MDX pages updated.

### Tests requeridos

No automated test suite exists for this plugin (`CLAUDE.md` §"Development commands"). All scenarios above are verified manually.

### Comandos de verificacion

```bash
claude plugin validate .   # must pass after edits

# In a scratch target repo with v0.8.0 conclave/ setup and one ready story US-001:

# 1. Default behavior — no change vs v0.8.0
/conclave-dev US-001
# → interactive prompts fire; no "Mode:" line printed; no autonomous-run section

# 2. Ad-hoc autonomous via CLI flag
/conclave-story new                    # create a fresh US-002 (interactive still works)
/conclave-dev --no-interaction US-002
# → "Mode: autonomous" printed; no prompts; story file gains "## Autonomous run —" section

# 3. Config-driven autonomous
# Add to conclave/config.md:
#   commands:
#     dev:
#       interactive: false
/conclave-story new                    # US-003
/conclave-dev US-003
# → "Mode: autonomous" printed; same behavior as case 2

# 4. Sprint-forced autonomous
# (config.md's commands.dev.interactive can be true or false — doesn't matter)
/conclave-sprint
# → Phase 2 dispatches all ready stories in autonomous mode; each story file
#   gains a "## Autonomous run —" section; no user prompts fire during Phase 2

# 5. Abort case — no test framework
# In a fresh repo with no package.json / no test config:
/conclave-dev --no-interaction US-004
# → Developer subagent returns AUTONOMOUS_ABORT; story stays ready;
#   run-report section has "Blockers: AUTONOMOUS_ABORT: no test framework detected; run interactively first to bootstrap"
```

## 9. Criterios de UX *(UX criteria)*

### Loading

- **Interactive mode**: no `Mode:` line printed (same as v0.8.0). Silent default.
- **Autonomous mode**: `Mode: autonomous` printed once, immediately after `Models:` line (or in place of it if no model resolved).

### Formularios

Interactive mode: `AskUserQuestion` prompts fire as today.

Autonomous mode: **zero prompts**. Every current prompt site applies a default from §5.2 or aborts per §5.3.

### Passwords

No aplica — no credentials involved.

### Errores

Every autonomous-mode error has a specific message and is recorded in the run report's Blockers section:

- `AUTONOMOUS_ABORT: <reason>` — verbatim from the Developer subagent's return.
- `Working tree dirty. Stash or commit your local changes, then re-run.` — same as interactive (structural).
- `Test suite failure: <summary>` — from the Dev subagent's test-run outcome.
- `Agent tool error: <upstream message>` — from Claude Code's Agent tool failing.

On any error/abort, story frontmatter `status: ready`. Never leave the story mid-state.

### Navegacion

No aplica — text-only CLI.

### Accesibilidad

No aplica — text-only CLI.

## 10. Decisiones tomadas *(Decisions made — locked)*

| Decision | Why |
|---|---|
| Scope limited to `/conclave-dev` in this iteration | Explicit user decision. Concentrates the risk in one command that the user is comfortable operating; other commands can follow the same pattern in v0.10.0. |
| Config field name `commands.dev.interactive` (default `true`) rather than `commands.dev.autonomous` (default `false`) | Interactive is the intuitive default from a REPL/CLI mental model; new users' `config.md` reads as "yes it's interactive" without needing to grok autonomous. The double-negative (`interactive: false`) at opt-in time is worth this trade. |
| CLI flag `--no-interaction` (with `--headless` as a synonym) rather than `--autonomous` | Consistent with the config-field naming. `--headless` accepted because it's the industry term users search for. |
| No CLI flag to force interactive when config is autonomous | Asymmetry is intentional. A CI job with `interactive: false` in its `config.md` fork must not be able to hang on a stray flag. If you need interactive, use a different config or a different repo. **Future break-glass**: a `--force-interaction` flag *gated* to non-CI contexts (e.g. only honored when `stdin.isTTY`) could ship in a later version if teams hit the debugging pain frequently enough. Explicitly deferred here — the current asymmetry trades flexibility for safety and that trade is right for v0.9.0. |
| Sensible-defaults-else-abort, not "auto-decide-everything" | Explicit user decision. The auto-decide-everything option produces surprises; the abort-when-ambiguous option produces predictable outcomes. |
| Run report appended to the story file (not a separate file) | Explicit user decision. Keeps all story-related history in one location; the acceptance file already carries QA verification history, so the story file is the natural home for dev-run history. Diffeable in the PR that closes the story. |
| Terminal + story-file report (both) | Terminal for immediate visibility; story-file for durable audit trail. Neither alone is enough. |
| Story stays `ready` (not a new `aborted` status) on abort | No state-machine change is worth this. `ready` correctly says "a dev could pick this up next." Re-runnability is preserved. |
| `/conclave-sprint` Phase 2 forces autonomous | Sprint dispatches are inherently batched; any prompt would freeze the batch. This is not a config option — it is a structural property of Phase 2. |
| Developer subagent uses `AUTONOMOUS_ABORT: <reason>` sentinel rather than a structured YAML abort | Matches the `SPLIT_UNSAFE:` sentinel pattern from v0.8.0. Single-line sentinels are unambiguous to parse and unmistakable to a human reading logs. |
| No dry-run mode in this iteration | Explicit exclusion. Dry-run is a different capability (plan without acting) — it would need a whole new artifact and doesn't compose with autonomous mode cleanly. |
| Two abort scenarios in the orchestrator, four in the subagent charter | The orchestrator aborts on infrastructure conditions (dirty tree, wrong branch owner); the subagent aborts on knowledge gaps (missing framework, ambiguous scenario). This split matches "who has the information" — the orchestrator sees git state; the subagent sees the story's semantics. |
| Story-file run-report is append-only | Consistent with v0.3.0's QA verification report and v0.1.0's `SKILL.md` §2 invariants. Never overwrite audit history. |

## 11. Edge cases

### Datos invalidos

- `--no-interaction` in the middle of the arg list (`/conclave-dev US-001 --no-interaction US-002`) → parse it the same as if it were positional. Extract the flag, keep both IDs.
- `--no-interaction --headless` (both flags) → both mean the same thing; treat as one flag, no double-processing.
- `config.md` has `commands.dev.interactive: "false"` (string instead of boolean) → treat any string equal to `"false"` (case-insensitive) as `false`; anything else as `true`. Print `WARNING: commands.dev.interactive should be a boolean; treating <value> as <resolved>.`
- `config.md` has `commands.dev.interactive: 0` (integer) → same treatment. `0` is `false`; anything else `true`. Same warning.
- `commands:` block present but `dev` sub-key absent → treat as if the whole block was absent (default interactive). No warning.
- `commands.dev.interactive: false` **and** `--no-interaction` flag → both resolve autonomous; no conflict; no warning.

### API errors / Agent call failures

- Developer subagent Agent call errors (crashes, throws, upstream Claude Code failure) → outcome `blocked`; run-report Blockers section says `Agent tool error: <upstream message>`; story `status: ready`.
- Subagent returns `AUTONOMOUS_ABORT: <reason>` → outcome `aborted`; run-report Blockers section has the exact abort line; story `status: ready`; no push, no PR.
- Subagent returns malformed structured payload (missing `autonomous_decisions` key, etc.) → treat as if `autonomous_decisions: []`; render `(none)` in that section; do not fail the run for this alone.

### Sin conexion

- `git push` or `gh pr create` fails in autonomous mode → outcome `blocked`; run-report Blockers has `Push failed: <git error>` or `PR create failed: <gh error>`. Story `status: ready`. Local commits stay in place — the operator can retry the push manually.
- Test-suite run fails to execute because the test command itself is missing → outcome `blocked`; Blockers has `Test command failed to execute: <error>`. Story `status: ready`.

### Timeout

- Long-running Developer subagent → inherits Claude Code session's default Agent timeout. If it hits it, outcome `blocked`; Blockers has `Subagent timed out after <duration>`. Story `status: ready`.

### Respuesta vacia o inesperada

- Subagent returns an empty payload (no code, no tests, no abort line) → outcome `blocked`; Blockers has `Subagent returned no payload`. Story `status: ready`.
- Subagent returns `AUTONOMOUS_ABORT` with an empty reason → treat reason as `<no reason given by subagent>` and record; story aborts as normal.

### Doble submit / re-run

- Re-running `/conclave-dev US-NNN --no-interaction` after a prior autonomous run that ended `blocked` or `aborted` → resume flow (existing branch with story commits → resume default); new `## Autonomous run —` section appended; prior section preserved verbatim.
- Re-running `/conclave-dev US-NNN` (interactive) after a prior autonomous `aborted` → interactive mode resumes with `AskUserQuestion` prompts as today. The prior autonomous-run section stays in the story file — it is history, not state.

## 12. Estados de UI requeridos *(Required UI states)*

No aplica — text-only CLI. Observable states:

- **Terminal `Mode:` line** — printed once when autonomous (silent when interactive).
- **Story-file section** — one per autonomous run, appended to body.
- **Story-frontmatter `status`** — transitions as today: `ready → in-progress → review` on success; stays `ready` on abort/blocked (autonomous does not introduce a new state).
- **Terminal final summary** — compact `+`/`-` bullet format:
  ```
  Mode: autonomous
  US-042: ✓ done
  + Branch: feat/US-042-jwt-middleware
  + PR: https://github.com/foo/bar/pull/123
  + Decisions: 2 (assignee_takeover, branch_recreated)
  + Tests: 6/6 pass, lint clean
  + Duration: 4m 22s
  ```
  On failure:
  ```
  Mode: autonomous
  US-042: ✗ aborted
  + Reason: AUTONOMOUS_ABORT: no test framework detected; run interactively first to bootstrap
  + Story status reset to: ready
  + Full report: conclave/sprints/SPRINT-005/stories/US-042-jwt-middleware.md § "Autonomous run — <ISO>"
  ```

## 13. Validaciones *(Validations)*

### Validaciones de cliente

| Campo | Regla | Mensaje |
|---|---|---|
| CLI flag `--no-interaction` / `--headless` | Optional; appearing more than once is a no-op (idempotent) | (no message) |
| `config.commands.dev.interactive` type | Boolean expected. Coercion table applied by the resolver in §5.1, with a warning on every non-boolean input:<br>• `true` (boolean) → `true` (interactive) — no warning, default behavior<br>• `false` (boolean) → `false` (autonomous) — no warning<br>• `"true"` / `"false"` (strings, case-insensitive) → boolean equivalent + warning<br>• `1` / `0` / any non-zero integer → `true` / `false` + warning<br>• any other value → treated as `true` (interactive fallback) + warning<br>Absent field entirely → `true`, silent | `WARNING: commands.dev.interactive should be a boolean; treating <value> as <resolved>.` |
| `AUTONOMOUS_ABORT` line | If subagent returns any additional text after the sentinel line, the orchestrator uses only the first line and ignores the rest | (no message; recorded verbatim first-line in run report) |
| Run-report `Outcome` field | One of `done | blocked | aborted` | Enforced by orchestrator when rendering; malformed → renders as `blocked` with `Blockers: internal error rendering outcome` |
| Working tree dirty | Non-empty `git status --porcelain` | `Working tree is dirty. Stash or commit your local changes, then re-run.` — same message as v0.6.0 interactive mode |

### Validaciones de servidor

No aplica.

## 14. Seguridad y permisos *(Security & permissions)*

- **No secrets involved** — the config field is a boolean and the CLI flag is a string toggle. Neither carries credentials or PII.
- **No new file-write scope** — the story file is already writable by `/conclave-dev` (it updates frontmatter). Appending a body section uses the same permission.
- **No new git-write scope** — the same `git push` / `gh pr create` used today.
- **Autonomous mode never bypasses the QA gate** — a `done` outcome from `/conclave-dev` still puts the story in `status: review`; `/conclave-qa` still has to pass before the story can move to `verified` or `done`. Autonomous mode is a UX affordance for the dev phase, not a bypass of the delivery loop.
- **Autonomous mode never merges the PR** — same as interactive mode. The Tech Lead PR review (when required) is still the merge gate.
- **The "story picked up by another dev" refusal is a safety mechanism** — the abort catalog in §5.2 refuses to trample another human's commits even when nothing else in the flow blocks. This is unique to autonomous mode; interactive mode today would ask.

## 15. Observabilidad y logging *(Observability & logging)*

- **Terminal output** — the `Mode:` line + the compact final summary. This is the primary short-term visibility.
- **Story-file `## Autonomous run —` section** — the durable audit trail, committed to git via the same PR that closes the story. `git log -- conclave/sprints/SPRINT-NNN/stories/US-NNN-*.md` shows the sequence of autonomous runs.
- **Warnings** for malformed config values (§13) → terminal only, not persisted to the story file.
- **Never log** — no secrets involved; config values are safe to echo.
- **`autonomous_decisions` list is the audit surface** — every non-default choice the subagent made is captured. A future reader can trace exactly which decisions were autonomous vs. what was baked into the story before the run.

## 16. i18n / textos visibles *(i18n / user-facing copy)*

No aplica — no translation-key system in the plugin. All new user-facing text (`Mode: autonomous`, `AUTONOMOUS_ABORT: <reason>`, run-report section headings, terminal summary) is English plain text. The two site MDX pages get translated Spanish prose matching the existing site pattern (technical terms like `AskUserQuestion`, `AUTONOMOUS_ABORT`, `--no-interaction` stay in English even in ES prose).

## 17. Performance

- **Config-read overhead**: one additional key lookup in the existing `config.md` read step — negligible.
- **CLI parse overhead**: one linear pass over the arg list for the flag — negligible.
- **Autonomous-mode dispatch**: the Developer subagent's prompt gains a preamble paragraph (~200 tokens). Absorbed in the model call cost.
- **Run-report writing**: one file append after Step 8. Sub-millisecond markdown I/O.
- **Terminal summary rendering**: string formatting only. No I/O beyond stdout.
- **Aggregate**: autonomous mode has no measurable overhead vs. interactive when nothing forces a prompt today. In practice, the majority of `/conclave-dev` runs never trip an interactive prompt anyway — autonomous just removes the "what if it does" tail latency in batch scenarios.

## 18. Restricciones *(Restrictions / hard "do not" rules)*

The implementer must NOT:

- [ ] Add a `status: aborted` value to the story state machine — the terminal state after abort is `ready`, same as today's interactive abort.
- [ ] Change the batch-of-3 concurrency logic in `/conclave-dev` Step 0 or `/conclave-sprint` Phase 2.
- [ ] Make the `commands:` block or the `dev.interactive` field required — absence means interactive (default).
- [ ] Add autonomous mode to `/conclave-qa`, `/conclave-pr-review`, `/conclave-planning`, `/conclave-story`, or `/conclave-adr` in this release. Same-shape follow-ups can ship as v0.10.0 and later.
- [ ] Allow autonomous mode to skip the QA gate. The story ends the dev flow at `status: review` on success — QA verification is still required to move to `verified` or `done`.
- [ ] Allow autonomous mode to merge the PR. Same rule as interactive mode.
- [ ] Auto-retry an aborted or blocked story from within the same command invocation. The operator decides whether and when to retry.
- [ ] Fabricate a test to pass an ambiguous scenario. The Developer subagent must abort on true ambiguity.
- [ ] Skip the `## Autonomous run —` section on any autonomous invocation — even aborts and errors get a section (with `Outcome: aborted` or `blocked` and the reason).
- [ ] Delete or modify prior `## Autonomous run —` sections when appending a new one. Append-only invariant.
- [ ] Make the terminal `Mode:` line print in interactive mode. Silence is the interactive-mode signal.
- [ ] Skip the `CHANGELOG.md` entry or any of the doc updates called out in §6.

## 19. Entregables *(Deliverables)*

- [ ] `commands/conclave-dev.md` — CLI-flag parse, `INTERACTIVE` resolution, autonomous defaults at every `AskUserQuestion` site, subagent prompt suffix, run-report emission.
- [ ] `commands/conclave-sprint.md` — Phase 2 forces `INTERACTIVE = false` in every per-story Agent task.
- [ ] `skills/conclave/agents/developer.md` — new "How you operate in autonomous mode" section.
- [ ] `skills/conclave/templates/config.template.md` — new `commands:` block + `## Command configuration` prose section.
- [ ] `skills/conclave/templates/autonomous-run.template.md` — new template file.
- [ ] `skills/conclave/SKILL.md` — §3 catalog note; §5 template list gains `autonomous-run.template.md`.
- [ ] `README.md` — new "Autonomous mode" subsection.
- [ ] `CHANGELOG.md` — `[Unreleased]` / v0.9.0 entry.
- [ ] `.claude-plugin/plugin.json` and `marketplace.json` bumped to `0.9.0`; marketplace description mentions `--no-interaction` capability.
- [ ] `site/content/en/commands/dev.mdx` and `site/content/es/commands/dev.mdx` — CLI flag + config field + example run-report.
- [ ] `site/content/en/configuration.mdx` and `site/content/es/configuration.mdx` — document the `commands:` block.
- [ ] `claude plugin validate .` passes after edits.
- [ ] Manual verification per §8 completed.

## 20. Checklist final para el agente *(Final agent checklist)*

Before delivering, verify:

- [ ] Read this spec end-to-end.
- [ ] Confirmed prerequisites (§4) exist.
- [ ] Modified only files listed in §6 — no unrelated refactors.
- [ ] `config.md` without a `commands:` block → zero behavioral change vs. v0.8.0.
- [ ] Every existing `AskUserQuestion` site in `/conclave-dev` has an `if INTERACTIVE else default-or-abort` branch. No site left interactive-only.
- [ ] Developer subagent's charter has the autonomous-mode section, and the orchestrator's task prompt suffix references it.
- [ ] `AUTONOMOUS_ABORT: <reason>` return path is handled by the orchestrator: story reset to `ready`, no push, run-report `Outcome: aborted`.
- [ ] `/conclave-sprint` Phase 2 injects `INTERACTIVE = false` regardless of `config.md`.
- [ ] Run-report section is appended (never overwrites); frontmatter `status` updated correctly per outcome; PR opened only on `done`.
- [ ] Terminal `Mode:` line prints only when autonomous.
- [ ] Config values `"false"` / `"true"` (strings) accepted with a warning; boolean is the documented shape.
- [ ] `CHANGELOG.md` and all named doc pages reflect the new behavior in both EN and ES.
- [ ] Plugin manifest version fields bumped to `0.9.0`.
- [ ] No scratch files, TODOs, or transient notes left under `docs/`, `commands/`, `skills/`, or `site/`.
