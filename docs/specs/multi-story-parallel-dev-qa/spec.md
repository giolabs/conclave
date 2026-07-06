# Multi-Story Parallel Dev & QA

> **Estado:** DRAFT
>
> **Status:** PENDING PROPOSAL/CHANGE — no OpenSpec change has been generated yet. Run `/openspec-propose` (or `/opsx:propose`) using this spec as input.

## 1. Objetivo *(Goal)*

Extend `/conclave-dev` and `/conclave-qa` to accept multiple `US-NNN` story IDs in a single invocation and execute each story's subagent **concurrently** (batched at ≤ 3 at a time), giving a developer or QA engineer the ability to drive an entire group of stories — each on its own independent branch with its own PR — in the time it would otherwise take to handle one. Each story's execution remains identical to the current single-story flow; the change is exclusively in the orchestrating loop.

The single-story invocation path (e.g. `/conclave-dev US-001`) stays completely backward-compatible — no flag, no new command, same output as today.

## 2. Alcance *(Scope)*

### Incluido en esta fase

- `/conclave-dev` accepts any number of space-separated `US-NNN` args (`/conclave-dev US-001 US-002 US-003`). Single-story path is a degenerate case (N=1).
- `/conclave-qa` accepts any number of space-separated `US-NNN` args (`/conclave-qa US-004 US-005`). Same degenerate case applies.
- Stories are validated **upfront** before any Agent call is dispatched — if any `US-NNN` arg fails validation, the whole invocation is refused with a per-story error list.
- Stories are dispatched in **batches of ≤ 3**: the first batch fires as concurrent Agent calls; the orchestrator waits for all to complete before firing the next batch.
- Failures are **isolated per story**: a failed story is reset to `status: ready` and surfaced in the summary; other stories in the batch continue unaffected.
- The updated guardrail: refuse a story only if that exact `US-NNN` is already `in-progress` on an existing branch — not because other stories are in-progress on other branches.
- A **final summary table** is printed after all batches complete, showing per-story outcome (branch, PR URL or error).
- Doc updates required by `CLAUDE.md`'s "Release notes and doc updates" rule: `skills/conclave/SKILL.md`, `README.md`, `CHANGELOG.md`, `site/content/en/commands/dev.mdx`, `site/content/en/commands/qa.mdx`, `site/content/es/commands/dev.mdx`, `site/content/es/commands/qa.mdx`.
- Plugin version bump to `0.6.0`.

### Fuera de scope

- **A new `--all` flag** that auto-selects every `ready` story in the sprint — this is explicitly deferred; the user passes IDs explicitly in this phase. Reason: explicit user decision, simpler to reason about what will run.
- **Cross-story dependency ordering** — stories passed in one invocation are assumed independent. Concurrent execution of dependent stories is the caller's responsibility. No dependency graph or sequencing within a batch.
- **A hard cap enforced by the command itself** — the batch-of-3 mechanic handles load naturally; no artificial rejection of "too many" stories is added.
- **Changes to `developer.md`, `qa.md`, `designer.md`, or `devops.md` agent charters.** The subagents themselves are entirely unchanged — only the orchestrating commands change.
- **A `--parallel` opt-in flag** — multi-story is the natural behavior when multiple IDs are passed; no flag is required. Single-story is the degenerate case.
- **Changing `/conclave-planning` or `/conclave-pr-review`** — neither is touched.
- **Umbrella-branch or combined-PR model** — one branch and one PR per story, always.

## 3. Tecnologias y convenciones del proyecto *(Technologies & conventions)*

### Stack

- **Plugin logic**: markdown only — no runtime, no application code. Commands are markdown files consumed by Claude Code.
- **Concurrency primitive**: issuing multiple `Agent` tool calls in a single message causes Claude Code to run them concurrently. Batching means issuing ≤ 3 `Agent` calls per message, then waiting for all to return before the next message.

### Versiones relevantes

