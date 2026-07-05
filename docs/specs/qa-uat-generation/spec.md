# QA-Generated UAT Test Suites Run Through the Target Repo's Own CI

> **Estado:** DRAFT
>
> **Status:** PENDING PROPOSAL/CHANGE — no OpenSpec change has been generated yet. Run `/openspec-propose` (or `/opsx:propose`) using this spec as input.

## 1. Objetivo

Extend the QA role charter (`skills/conclave/agents/qa.md`) and `/conclave-qa` so that verifying a story means **generating real, CI-runnable UAT test artifacts from the story's Gherkin scenarios, committing them, and gating the verdict on the target repo's own CI actually running them** — not on QA executing anything itself. Concretely, per story: a backend/multi story gets its endpoints added to one evolving, project-wide Postman collection run headless via Newman in CI; a frontend/multi story gets a Playwright spec run headless in CI; every frontend/backend/multi story gets a generated `UAT.md` summarizing what CI reported once it concludes; a mobile story — which has no CLI-runnable automated runner — gets a `UAT.md` authored as a manual functional checklist that a human tester executes and records a verdict into. Any test failure (CI red, or a human-recorded mobile fail) rejects the story: it stays in `review`, the QA blockers section records what failed with evidence, and the dev (or tester) must act before the gate can pass.

## 2. Alcance

### Incluido en esta fase

- Add **`mobile`** as a new valid value of the story `discipline` field (today `frontend | backend | qa | design | devops | multi`, defined in `commands/conclave-planning.md`, `commands/conclave-dev.md`, `skills/conclave/SKILL.md`, `docs/specs/discipline-based-roles/spec.md`). `/conclave-dev` routes `mobile` to `developer.md`, the same bucket as `frontend`/`backend` — no new mobile-specific developer charter ships in this phase (see Fuera de scope). The only discipline-aware behavior this spec adds is inside QA.
- New template `skills/conclave/templates/testing-environments.template.md` — a placeholder file naming which **CI environment variables** the generated tests read (base URLs, Postman variable-to-secret mapping, test-user identifiers and their CI secret names). QA never resolves a secret value itself in this design — CI does, using its own secrets store — a stronger security posture than earlier drafts of this spec.
- New template `skills/conclave/templates/uat-report.template.md`, rendered as `tests/uat/US-NNN-UAT.md` in the target repo — automated-run summary for frontend/backend/multi, manual checklist for mobile.
- `skills/conclave/agents/qa.md`: new responsibilities — generate/update the Playwright spec (frontend/multi) and the project-wide Postman collection (backend/multi), commit/push them, detect-or-propose the CI job that runs them, poll the resulting CI run to a bounded timeout, and fold the CI conclusion into the verdict. For `mobile`, generate the manual checklist and stop (no CI wait — see Decisiones tomadas).
- `commands/conclave-qa.md`: restructured step order (generate + push UAT artifacts happens *before* the verification report is written, so CI has something to run against); new `verdict: pending_uat` outcome (mobile checklist just generated, nothing failed yet, story stays in `review` without becoming a QA blocker); extended Guardrails carve-out for `tests/uat/`.
- `skills/conclave/templates/verification-report.template.md`: UAT section referencing the CI run and the generated `UAT.md`, not inline Playwright/Newman output.
- `skills/conclave/templates/definition-of-done.template.md`: new item requiring a passing `UAT.md` (or human-signed-off mobile checklist) before `done`.
- New `conclave/config.md` field `ceremonies.qa_verification.ci_wait_timeout_minutes` (default `20`) bounding how long a single `/conclave-qa` run polls CI before treating "no conclusion yet" as a blocker.
- Doc updates required by `CLAUDE.md`'s "Release notes and doc updates" rule: `SKILL.md`, `README.md`, `CHANGELOG.md`, `site/content/configuration.mdx`, `site/content/commands/qa.mdx`, `site/content/roles.mdx`, `site/content/state-machine.mdx` (new `pending_uat` note).

### Fuera de scope