| Dependency | Version | Source |
|---|---|---|
| Conclave plugin | 0.5.0 → **0.6.0** (this change) | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` |
| `conclave_version` (per-install artifact schema) | unchanged (no new artifact schema fields) | `skills/conclave/templates/config.template.md` |

### Patrones existentes a respetar

- **Single-story path untouched**: when `N=1`, the new orchestrating loop degenerates to the exact existing step sequence. No behavior changes for single-story callers.
- **Validate-before-dispatch**: the current commands validate story state (Step 2) before spawning the subagent (Step 6). The multi-story path validates ALL stories before dispatching ANY Agent call — no partial-batch starts while another story in the same batch is still failing validation.
- **Append-only artifacts**: each story's verification report, story-frontmatter commit, and PR are independently written per story — same as today.
- **Guardrails prose style**: new and updated guardrail bullets follow the existing imperative-sentence style (`Do not...`, `Never...`).

## 4. Dependencias previas *(Prerequisites)*

- [ ] `commands/conclave-dev.md` exists in current shipped form (v0.5.0).
- [ ] `commands/conclave-qa.md` exists in current shipped form (v0.5.0, including UAT generation, CI-wait, and the `pending_uat` verdict from the prior spec).
- [ ] `skills/conclave/agents/developer.md`, `designer.md`, `devops.md`, `qa.md` exist in current shipped form — this spec does not modify them.
- [ ] All stories passed by the user must be in the **same active sprint**.
- [ ] Git working tree is clean before invocation (same prerequisite as today's single-story flow).

## 5. Arquitectura *(Architecture)*

### Patron

Prose-orchestrated subagents (unchanged). The change is purely in the orchestrating command's outer loop: instead of one Agent call per invocation, the command now fires ≤ 3 concurrent Agent calls per batch, collects results, fires the next batch, and prints a unified summary.

### Capas afectadas

| Layer | Affected? | Description |
|---|---|---|
| Commands (`commands/conclave-dev.md`) | Yes | New multi-story outer loop (validation wave, batch dispatch, result collection, summary). Single-story path is unchanged. |
| Commands (`commands/conclave-qa.md`) | Yes | Same outer loop pattern as `conclave-dev.md`. |
| Agent charters (`skills/conclave/agents/*.md`) | No | Entirely unchanged. |
| Templates | No | Entirely unchanged. |
| Methodology doc, repo docs, site docs | Yes | Per §2's doc-update list. |
| All other commands | No | Untouched. |

### Flujo esperado — multi-story path (N > 1)

**`/conclave-dev US-001 US-002 US-003 US-004`**:

1. **Parse args.** Collect the list `STORY_IDS = [US-001, US-002, US-003, US-004]`. If only one ID is present, fall through to the existing single-story steps with no change.
2. **Validate all stories upfront.** For each story in `STORY_IDS`, the orchestrator directly reads the sprint and story files (no Agent call — this is pure file I/O by the orchestrating command itself). Check: story exists in the active sprint, status is `ready`, no existing `in-progress` branch for that `US-NNN`. Collect per-story validation results. If ANY story fails validation, print a table showing every story's status and stop — no subagent is dispatched.
3. **Batch.** Partition `STORY_IDS` into ordered batches of ≤ 3: `[[US-001, US-002, US-003], [US-004]]`.
4. **For each batch**, issue ALL the per-story Agent calls in a single message (concurrent). For each story in the batch, the Agent call is identical to today's single-story flow: mark `in-progress`, create branch, delegate to developer/designer/devops subagent, push, open PR, mark `review`. Each Agent call is fully self-contained and encapsulates all single-story steps (no sub-step numbers are referenced so future additions remain valid).
5. **Collect batch results.** After all calls in the batch complete, record per-story: `{ story_id, status: ok|failed, branch, pr_url, error }`.
6. **On failure**: reset that story's frontmatter to `status: ready` (best effort); record the error. Continue to the next batch.
7. **Repeat** for each batch until all stories are processed.
8. **Print final summary table.**

**`/conclave-qa US-004 US-005`** — identical outer loop, but each Agent call runs the full QA flow (UAT generation, CI wait, verification report, PR comment).

### Flujo esperado — single-story path (N = 1)

**`/conclave-dev US-001`** — falls through to the exact existing step sequence in `conclave-dev.md` with zero behavioral change. The multi-story outer loop is skipped entirely when only one ID is parsed.

### Layout de archivos afectados

```
commands/
  conclave-dev.md    # MODIFICAR — new outer loop before existing Step 1
  conclave-qa.md     # MODIFICAR — same outer loop pattern
```

No new files are created. No templates change. No agent charters change.

## 6. Archivos a crear o modificar *(Files to create / modify)*

| Ruta | Accion | Proposito | Ejemplo del proyecto a seguir |
|---|---|---|---|
| `commands/conclave-dev.md` | MODIFICAR | Multi-story outer loop (validation, batch dispatch ≤3, result collection, summary), updated guardrail | Existing Step 2 (validation) and Step 6 (Agent dispatch) patterns in the same file |
| `commands/conclave-qa.md` | MODIFICAR | Same outer loop pattern as `conclave-dev.md` | Existing Step 2 and Step 7 patterns in the same file |
| `skills/conclave/SKILL.md` | MODIFICAR | Update command signatures in §3 (role-to-subagent table) to show multi-ID form; note batch-of-3 rule | Existing §3 table rows |
| `README.md` | MODIFICAR | Update usage examples to show multi-story invocation | Existing `Quick start` section |
| `CHANGELOG.md` | MODIFICAR | Add `[Unreleased]` entry for v0.6.0 | Existing `[0.5.0]` entry shape |
| `site/content/en/commands/dev.mdx` | MODIFICAR | Document multi-story invocation, batch behavior, new guardrail | Existing command page prose |
| `site/content/en/commands/qa.mdx` | MODIFICAR | Same as above for QA | Existing command page prose |
| `site/content/es/commands/dev.mdx` | MODIFICAR | Spanish translation of same changes | Existing ES command page |
| `site/content/es/commands/qa.mdx` | MODIFICAR | Spanish translation of same changes | Existing ES command page |

### Detalle por archivo

#### `commands/conclave-dev.md`

Insert a new **Step 0 — Multi-story dispatch** block at the top, before the existing Step 1:

```
## Step 0 — Multi-story dispatch (skip if only one story ID is provided)

1. Collect all `US-NNN` arguments. If exactly one is present, skip this step entirely and proceed to Step 1 as today.
2. Validate all stories in parallel (each runs the equivalent of Steps 1–3 for its own ID). If any fails validation, print a per-story error table and stop.
3. Partition story IDs into batches of ≤ 3 (preserve order).
4. For each batch: issue one `Agent` call per story in the batch **in the same message** (concurrent). Each Agent call encapsulates Steps 1–9 of the current single-story flow for that story ID.
5. After all Agent calls in a batch return, record per-story results.
6. On any story failure: attempt to reset that story's `status: ready`; record the error; continue with remaining batches.
7. After all batches: print the final summary table (story ID | branch | PR URL | outcome).
8. Stop. (The individual story steps below were already handled inside each Agent call.)
```

Update the existing Guardrails section:
- Remove: *"Do not work multiple stories at once. If the user invokes `/conclave-dev` on a second story while another is still `in-progress` on the same branch, refuse."*
- Replace with: *"Refuse a story if that exact `US-NNN` is already `in-progress` on an existing branch — not because other stories are concurrently in-progress on other branches. Parallel stories on separate branches are permitted and expected."*

**No mezclar**: Steps 1–9 (single-story body) are unchanged in content — they are now executed inside each per-story Agent call during multi-story dispatch, or directly when N=1.

#### `commands/conclave-qa.md`

Identical Step 0 structure as `conclave-dev.md`, referencing Steps 1–9 of the QA flow. The QA-specific guardrails (no approve, no merge, append-only) are unchanged.

#### `skills/conclave/SKILL.md`

In the command descriptions table (§3), update the `/conclave-dev` and `/conclave-qa` rows to show the multi-story signature:
- `/conclave-dev US-NNN [US-NNN ...]` — pick up 1..N stories, ≤3 run concurrently per batch
- `/conclave-qa US-NNN [US-NNN ...]` — verify 1..N stories, ≤3 run concurrently per batch

Add a note: *"When N > 1, each story runs on its own branch with its own PR. Batches of ≤ 3 fire concurrently. Failures are isolated per story."*

#### `README.md`, `CHANGELOG.md`, `site/content/**/*.mdx`

Standard doc-update prose reflecting the new multi-story invocation form, batch-of-3 behavior, and updated guardrail. No structural or schema changes to document.

## 7. API Contract

Sin API surface — no aplica. This plugin has no HTTP layer. The `Agent` tool calls are an internal Claude Code mechanism, not an external API.

## 8. Criterios de exito *(Success criteria)*

- [ ] `/conclave-dev US-001 US-002` with both stories in `ready` state: two branches created (`feat/US-001-*`, `feat/US-002-*`), two PRs opened, both stories move to `status: review`. Observable proxy for concurrency: both PRs appear within seconds of each other rather than sequentially (verify via `gh pr list` timestamps).
- [ ] `/conclave-dev US-001 US-002 US-003 US-004` with all four in `ready` state: first batch of 3 fires concurrently, waits for all to complete, then the 4th fires alone. Final summary table shows all four.
- [ ] `/conclave-dev US-001` (single story): identical behavior to today — no change in output, no summary table, no batch logic visible.
- [ ] `/conclave-dev US-001 US-002` where `US-002` is already `in-progress`: `US-002` is refused in the upfront validation (with an error noting it is already in-progress), `US-001` is NOT dispatched, the whole invocation stops. *(Whole invocation fails if any validation fails.)*
- [ ] `/conclave-dev US-001 US-002` where the `US-002` subagent fails mid-execution (e.g. branch creation error): `US-001` completes normally, `US-002` is reset to `ready`, final summary table shows one success and one failure with the error text.
- [ ] `/conclave-qa US-003 US-004` with both stories in `review` state: two QA subagents fire concurrently, each on its own `feat/*` branch, each appending its own verification report and PR comment. Final summary shows both verdicts.
- [ ] A story passed to `/conclave-dev` that is NOT in the active sprint: the whole invocation is refused before any Agent call is dispatched.
- [ ] `CHANGELOG.md` and all named site-doc pages updated.

### Tests requeridos

No automated test suite exists for this plugin (`CLAUDE.md` §"Development commands"). All scenarios above are verified manually.

### Comandos de verificacion

```bash
ln -s "$(pwd)" ~/.claude/plugins/conclave   # restart Claude Code after this

# In a scratch target repo with an active sprint and multiple ready stories:
#   1. /conclave-dev US-001              -> single-story, behavior unchanged
#   2. /conclave-dev US-001 US-002       -> two branches, two PRs, both concurrent
#   3. /conclave-dev US-001 US-002 US-003 US-004 -> batch-of-3 then 1
#   4. /conclave-dev US-001 US-002       where US-001 is already in-progress
#      -> whole invocation refused at validation; no Agent call dispatched
#   5. /conclave-qa US-003 US-004        -> two concurrent QA runs, two PR comments
#   6. Simulate one subagent failure (pass a malformed story file)
#      -> other story in the batch completes; failed story resets to ready; summary shows both
#   7. /conclave-dev US-001 US-001  -> treated as /conclave-dev US-001 with one deduplication warning
```

## 9. Criterios de UX *(UX criteria)*

### Loading

Multi-story runs produce no new interactive prompts. The user sees the normal per-story output from each Agent call (Agent tool output is surfaced by Claude Code), followed by the orchestrator's final summary table.

### Formularios

No new interactive prompts introduced. The existing `AskUserQuestion` calls (e.g. "story already exists — resume?" in `/conclave-dev` Step 4) apply per-story within each Agent call. If one story triggers an `AskUserQuestion`, that story's Agent call blocks until the user responds; other concurrent stories in the same batch are unaffected (they finish independently).

### Passwords

No aplica.

### Errores

- **Validation failure (upfront)**: a per-story table shows each story's status and why it failed. The entire invocation stops. Example:
  ```
  US-001 — PASS (ready)
  US-002 — FAIL: story not found in active sprint
  US-003 — FAIL: status is in-progress (already claimed)
  Refusing all stories. Fix the above and re-run.
  ```
- **Runtime failure (mid-batch)**: the orchestrator catches the error from the Agent call, records it, resets the story to `ready` (best effort), and notes it in the final summary. Remaining stories in the batch and future batches continue.
- **All stories fail**: final summary shows all failures. No partial state is left unexplained.

### Navegacion

No aplica — text-only CLI.

### Accesibilidad

No aplica — text-only CLI.

## 10. Decisiones tomadas *(Decisions made — locked)*

| Decision | Why |
|---|---|
| Space-separated args, no flag or `--all` | Explicit user decision — user picks which stories to parallelize. `--all` deferred to a future phase. |
| Separate branch and PR per story (no umbrella branch) | Explicit user decision — independent branches keep stories reviewable and deployable independently; no cross-story merge conflicts. |
| Fully concurrent within each batch (all ≤ 3 fire in the same message) | Explicit user decision — maximize velocity; each story is fully independent. |
| Batch size of 3 | Explicit user decision — balances throughput against context window pressure and API load. |
| Failures are isolated per story, not "stop all" | Explicit user decision — a single flaky story should not block unrelated work. |
| Upfront validation before any Agent dispatch | Not explicitly requested but follows directly from "refuse a story only if that exact US-NNN is already in-progress" — checking all stories first prevents a batch where 2 of 3 succeed and 1 fails due to an easily-catchable validation error, leaving half-done state. |
| Single-story path (N=1) is the exact same step sequence as today | Backward-compatibility — no existing workflow, docs, or team habit breaks. |
| Agent charters unchanged | The subagents already handle one story correctly. The multi-story behavior is entirely in the orchestrating layer. Keeping charters unchanged means the change is surgical and auditable. |

## 11. Edge cases

### Datos invalidos

- Duplicate IDs in the same invocation (`/conclave-dev US-001 US-001`): detected in validation, treated as one story (deduplication). The duplicate is noted with a warning.
- Non-existent story ID: caught in upfront validation; whole invocation refused.
- Story in wrong sprint: caught in upfront validation; whole invocation refused.

### API errors

No aplica — no HTTP surface.

### Git errors

- Branch already exists locally for a story (not `in-progress` in frontmatter): the existing `AskUserQuestion` in Step 4 of the single-story flow applies — the per-story Agent call asks the user to resume, recreate, or abort. The user's answer applies to that story only; other stories in the batch are unaffected.
- `git push` failure for one story: the error is surfaced, that story's result is `failed` in the summary; other stories are unaffected.

### Sin conexion

- `gh pr create` fails for one story (network error): that story is marked `failed` in the summary; its local branch and commits remain intact. The user can re-run `/conclave-dev US-NNN` for that story alone to retry the PR step.

### Timeout

No bounded timeout is introduced. Each Agent call runs until completion or failure, same as today.

### Respuesta vacia o inesperada

- Agent call returns no output or an unrecognized structure: treat as a failure for that story; reset to `ready`; record in summary.

### Doble submit

- Running `/conclave-dev US-001 US-002` again after a prior run where both stories reached `status: review`: both stories are in `review`, not `ready` — the upfront validation catches this and refuses (`status: review` is not an eligible state for `/conclave-dev`). Same behavior as today's single-story refusal.

## 12. Estados de UI requeridos *(Required UI states)*

No interactive UI states beyond the existing per-story output. The one new user-visible artifact is the final summary table, rendered as plain text after all batches complete:

```
| Story  | Branch                  | PR                            | Outcome |
|--------|-------------------------|-------------------------------|---------|
| US-001 | feat/US-001-login       | https://github.com/…/pull/42  | ✓ done  |
| US-002 | feat/US-002-profile     | https://github.com/…/pull/43  | ✓ done  |
| US-003 | feat/US-003-settings    | (no gh) run: gh pr create …   | ✓ done  |
| US-004 | feat/US-004-search      | —                             | ✗ failed: branch create error |
```

## 13. Validaciones *(Validations)*

### Validaciones de cliente

| Campo | Regla | Mensaje |
|---|---|---|
| Story IDs list | All IDs must exist in the active sprint | `US-NNN — FAIL: story not found in active sprint` |
| Story status | Must be `ready` (dev) or `review` (qa) | `US-NNN — FAIL: status is <current status>` |
| Story `in-progress` check | Exact `US-NNN` must not already be `in-progress` on an existing branch | `US-NNN — FAIL: already in-progress on feat/US-NNN-<slug>` |
| Duplicate IDs | Same ID passed twice | Deduplicate silently + print one warning line |
| Active sprint | At least one active sprint must exist | Same error as current single-story flow |

### Validaciones de servidor

No aplica.

## 14. Seguridad y permisos *(Security & permissions)*

Same posture as today: no credential or permission enforcement is added. Each story's Agent call runs as the same git user. The guardrail update (per-branch isolation) does not introduce or remove any access control — it only relaxes the "one story at a time" constraint to "one branch per story at a time."

## 15. Observabilidad y logging *(Observability & logging)*

- **Log (new)**: the final summary table is printed to the terminal after all batches complete. It is the only new user-visible artifact from the orchestrator layer; per-story output from each Agent call is surfaced as before.
- **Log (existing)**: each story's branch, commits, and PR remain the audit trail, exactly as today.
- **Never log**: nothing new to exclude — same rules as today.
- **Failure trace**: when a story fails, its Agent call's error is quoted in the summary row under "Outcome". No additional logging infrastructure.

## 16. i18n / textos visibles *(i18n / user-facing copy)*

No aplica — no translation-key system in this plugin; all new text is English. The summary table and validation-error messages are English plain text. The docs site updates (`site/content/es/`) will be translated prose matching the existing ES page style.

## 17. Performance

The dominant new cost is N concurrent Agent calls within a batch. Claude Code already supports multiple concurrent Agent calls in a single message. The batch-of-3 cap prevents unbounded resource use. Wall-clock time for an N-story run is approximately `ceil(N/3)` × single-story time, rather than N × single-story time (assuming comparable story complexity).

No polling, no debouncing, no main-thread concerns beyond what already exist in the individual story flows (CI wait in `/conclave-qa` is unchanged).

## 18. Restricciones *(Restrictions / hard "do not" rules)*

The implementer must NOT:

- [ ] Change any agent charter (`developer.md`, `qa.md`, `designer.md`, `devops.md`) — multi-story is orchestrator-layer only.
- [ ] Change the single-story step sequence inside `conclave-dev.md` or `conclave-qa.md` — Step 0 is prepended; Steps 1–N are unchanged.
- [ ] Implement an umbrella-branch or combined-PR model — one branch, one PR per story, always.
- [ ] Add a hard rejection for "too many" stories — the batch-of-3 mechanic handles load naturally.
- [ ] Change any template — no template touches in this spec.
- [ ] Let a validation failure in one story silently allow other stories to dispatch — if any story fails upfront validation, the whole invocation stops before any Agent call is dispatched.
- [ ] Mark a failed story as anything other than `status: ready` after reset — do not leave it `in-progress`.
- [ ] Skip the `CHANGELOG.md` entry or the doc updates this change requires per `CLAUDE.md`.

## 19. Entregables *(Deliverables)*

- [ ] `commands/conclave-dev.md` updated: new Step 0 (multi-story outer loop), updated guardrail.
- [ ] `commands/conclave-qa.md` updated: same Step 0 pattern, QA-specific guardrails unchanged.
- [ ] `skills/conclave/SKILL.md` updated: command signatures, batch-of-3 note.
- [ ] `README.md` updated: multi-story usage examples.
- [ ] `CHANGELOG.md` updated: `[Unreleased]` / v0.6.0 entry.
- [ ] `site/content/en/commands/dev.mdx` and `qa.mdx` updated.
- [ ] `site/content/es/commands/dev.mdx` and `qa.mdx` updated.
- [ ] Version bumps to `0.6.0` in `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`.
- [ ] Manual verification per §8 completed and reported.

## 20. Checklist final para el agente *(Final agent checklist)*

Before delivering, verify:

- [ ] Read this spec end-to-end.
- [ ] Confirmed all prerequisites (§4) are satisfied.
- [ ] Modified only files listed in §6 — no unrelated refactors.
- [ ] Single-story path (`N=1`) produces identical output to before — no regression.
- [ ] Batch-of-3 logic fires all calls in a batch concurrently (same message), not sequentially.
- [ ] Upfront validation stops the whole invocation if any story fails — no partial dispatch.
- [ ] Failed story reset to `status: ready` (best effort) with error in summary.
- [ ] Updated guardrail is present in both `conclave-dev.md` and `conclave-qa.md`.
- [ ] No agent charter was modified.
- [ ] No template was modified.
- [ ] Final summary table is printed after all batches.
- [ ] `CHANGELOG.md` and all named doc pages reflect the new behavior.
- [ ] Version bumped in both plugin manifest files.
- [ ] No temporary notes, TODOs, or scratch files left in `docs/`, `commands/`, or `skills/`.