- **A dedicated mobile developer/designer charter.** `mobile` stories still run through `developer.md` in `/conclave-dev` — this spec only teaches QA to branch its UAT behavior on `discipline == mobile`. Reason: explicit user decision — scope stays inside the QA gate, not a broader discipline-model rewrite.
- **QA executing tests locally.** The prior draft of this spec had QA run Playwright/Newman itself during `/conclave-qa`. This revision replaces that entirely: QA generates and commits artifacts, then waits for the target repo's real CI to run them. Reason: explicit user decision — "QA solo genera y espera al CI real," deliberately choosing the async/real-CI model over the faster-but-less-real local-execution model.
- **Provisioning or configuring the CI runner's target environment** (what URL a deployed preview/dev environment points at, how it's stood up). Same posture as the earlier draft — Conclave doesn't run infrastructure. CI's own job config is responsible for pointing `PLAYWRIGHT_BASE_URL`/`POSTMAN_API_BASE_URL` at whatever environment already exists.
- **General CI/CD pipeline authorship.** Adding/updating the one job that runs `tests/uat/` is the narrow exception QA is allowed (with human confirmation, mirroring the existing dependency-bootstrap pattern) — `devops.md`'s broader ownership of the pipeline is untouched.
- **A mobile automated runner** (Appium, Detox, Maestro, XCUITest/Espresso, etc.). Mobile UAT stays manual-checklist-only in this phase. Reason: explicit user decision ("mismo un UAT.md para testing funcional" for mobile, i.e. documentation, not automation).
- **Storing any secret value.** Only CI environment-variable *names* live in `testing-environments.md`, generated test files, the Postman collection/environment file, or `UAT.md`.
- **Real-time waiting beyond the configured timeout.** If CI hasn't concluded when the timeout elapses, QA reports `blocked` and stops — it does not keep the session open indefinitely.
- **Changing `/conclave-dev` or `/conclave-pr-review`** beyond the one-line discipline-enum addition needed for routing `mobile` — both commands' own logic is otherwise untouched.

## 3. Tecnologias y convenciones del proyecto

### Stack

- **Plugin logic**: markdown only, as always — no runtime, no application code in this repo.
- **Mandated target-repo tooling** (unchanged framework choice from the prior draft, now used differently): `@playwright/test` (headless, run by CI, not by QA) and `newman` (the Postman collection-runner CLI, also run by CI). Both are dev dependencies of the **target** repo Conclave manages, bootstrapped by QA with human confirmation if absent — same as before.
- **New in this revision**: QA now also needs read/write access to the target repo's `.github/workflows/*.yml` (or equivalent CI config) to detect an existing UAT job or propose one, and to `gh` CLI to push commits, watch/poll a CI run, and pull failure logs.

### Versiones relevantes

| Dependency | Version | Source |
|---|---|---|
| Conclave plugin | 0.2.0 → **0.3.0** (this change) | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` |
| `conclave_version` (per-install artifact schema) | 0.2.0 → **0.3.0** | `skills/conclave/templates/config.template.md` |
| `@playwright/test` (target repo) | latest at bootstrap time — no pin mandated | Target repo's own `package.json` |
| `newman` (target repo) | latest at bootstrap time — no pin mandated | Target repo's own `package.json` |
| `gh` CLI | already an implicit dependency of `/conclave-qa` (Step 4 already calls `gh pr view`) | `commands/conclave-qa.md:54` |

### Patrones existentes a respetar

- **Detect-or-bootstrap with confirmation**: `developer.md`'s existing pattern, reused for both the Playwright/Newman dependency bootstrap (as before) and, new in this revision, for detecting-or-proposing the CI job itself.
- **Orchestrator writes, subagent proposes**: unchanged — the QA subagent returns file contents/results; `commands/conclave-qa.md` performs the `Write`/commit/push.
- **Never hardcode secrets**: extended further than the prior draft — QA now never even *reads* a secret value (not even from a local shell env var), since execution itself moved to CI. Only environment-variable *names* ever appear in anything QA writes.
- **Structural gates degrade gracefully**: same shape as the roster backward-compatibility rule and the prior draft's "`testing-environments.md` missing → UAT skipped, not a hard failure" rule — extended here to "no CI job configured yet → UAT skipped after the bootstrap-confirmation is declined."
- **`gh` already used for PR metadata inside `/conclave-qa`**: Step 4 (`commands/conclave-qa.md:54`) already runs `gh pr view --json ...statusCheckRollup` to read `CI_STATUS`. This spec's CI-wait mechanic extends that existing touchpoint rather than introducing a new integration surface.

## 4. Dependencias previas

- [ ] `skills/conclave/agents/qa.md`, `commands/conclave-qa.md`, `skills/conclave/templates/verification-report.template.md`, `skills/conclave/templates/definition-of-done.template.md` exist in current shipped form (they do).
- [ ] The `discipline` field on stories already ships (ADR-001 / `docs/specs/discipline-based-roles/spec.md`) — this change extends its enum, does not introduce the field.
- [ ] `gh` CLI is authenticated and available — already an implicit prerequisite of `/conclave-qa` today (`commands/conclave-qa.md:54`).
- [ ] The target repo has (or QA can bootstrap, with confirmation) some CI system capable of running on push/PR — this spec assumes GitHub Actions, matching this plugin's own `.github/workflows/deploy-docs.yml` precedent and `devops.md`'s existing `.github/workflows/*.yml` file references.
- [ ] `conclave/team/testing-environments.md` should exist with at least one non-placeholder environment-variable mapping before UAT is meaningfully enabled; its absence degrades gracefully (§11).

## 5. Arquitectura

### Patron

Prose-orchestrated subagents (unchanged). This revision restructures `/conclave-qa` into two phases instead of one: **(a) generate and push UAT artifacts**, then **(b) wait for CI on that push and read its conclusion** before composing the final verification report. Mobile skips phase (b) entirely — there is nothing bounded to wait for — and instead produces a `pending_uat` outcome that a second, later `/conclave-qa` run resolves once a human has filled in the checklist.

### Capas afectadas

| Layer | Affected? | Description |
|---|---|---|
| Commands (`commands/conclave-qa.md`) | Yes | Restructured step order, new `pending_uat` verdict branch, CI-wait mechanic, extended guardrails. |
| Commands (`commands/conclave-planning.md`, `commands/conclave-dev.md`) | Yes (minor) | Discipline enum gains `mobile`; `conclave-dev.md`'s routing table adds `mobile` → `developer.md` alongside `frontend`/`backend`. |
| Agent charters (`skills/conclave/agents/qa.md`) | Yes | New responsibilities: generate/update Playwright spec, generate/update project Postman collection, detect-or-propose CI job, poll CI, branch on discipline for the UAT strategy. |
| Templates | Yes | New: `testing-environments.template.md`, `uat-report.template.md`. Modified: `verification-report.template.md`, `definition-of-done.template.md`, `story.template.md` (discipline enum comment), `config.template.md` (new timeout field). |
| Target repo (outside `conclave/`) | Yes | `tests/uat/US-NNN.spec.ts` (frontend/multi), `tests/uat/api-collection.postman_collection.json` + `tests/uat/postman-environment.json` (backend/multi, evolving), `tests/uat/US-NNN-UAT.md` (all disciplines), possibly a new/updated `.github/workflows/*.yml` job. |
| Methodology doc, repo docs, site docs | Yes | Per §2's doc-update list. |
| `conclave-pr-review.md`, `designer.md`, `devops.md` | No | Untouched beyond the shared discipline enum growing by one value. |

### Flujo esperado

**`/conclave-qa US-NNN` (restructured):**

1. Steps 1–4 as they exist today (resolve workspace, resolve story, switch to dev branch, load context) — Step 4 additionally reads `conclave/team/testing-environments.md` and the existing `tests/uat/api-collection.postman_collection.json` (if present). Compute `UAT_ENABLED` (true unless `testing-environments.md` is missing/all-placeholder).
2. **New Step 5 — Generate UAT artifacts (subagent).** When `UAT_ENABLED` and `story.discipline` warrants it:
   - `frontend` or `multi` (or unset/legacy, treated as `multi` per existing precedent): generate/update `tests/uat/US-NNN.spec.ts`, translating every Gherkin scenario into a Playwright test case, reading `PLAYWRIGHT_BASE_URL` (or whatever variable name `testing-environments.md` declares) from `process.env` at **test run time in CI** — never resolved by QA.
   - `backend` or `multi`: merge new/updated requests for this story's endpoints into the single `tests/uat/api-collection.postman_collection.json` (never remove or overwrite other stories' requests), and ensure `tests/uat/postman-environment.json` declares (empty-valued) the variable names `testing-environments.md` maps to CI secrets.
   - `mobile`: generate `tests/uat/US-NNN-UAT.md` as a manual checklist (one row per Gherkin scenario, a checkbox, a "Tester" field, a "Result" field, a final "Overall result" line) and **stop here** — no CI wait, no Playwright/Newman involved.
   - Any discipline: if no CI job runs `tests/uat/` yet, propose the minimal addition/update to the target's CI config and get the orchestrator to confirm with the human via `AskUserQuestion` before writing it (mirrors the existing dependency-bootstrap pattern).
3. **New Step 6 — Commit and push the generated artifacts** (a distinct commit from the eventual verification-report commit, message `chore(US-NNN): generate UAT test artifacts`), so CI actually has something new to run against.
4. **New Step 7 — Wait for CI (skipped entirely for `mobile`).** Identify the CI run triggered by the Step 6 commit (`gh run list --commit $COMMIT_SHA`). Poll up to `ceremonies.qa_verification.ci_wait_timeout_minutes` (default 20):
   - CI concludes **success** → `CI_RESULT = passed`.
   - CI concludes **failure** → `CI_RESULT = failed`; pull a bounded failure excerpt (`gh run view <id> --log-failed`, capped at N lines per failed step) and the run URL as evidence.
   - No run found, or still running when the timeout elapses → `CI_RESULT = blocked` (treated the same as `failed` for verdict purposes — see Decisiones tomadas).
5. **Delegate to the QA subagent** (existing Step 5, renumbered) — same Gherkin/DoD read-through as today, now additionally given `CI_RESULT` (or, for `mobile`, the current state of `US-NNN-UAT.md` if this is a *second* run reading a human-filled checklist) to fold into the final verdict:
   - `mobile`, first run (checklist just generated, empty): `verdict: pending_uat`.
   - `mobile`, later run (checklist has a recorded "Overall result"): `passed` if the human recorded `PASS` and every case is checked; `blocked` otherwise, with the failing case(s) and tester notes as evidence.
   - `frontend`/`backend`/`multi`: `passed` only if both the existing Gherkin/DoD read-through passes **and** `CI_RESULT == passed`; `blocked` otherwise, with `CI_RESULT == failed`/`blocked` evidence folded into `failing_items`.
6. **Write outputs** (existing Step 6, renumbered) — unchanged shape (append report, update story frontmatter, PR comment, push), plus:
   - `verdict: pending_uat` → frontmatter `status` **stays `review`** (same as `blocked`), but the appended section is `## QA pending` (not `## QA blockers`) — it does not imply the dev did anything wrong, just that a human tester needs to complete `US-NNN-UAT.md` and someone should re-run `/conclave-qa US-NNN` afterward.
   - `verdict: blocked` with CI-sourced evidence → the `## QA blockers` bullet for that item includes the bounded log excerpt and the CI run URL, in addition to the existing scenario/DoD-item description.
7. **Report to the user** (existing Step 7, renumbered) — adds, when applicable: which CI run was checked and its conclusion, or (for `pending_uat`) an explicit instruction to fill in `tests/uat/US-NNN-UAT.md` and re-run.

### Layout de archivos nuevos

```
skills/conclave/templates/
  testing-environments.template.md   # NUEVO — CI env-var/secret NAME mapping, no values
  uat-report.template.md             # NUEVO — automated summary shape + manual checklist shape

(in the TARGET repo, written/updated by /conclave-qa)
conclave/team/
  testing-environments.md
tests/uat/
  US-NNN.spec.ts                        # Playwright, frontend/multi stories
  api-collection.postman_collection.json # ONE evolving file, backend/multi stories
  postman-environment.json              # ONE evolving file, variable NAMES only
  US-NNN-UAT.md                         # every discipline that has a UAT strategy
.github/workflows/
  <existing-or-new>.yml                 # QA proposes an addition/update, human confirms
```

## 6. Archivos a crear o modificar

| Ruta | Accion | Proposito | Ejemplo del proyecto a seguir |
|---|---|---|---|
| `skills/conclave/templates/testing-environments.template.md` | NUEVO | CI env-var/secret name mapping, no values | `skills/conclave/templates/roster.template.md` (frontmatter + closing "How to update" section) |
| `skills/conclave/templates/uat-report.template.md` | NUEVO | `US-NNN-UAT.md` shape, both automated-summary and manual-checklist variants | `skills/conclave/templates/verification-report.template.md` (existing report structure) |
| `skills/conclave/agents/qa.md` | MODIFICAR | UAT generation, CI-wait, mobile-checklist branch, secret-never-touched hard rule | n/a (in-place additions, detailed below) |
| `commands/conclave-qa.md` | MODIFICAR | New Steps 5–7 (generate/push/wait), `pending_uat` branch, extended guardrails | n/a |
| `commands/conclave-planning.md` | MODIFICAR | Discipline enum gains `mobile` | Existing enum line, `commands/conclave-planning.md:88` |
| `commands/conclave-dev.md` | MODIFICAR | Routing table: `mobile` → `developer.md` | Existing table, `commands/conclave-dev.md:63-66` |
| `skills/conclave/templates/story.template.md` | MODIFICAR | Discipline enum comment | Existing frontmatter comment |
| `skills/conclave/templates/config.template.md` | MODIFICAR | New `ci_wait_timeout_minutes` field | Existing `ceremonies.qa_verification` block |
| `skills/conclave/templates/verification-report.template.md` | MODIFICAR | UAT section now references the CI run + `UAT.md`, not inline output | Existing "Edge cases probed" section |
| `skills/conclave/templates/definition-of-done.template.md` | MODIFICAR | New item: passing `UAT.md` / signed-off mobile checklist required | Existing bullet list |
| `skills/conclave/SKILL.md` | MODIFICAR | §2 directory layout, §5 templates list, discipline enum, story-state note for `pending_uat` | n/a |
| `README.md`, `CHANGELOG.md` | MODIFICAR | Standard release-note requirements | Existing `[0.2.0]` entry shape |
| `site/content/configuration.mdx`, `commands/qa.mdx`, `roles.mdx`, `state-machine.mdx` | MODIFICAR | Document new field, new command behavior, new discipline, new transient state | Existing corresponding sections |

### Detalle por archivo

#### `skills/conclave/templates/testing-environments.template.md`

```markdown
---
status: living
last_updated_at: "{{iso_date}}"
---

# Testing environments

Names of the CI environment variables the generated UAT tests read at run time. QA never resolves or reads a secret value itself — CI does, from its own secrets store. Never put a real value here, only names.

## Environments

| Name | Playwright base URL env var | API base URL env var | Notes |
|---|---|---|---|
| TBD | TBD | TBD | Fill in before UAT is enabled — e.g. `PLAYWRIGHT_BASE_URL`, `API_BASE_URL`. |

## Postman variables

| Postman variable | Populated from CI secret/env var |
|---|---|
| TBD | TBD |

## Test users

| Label | Represents | CI secret/env var holding the credential |
|---|---|---|
| TBD | e.g. standard-user, admin, readonly | TBD |

## How to update

Edit the tables above with the exact names of environment variables/secrets already configured in your CI. Set the real values in your CI provider's secrets UI — never in this file.
```

#### `skills/conclave/templates/uat-report.template.md`

Two variants rendered by the same template depending on discipline:

```markdown
<!-- frontend / backend / multi variant -->
# UAT — US-NNN

- **Discipline:** {{discipline}}
- **CI run:** {{ci_run_url}} — **Result:** {{ci_result}}
- **Suites:** {{suite_list}}

| Scenario | Result | Notes |
|---|---|---|
| {{scenario}} | {{pass_fail}} | {{notes_or_evidence_excerpt}} |

<!-- mobile variant -->
# UAT — US-NNN (manual)

- **Discipline:** mobile
- **Tester:** _(fill in)_
- **Date:** _(fill in)_

| # | Scenario | Steps | Checked | Result |
|---|---|---|---|---|
| 1 | {{scenario}} | {{manual_steps}} | ☐ | _(PASS/FAIL)_ |

**Overall result:** _(PASS/FAIL — fill in once every case above is checked)_
```

#### `skills/conclave/agents/qa.md`

- New inputs: `conclave/team/testing-environments.md`, the existing `tests/uat/api-collection.postman_collection.json` (if present), `story.discipline`.
- New responsibilities inserted before "execute scenarios end-to-end": generate/update the Playwright spec and/or Postman collection per the discipline mapping in §5; for `mobile`, generate the manual checklist and produce `verdict: pending_uat` immediately.
- New hard rule: *"Never resolve, read, or write a secret value, under any circumstance — not even from a local shell environment. Test execution and secret resolution belong entirely to CI. Only environment-variable and CI-secret **names** ever appear in anything you write."*
- New hard rule: *"A CI conclusion of `failed` or `blocked` (no run found / timed out) is exactly as disqualifying as a Gherkin scenario failing by inspection — never mark `passed` on Gherkin grounds alone when `CI_RESULT` says otherwise."*
- New hard rule on the CI job itself: *"If no CI job runs `tests/uat/` yet, propose the minimal addition and let the orchestrator confirm with the human before it's written — this is the one narrow exception to never touching pipeline config; broader CI ownership stays with DevOps."*
- **No mezclar**: do not change the PR-comment-not-approval rules or the "never merge" guardrail — unaffected by this change.

#### `commands/conclave-qa.md`

- Insert new Steps 5–7 (generate artifacts, commit/push, wait-for-CI) between the existing Step 4 (load context) and the existing Step 5 (delegate to subagent), renumbering the rest.
- Step 6.2 (update story file) gains the `pending_uat` branch: frontmatter `status` stays `review`; append/replace a `## QA pending` section (distinct heading from `## QA blockers`) listing what's awaiting completion (which `UAT.md` file, whom to hand it to).
- Guardrails: extend the `tests/uat/` write carve-out to explicitly cover the Postman collection/environment files and `US-NNN-UAT.md`, and add: *"May propose (with human confirmation) an addition to `.github/workflows/*.yml` limited to running `tests/uat/` — no other pipeline changes."*
- **No mezclar**: PR-comment logic (existing 6.3) and the "never `gh pr review --approve`" rule are untouched.

#### `commands/conclave-planning.md`, `commands/conclave-dev.md`, `skills/conclave/templates/story.template.md`

One-line additions: the discipline enum literal grows from `frontend | backend | qa | design | devops | multi` to `frontend | backend | qa | design | devops | mobile | multi`; `conclave-dev.md`'s routing table adds a `mobile` row pointing at `developer.md`, in the same group as `frontend`/`backend`.

## 7. API Contract

Sin API surface — no aplica. This plugin has no HTTP layer of its own; the Postman collection QA maintains tests whatever API the **target repo** exposes, as already documented (or not) in that project's `conclave/product/architecture.md`. This spec does not define that API.

## 8. Criterios de exito

- [ ] `/conclave-qa US-NNN` on a `frontend` story with `testing-environments.md` configured generates/updates `tests/uat/US-NNN.spec.ts`, commits and pushes it, waits for CI, and only reaches `verified`/`done` when CI reports success.
- [ ] `/conclave-qa US-NNN` on a `backend` story merges its endpoints into the single evolving `tests/uat/api-collection.postman_collection.json` without disturbing other stories' requests, and gates on the same CI-wait mechanic.
- [ ] A `multi` story produces both artifacts and both are required to pass CI.
- [ ] A `mobile` story's first `/conclave-qa` run produces `verdict: pending_uat`, leaves `status: review`, generates the manual checklist, and does **not** attempt any CI wait.
- [ ] A second `/conclave-qa` run on the same mobile story, after a human has filled in `US-NNN-UAT.md` with `Overall result: PASS` and every case checked, produces `verdict: passed`.
- [ ] The same second run, if the human recorded `FAIL` on any case, produces `verdict: blocked` with that case quoted as evidence.
- [ ] CI reporting failure on a frontend/backend/multi story's generated tests produces `verdict: blocked` with a bounded log excerpt and the CI run URL in `## QA blockers`.
- [ ] No CI run is found (or the configured timeout elapses) → treated identically to a CI failure, never silently passed.
- [ ] No secret value ever appears in `testing-environments.md`, `tests/uat/*`, the verification report, or `US-NNN-UAT.md`.
- [ ] A story with `testing-environments.md` missing/placeholder behaves exactly as `/conclave-qa` does today — no UAT artifacts generated, no CI wait, no error.

### Tests requeridos

No automated test suite exists for this plugin (`CLAUDE.md` §"Development commands"). All scenarios above are verified manually.

### Comandos de verificacion

```bash
ln -s "$(pwd)" ~/.claude/plugins/conclave   # restart Claude Code after this

# In a scratch target repo with GitHub Actions already configured for basic CI:
#   1. testing-environments.md left as placeholder -> /conclave-qa US-NNN behaves exactly as before
#   2. Fill in testing-environments.md; run /conclave-qa on a `frontend` story
#      -> confirm tests/uat/US-NNN.spec.ts is generated, pushed, and the run waits for/reads real CI
#   3. Run on a `backend` story -> confirm api-collection.postman_collection.json gains this story's
#      requests without losing any pre-existing ones from a prior run
#   4. Run on a `mobile` story -> confirm verdict: pending_uat, status stays review, no CI wait attempted
#   5. Manually fill tests/uat/US-NNN-UAT.md with Overall result: PASS, all boxes checked, commit,
#      re-run /conclave-qa -> confirm verdict: passed
#   6. Intentionally break the pushed Playwright spec's target selector so CI fails ->
#      confirm verdict: blocked with the CI run URL + log excerpt in QA blockers
#   7. Point testing-environments.md at env vars with no matching CI job configured yet ->
#      confirm QA proposes a CI job addition and stops for AskUserQuestion confirmation
```

## 9. Criterios de UX

### Loading

No aplica — synchronous CLI. The CI-wait step introduces real wall-clock delay (up to `ci_wait_timeout_minutes`); no special progress UI beyond periodic status prints during polling (e.g. "Waiting for CI run #123... (2m elapsed)").

### Formularios

No aplica. New interactive prompt: the CI-job-bootstrap confirmation (`AskUserQuestion`, *"No CI job runs tests/uat/ yet. Add this step to <workflow file>?"*).

### Passwords

Covered under Seguridad (§14) — no password input UI; QA never touches a credential value in this design.

### Errores

- No CI run found for the pushed commit within a short grace period, or timeout elapsed → `blocked`, reason stated explicitly.
- CI job proposal declined by the human → UAT skipped for this run with a note; Gherkin-only verification still proceeds.
- Mobile checklist re-read but incomplete (not every case checked, no `Overall result` line) → treated as still `pending_uat`, not `blocked` — nothing to "fix," just not done yet.
- `testing-environments.md` missing/placeholder → non-blocking note, UAT skipped.

### Navegacion

No aplica.

### Accesibilidad

No aplica — text-only CLI.

## 10. Decisiones tomadas

| Decision | Why |
|---|---|
| QA generates and pushes UAT artifacts, then **waits for the target repo's real CI** to run them — it does not execute Playwright/Newman itself | Explicit user decision, overriding the earlier draft's "QA executes locally" default. Rationale given: verifying against what actually happens in CI is more trustworthy than a local run QA controls end-to-end. |
| `mobile` becomes a new `discipline` value | Explicit user decision — mobile needs a distinct UAT strategy (manual checklist, no CLI runner), and Conclave's existing discipline field is exactly the mechanism already used to branch story-level behavior (ADR-001). |
| Mobile UAT is a **human-authored/executed checklist**, not an automated suite | Explicit user decision — no mobile automation framework is mandated in this phase; `UAT.md` documents functional test cases for a human to run. |
| Mobile's checklist generation is a **separate, unbounded async step** from CI's **bounded** wait | A human filling a checklist has no predictable completion time the way a CI job does — treating it identically to the CI wait (with a timeout) would either hang forever or falsely time out a human who's still testing. `pending_uat` cleanly separates "nothing failed, just not done" from `blocked` ("something failed, dev must act"). |
| Postman collection is **one evolving, project-wide file**, updated (not replaced) per backend/multi story | Explicit user decision ("actualizar el postman collection") — matches how a real QA team maintains a single Postman workspace, avoids collection sprawl. |
| Playwright specs stay **one file per story** (`US-NNN.spec.ts`) | Unlike the Postman collection (naturally endpoint/resource-scoped), Playwright specs are naturally story/feature-scoped — no user instruction contradicted this, and it matches Playwright's own file-per-feature convention. |
| QA **never resolves a secret value**, not even from a local shell env var | Since execution moved entirely to CI, QA has no legitimate reason to ever see a real credential — strictly stronger than the earlier draft's "read from local env, never write it" rule. |
| A CI job addition/update is the **one narrow pipeline-authorship exception** QA is allowed, always with human confirmation | Necessary because running `tests/uat/` in CI requires *some* job to exist; keeping it narrow (only the UAT-running step) avoids QA drifting into DevOps's broader CI ownership. |
| A `BLOCKED`/timed-out/missing CI run counts against the verdict exactly like an explicit CI failure | Carried over from the earlier draft's core principle — an infrastructure gap must never be indistinguishable from a genuine pass. |

## 11. Edge cases

### Datos invalidos

- `testing-environments.md` has a malformed Postman-variable or env-var name → treated as "not configured" for that specific mapping; the affected suite is skipped for this run with a note, not guessed at.
- A story's `discipline` is empty/unset (pre-existing story) → treated as `multi`, same precedent as `conclave-dev.md`'s existing routing table — both Playwright and Postman artifacts are attempted.

### API errors

- The target's own API returning 4xx/5xx during the CI-run Newman execution is exactly what a scenario is asserting for — `PASS`/`FAIL` comes from whether the expected status was returned, not from the mere presence of an error status. This spec does not define the target's API contract.

### Sin conexion

- CI runner itself unreachable / `gh run list` fails to return data → `blocked`, "could not query CI," never silently treated as passed.

### Timeout

- CI hasn't concluded when `ci_wait_timeout_minutes` elapses → `blocked`, with the run left presumably still executing — the report notes the run URL so a human can check it later; re-running `/conclave-qa` later re-queries the same or a newer run.
- Mobile checklist left incomplete indefinitely → stays `pending_uat` forever until someone finishes it; this is intentional, not a bug (see Decisiones tomadas).

### Respuesta vacia o inesperada

- `gh run list --commit $COMMIT_SHA` returns zero runs (e.g. CI isn't wired to trigger on this branch/path) → `blocked`, "no CI run detected for this commit — check CI trigger configuration," distinct wording from an actual test failure so a human knows to look at pipeline wiring, not the test code.

### Doble submit

- Running `/conclave-qa US-NNN` again after a `pending_uat`/`blocked` outcome: unchanged append-only behavior — each run appends a fresh section (`## QA pending`, `## QA blockers`, or a passing report), never overwriting prior history.

## 12. Estados de UI requeridos

No aplica — no graphical UI. The story's `status` frontmatter gains no new *values* (still `review` throughout every outcome described here except a final pass) — only a new `verdict` distinction (`pending_uat` vs `blocked` vs `passed`) inside the report/QA-section text, documented for readers in `site/content/state-machine.mdx`.

## 13. Validaciones

### Validaciones de cliente

| Campo | Regla | Mensaje |
|---|---|---|
| `testing-environments.md` env-var mapping | Must name a real-looking variable, not `TBD` | Rows still `TBD` are "not configured" — that suite is skipped, not an error |
| `ceremonies.qa_verification.ci_wait_timeout_minutes` | Positive integer | Non-numeric/negative values fall back to the default (20) with a warning |
| Mobile `UAT.md` "Overall result" | Must be exactly `PASS` or `FAIL` once present | Anything else (blank, other text) is treated as still `pending_uat` |

### Validaciones de servidor

No aplica — no server of this plugin's own.

## 14. Seguridad y permisos

- **Secrets**: the strengthened core constraint of this revision — QA never resolves, reads, or writes a secret value at any point, in any file, at any step. Only variable/secret **names** appear in `testing-environments.md`, generated test files, the Postman collection/environment file, and `UAT.md`. Resolution happens entirely inside CI, using CI's own secrets store.
- **Sensitive payloads**: mobile checklist tester names/dates are the only new personally-identifying content this spec introduces, at the same exposure level as GitHub handles already committed to `roster.md`.
- **Permission checks**: none introduced — same posture as the prior draft.
- **CI job additions**: always gated behind an explicit human confirmation (`AskUserQuestion`) before being written — QA cannot silently expand its own footprint in `.github/workflows/`.

## 15. Observabilidad y logging

- **Log**: which CI run was checked (ID + URL) and its conclusion, which UAT files were generated/updated, and (for mobile) whose checklist is pending — all inside the verification report / `## QA pending` section, the plugin's existing "logging" mechanism.
- **Never log**: any secret value — impossible in this design by construction, since QA never resolves one.
- **Failure evidence**: bounded excerpts from `gh run view --log-failed` (cap the line count so the verification report and `UAT.md` don't balloon) plus a link to the full run for anyone needing the complete log.

## 16. i18n / textos visibles

No aplica — no translation-key system in this plugin; all new text is English.

## 17. Performance

The CI-wait step is the dominant new cost: `/conclave-qa` can now block for up to `ci_wait_timeout_minutes` (default 20) waiting on a real pipeline run. This is an accepted, explicit trade-off of the "wait for real CI" decision (§10), not a defect — the alternative (local execution) was explicitly rejected. No polling-interval value is mandated here; implementers should choose a reasonable interval (e.g. 15–30s) that doesn't spam `gh run view` calls.

## 18. Restricciones

The implementer must NOT:

- [ ] Have QA execute Playwright or Newman itself — it generates, commits, and pushes only; CI executes.
- [ ] Resolve, read, or write any secret value anywhere — only variable/secret names.
- [ ] Create a mobile automation framework or dependency — mobile stays manual-checklist-only this phase.
- [ ] Overwrite or remove other stories' requests when updating the shared Postman collection — merge only.
- [ ] Let `/conclave-qa` wait past `ci_wait_timeout_minutes` — treat elapsed timeout as `blocked` and stop.
- [ ] Treat an incomplete mobile checklist as `blocked` — it is `pending_uat` until a human explicitly records `FAIL`.
- [ ] Add or change any CI pipeline content beyond the single job/step that runs `tests/uat/`, and never without human confirmation first.
- [ ] Skip the `CHANGELOG.md` entry or the doc updates this change requires per `CLAUDE.md`.

## 19. Entregables

- [ ] `mobile` added to the discipline enum across `conclave-planning.md`, `conclave-dev.md` (routing), `story.template.md`, `SKILL.md`.
- [ ] New templates: `testing-environments.template.md`, `uat-report.template.md`.
- [ ] `qa.md` updated with generate/commit/wait/mobile-checklist responsibilities and the strengthened secrets rule.
- [ ] `conclave-qa.md` restructured with the new Steps 5–7, `pending_uat` branch, extended guardrails.
- [ ] `verification-report.template.md`, `definition-of-done.template.md`, `config.template.md` updated.
- [ ] `SKILL.md`, `README.md`, `CHANGELOG.md`, and the four named site-doc pages updated.
- [ ] Version bumps to `0.3.0`.
- [ ] Manual verification per §8 completed and reported.

## 20. Checklist final para el agente

Before delivering, verify:

- [ ] Read this spec end-to-end.
- [ ] Confirmed all prerequisites (§4) are satisfied.
- [ ] Modified only files listed in §6 (plus required doc/CHANGELOG updates) — no unrelated refactors.
- [ ] Every acceptance-criteria checkbox in §8 verified manually.
- [ ] Every edge case in §11 handled in the actual command/charter prose.
- [ ] No secret value appears anywhere in the diff, at any point in the flow.
- [ ] No CI pipeline change beyond the single UAT-running job/step, and only after human confirmation.
- [ ] The Postman-collection merge logic never drops another story's requests (spot-checked against a repo with 2+ prior backend stories).
- [ ] `pending_uat` is never conflated with `blocked` in any generated text.
- [ ] No locked decision from §10 changed without flagging it back to the user first.
- [ ] `CHANGELOG.md` and the named doc pages reflect the new behavior.
- [ ] No temporary notes, TODOs, or scratch files left in `docs/`, `commands/`, or `skills/`.
