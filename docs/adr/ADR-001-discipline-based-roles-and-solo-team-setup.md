# ADR-001: Discipline-Based Team Roles with Explicit Solo/Team Setup

- **Status**: accepted
- **Date**: 2026-07-03
- **Deciders**: Giolabs, <author>
- **Tags**: scrum, roles, disciplines, team-collaboration, roster, solo-mode, conclave-init
- **Stack**: Claude Code plugin (markdown commands + prose-orchestrated subagents), no runtime/backend — plugin logic lives in `commands/*.md` and `skills/conclave/{agents,templates}/*.md`; docs site is Astro 5 + Tailwind 4 (`site/`), unaffected by this decision.

## Context

Conclave's roster today (`skills/conclave/templates/roster.template.md`) is a fixed five-row Scrum-role table: Product Manager, Tech Lead, Scrum Master, Developer (×2), QA. This vocabulary is load-bearing across the whole plugin — it isn't just a label, it's the key every command and template uses to route work:

- `commands/conclave-spec.md` spawns Tech Lead and Product Manager subagents by name.
- `commands/conclave-planning.md` spawns Scrum Master, Product Manager, and Tech Lead subagents, and the Scrum Master charter (`skills/conclave/agents/scrum-master.md:79`) restricts story assignment to "people with the `Developer` role."
- `commands/conclave-dev.md` and `commands/conclave-qa.md` always resolve execution/verification to the same `developer.md` / `qa.md` charters regardless of what kind of work the story actually is.
- `commands/conclave-pr-review.md` is an entire command built around the Tech Lead role as the sole code-approval gate.
- Sign-off fields in `planning.template.md` (`pm_signoff`, `tl_signoff`, `sm_signoff`) and prose in `definition-of-ready.template.md`, `architecture.template.md`, `product-backlog.template.md`, and `ceremonies.template.md` all hard-code these five names.
- `site/src/content/docs/{en,es}/roles.md` and `methodology.md` document this same five-role model to end users, in both languages.

This model has two gaps surfaced during a product discussion with the maintainer:

1. **The roster doesn't reflect real project composition.** Every project — solo or team — actually has Frontend, Backend, QA, Designer, DevOps, and Tech Lead work, whether or not it has a dedicated Product Manager or Scrum Master. The current model forces every team to think in Scrum-role terms first, discipline second, which doesn't match how work is actually assigned or how a solo developer thinks about their own project.
2. **`/conclave-init` never asks whether this is a solo developer or a team.** It asks for a rough team size (2–3 / 4–6 / 7+) to pick a default `team_profile`, but never branches the actual roster-population flow. A solo developer answers the same multi-row roster questions a real team does.

The explicit design goal (per the maintainer, README.md's existing "no central server, no proprietary format, no hidden state" principle) is to make Conclave more genuinely collaborative for teams where each member runs their own local Claude Code session, **without** introducing a server, a lock protocol, or any component that breaks the git-only coordination model already documented in `CLAUDE.md` and `skills/conclave/SKILL.md` §2 ("Invariants every Conclave command must respect").

No `.rules/`, `.cursor/rules/`, or `.claude/skills/*/SKILL.md` architecture-encoding files exist in this repository beyond the plugin's own `skills/conclave/SKILL.md` and the repo's `CLAUDE.md` — both were read and are the only convention sources available; this is noted explicitly below since there is no `.rules/`-style enforcement to check code against.

## Decision

Introduce two additive changes to Conclave's founding-artifact model, both scoped to stay inside the existing git-only, markdown-only coordination model:

1. **Discipline-first roster.** `roster.template.md` gets a primary **Discipline** column with six always-present values — `Tech Lead`, `Frontend`, `Backend`, `QA`, `Designer`, `DevOps` — even when one person holds several. Product Manager and Scrum Master become an optional secondary **Process role(s)** column any roster member can additionally carry. Existing PM/TL/SM agent charters (`product-manager.md`, `tech-lead.md`, `scrum-master.md`) and the commands that invoke them (`conclave-spec.md`, `conclave-planning.md`, `conclave-pr-review.md`) are unchanged in *behavior* — only who is eligible to be spawned into that hat changes (any discipline-holder tagged with the process role, instead of a dedicated PM/SM row).

2. **Explicit solo-vs-team branch in `/conclave-init`.** A new question ("Is this just you, or a team?") is asked before roster population, stored as `team_mode: solo | team` in `config.md`. `solo` renders a single-row roster variant (one name against all six disciplines, `team_profile` forced to `lean`) and skips per-discipline assignment questions. `team` asks, for each of the six disciplines (Tech Lead, Frontend, Backend, QA, Designer, DevOps), who covers it via `AskUserQuestion` — collecting a name + GitHub handle per discipline, accepting `TBD` when a discipline isn't staffed yet, and allowing the same name to be entered against more than one discipline. It also asks who, if anyone, additionally holds the PM/SM process hats. The roster is written out complete — no placeholder rows left for the team to fill in by hand afterward, unlike today's behavior where `/conclave-init` seeds `{{name_N}}` / `@{{handle_N}}` placeholders for the user to edit post-hoc.

Collaboration itself stays exactly as it is today: async, via git. Each team member runs Conclave commands in their own local Claude Code session against their own clone; the roster, story `assignee`, and story `status` fields (already existing invariants — `skills/conclave/SKILL.md` §2) remain the only coordination mechanism, and PRs remain the sync point. This ADR does **not** add a lock file, a claim protocol, or any notification channel — see Alternatives Considered.

A third, smaller addition makes the discipline model load-bearing rather than cosmetic: `story.template.md` gets a `discipline: frontend | backend | qa | design | devops | multi` frontmatter field (alongside the existing `assignee` field), populated by whichever subagent creates the story (`conclave-spec.md` for founding stories, `conclave-planning.md`/`scrum-master.md` when stories are reassigned during planning). `conclave-dev.md` reads it to decide which execution charter to spawn — `developer.md` for `frontend`/`backend`/`multi`, and two **new** charters, `designer.md` and `devops.md`, for `design` and `devops` respectively. `qa.md` and `tech-lead.md` are unaffected — QA verification and the optional TL PR gate apply uniformly regardless of discipline.

## Alternatives Considered

| Option | Pros | Cons | Fit with detected stack |
|--------|------|------|------------------------|
| Discipline-first roster (chosen) | Matches real project composition; PM/SM become optional hats instead of mandatory rows; minimal charter churn (reuses `product-manager.md`, `scrum-master.md`, `tech-lead.md`, `qa.md`, `developer.md` as-is) | Touches most templates and two commands that keyed off Scrum-role names; existing installed `conclave/` directories need manual roster migration (no auto-migration tool in scope) | Fits the existing markdown-frontmatter convention (`CLAUDE.md` §"Adding a new slash command") — new fields, no new file formats |
| Drop PM/SM entirely; Tech Lead absorbs their functions | Simpler role vocabulary, fewer rows | Removes the two-perspective (business vs technical) parallel review that `conclave-spec.md` and `conclave-planning.md` are built around; would require rewriting both commands and retiring two charters — explicitly rejected by the maintainer during design discussion | Larger blast radius for no clear benefit given the "keep as optional hats" alternative achieves the same discipline-first goal |
| Split `developer.md` into `frontend.md` / `backend.md` charters | More discipline-specific guidance per charter | Doubles charter maintenance for two roles that today share 100% of their process (branch, implement, test, open PR) — the only difference is *what* they build, not *how* they work with Conclave | `developer.md` already reads `peer_pr_review.required` and roster context generically; a `discipline` field passed into that same charter achieves specialization without duplicating process rules |
| Per-story lock file for collaboration | Prevents two people claiming the same story simultaneously | Adds a new commit-and-check protocol (`locked_by` + timestamp + staleness handling) the team must maintain; still git-only but is new surface area the maintainer explicitly deprioritized in favor of reinforcing the existing `status: ready/in-progress` + PR flow | Existing `story.template.md` status field already does ~90% of this job; a lock adds ceremony without solving a problem the maintainer has hit yet |
| External notification channel (Slack webhook, custom service) | Real-time awareness across sessions without manual `git pull` | Breaks "no central server" principle unless piggybacked on infra the team already owns; out of scope for a plugin that ships with zero external dependencies | Explicitly rejected — conflicts with `README.md`'s stated no-server philosophy |

## Trade-offs

- **Coverage vs. churn**: the discipline-first roster is the right long-term shape but requires coordinated edits across ~9 templates, 3 commands, 1 skill doc, `README.md`, and 4 site docs (en/es × roles/methodology) to keep role vocabulary consistent — there is no single source of truth that could be changed once (the closest is `skills/conclave/SKILL.md`, which documents but does not enforce the vocabulary elsewhere).
- **Charter reuse vs. specialization**: reusing `developer.md` for both Frontend and Backend keeps charter count low (2 new files instead of 3+) at the cost of that charter being discipline-agnostic prose rather than tailored guidance; `designer.md` and `devops.md` are net-new because those disciplines have meaningfully different day-to-day work (no code diff / infra-and-CI focus) that the generic developer charter doesn't cover.
- **Explicit `team_mode` field vs. inferring solo from roster size**: an explicit `team_mode: solo | team` field in `config.md` makes downstream gating deterministic (e.g., a future check could refuse `peer_pr_review.required: true` when `team_mode: solo`) at the cost of one more field that must stay consistent with `team_profile` — mitigated by having `/conclave-init` set both from the same answer.
- **No auto-migration**: teams with an already-initialized `conclave/` directory (old five-role roster) are not migrated automatically by this decision. They keep working under the old vocabulary until they manually re-run roster setup or hand-edit `roster.md`; this is acceptable pre-1.0 but should be flagged in the PR description.

## Technical Gaps

- [ ] **No role-based permission enforcement exists today**: commands use the roster only to *pick* assignees/reviewers, never to *gate* an action against "does this user hold role X" — this ADR does not introduce enforcement either, it only changes the vocabulary being picked from. — Owner: TBD
- [ ] **No migration path for existing `conclave/` installs**: the old roster/story schema (no `discipline` field, five fixed Scrum-role rows) has no upgrade script. — Owner: TBD
- [ ] **`conclave-dev.md` does not yet branch on `discipline`**: today it always spawns `developer.md`; the routing to `designer.md`/`devops.md` based on the story's `discipline` field is new logic to add, not something that falls out of the template change alone. — Owner: TBD
- [ ] **Solo-mode roster rendering variant does not exist yet**: `roster.template.md` needs a second render path (single-person, all-disciplines) that `conclave-init.md` selects based on the new `team_mode` answer. — Owner: TBD

## Coding Proposal

This plugin has no controller/service/repository layers — there are no `.rules/`, `.cursor/rules/`, or architecture-encoding skills in this repo to validate against, so conventions below are inferred solely from `CLAUDE.md` §"Adding a new slash command" and `skills/conclave/SKILL.md` §§3–5 (role-to-subagent mapping, template list). The proposal maps the standard controller/service/repository shape onto this plugin's actual layers: **Command** (entry point) → **Agent charter** (execution logic) → **Template** (data contract) → **Skill/doc wiring** (registration).

### Command layer (equivalent to Controller)

`commands/conclave-init.md` — new step inserted before current Step 3 ("Gather the minimum info"):

```markdown
## Step 3a — Solo or team?
AskUserQuestion: "Is this just you, or a team?"
  - "Solo" -> team_mode: solo, team_profile: lean (forced), skip per-discipline assignment
  - "Team" -> team_mode: team, then for each of [Tech Lead, Frontend, Backend, QA, Designer, DevOps]:
      AskUserQuestion: "Who covers <discipline>?" -> name + GitHub handle, or "TBD"
    plus: "Who (if anyone) also holds Product Manager / Scrum Master?" -> name(s) or "None yet"
```

`commands/conclave-dev.md` — new sub-step in existing "Step 3 — Load context": read the story's `discipline` field and select the execution charter:

```markdown
discipline -> charter
  frontend | backend | multi -> skills/conclave/agents/developer.md
  design                      -> skills/conclave/agents/designer.md
  devops                      -> skills/conclave/agents/devops.md
```

### Agent charter layer (equivalent to Service)

New files, same shape as `developer.md` (mindset / inputs / outputs / quality checklist / what not to do):
- `skills/conclave/agents/designer.md`
- `skills/conclave/agents/devops.md`

Modified: `skills/conclave/agents/scrum-master.md:79` — replace `"only people with the Developer role are assignable as primary"` with `"only roster members whose Discipline matches (or is Tech Lead, for cross-cutting stories) are assignable as primary"`.

### Template / data contract layer (equivalent to Repository / Interface Contract)

`skills/conclave/templates/config.template.md` — add field:
```yaml
team_mode: "{{team_mode}}"   # solo | team
```

`skills/conclave/templates/roster.template.md` — restructure table header:
```markdown
| Member | GitHub handle | Discipline | Process role(s) | Notes |
```
with a documented solo-mode alternate render (single row, `Discipline: Tech Lead, Frontend, Backend, QA, Designer, DevOps`).

`skills/conclave/templates/story.template.md` — add frontmatter field alongside `assignee`:
```yaml
discipline: "{{discipline}}"   # frontend | backend | qa | design | devops | multi
```

### Frontmatter schema changes (equivalent to DTOs / Entities / Error Contracts)

New enum: `discipline` (`frontend | backend | qa | design | devops | multi`) on story files.
New enum: `team_mode` (`solo | team`) on `config.md`.
No new error-handling approach introduced — commands continue to `AskUserQuestion` + refuse-with-message on invalid state, matching every existing command's pattern (e.g. `conclave-dev.md`'s dirty-tree refusal).

### Module wiring (equivalent to Module Wiring)

- `skills/conclave/SKILL.md` §1 (Scrum model table) and §3 (role-to-subagent mapping) updated to document Discipline vs Process-role columns.
- `README.md` role table updated to match.
- `site/src/content/docs/en/roles.md` + `methodology.md` and their `es/` counterparts updated with the same table changes (four files, mirrored structure per the existing en/es parity).

### Rules Fit-Check

| Convention source | Requirement | How the proposal complies |
|---|---|---|
| `CLAUDE.md` §"Adding a new slash command" | New role behavior → add/extend a charter in `skills/conclave/agents/` | `designer.md`, `devops.md` added as new charter files; `developer.md` reused unmodified in *content*, only invocation routing changes in `conclave-dev.md` |
| `CLAUDE.md` §"Adding a new slash command" | New artifact → add a template in `skills/conclave/templates/` first | `discipline` and `team_mode` fields added to existing templates rather than new files, since they extend existing artifacts (story, config) rather than introducing new artifact types |
| `CLAUDE.md` §"Adding a new slash command" | Update `skills/conclave/SKILL.md` §3 and §5 so charters/templates stay discoverable | §3 role-to-subagent mapping table gets Designer/DevOps rows; §5 template list is unchanged (no new template files) |
| `skills/conclave/SKILL.md` §2 invariants | Markdown only; append, don't clobber; snapshot context | No new file formats; roster/story schema changes are additive fields, not restructured files that would break "append, don't clobber" for already-generated sprints |

*(No `.rules/`-style enforcement exists in this repo; the fit-check above is against `CLAUDE.md` and `skills/conclave/SKILL.md` only, as noted in Context.)*

## Acceptance Criteria

- [ ] GIVEN a user runs `/conclave-init` as a solo developer WHEN they answer "Solo" to the new mode question THEN `config.md` is written with `team_mode: solo`, `team_profile` forced to `lean`, and `roster.md` renders the single-person, all-disciplines variant. `[to be validated]`
- [ ] GIVEN a user runs `/conclave-init` as a team WHEN they answer "Team" THEN they are asked, per discipline (Tech Lead, Frontend, Backend, QA, Designer, DevOps), for a name + GitHub handle or "TBD", plus who (if anyone) holds the PM/SM process hats, and `roster.md` is written out fully populated — no placeholder rows left for manual editing. `[to be validated]`
- [ ] GIVEN a story is created by `/conclave-spec` or reassigned by `/conclave-planning` WHEN it is written to `stories/US-NNN-*.md` THEN its frontmatter includes a `discipline` field with one of the six valid values. `[to be validated]`
- [ ] GIVEN a story's `discipline` is `design` or `devops` WHEN `/conclave-dev US-NNN` runs THEN it spawns `designer.md` or `devops.md` respectively instead of `developer.md`. `[to be validated]`
- [ ] GIVEN `team_profile: full-scrum` or `custom` with `peer_pr_review.required: true` WHEN `/conclave-planning` assigns stories THEN only roster members whose Discipline matches the story's `discipline` (or who hold `Tech Lead`) are offered as assignees. `[to be validated]`
- [ ] GIVEN an existing `conclave/` install using the pre-ADR-001 five-role roster WHEN any Conclave command reads it THEN the command does not crash — it should either warn once about the outdated schema or degrade gracefully until the roster is manually updated. `[to be validated]`

No existing automated tests exist for this plugin (`CLAUDE.md` §"Development commands": "There is no build/lint/test step for the plugin itself"), so all criteria above are `[to be validated]` manually by installing the plugin and exercising the slash commands, per the existing verification method documented in `CLAUDE.md`.

## Consequences

### Positive
- Roster reflects actual project composition (every project has FE/BE/QA/Design/DevOps/TL work) instead of forcing Scrum-role-first thinking.
- Solo developers get a lighter, honest setup flow instead of answering team-shaped questions.
- Story routing to discipline-specific charters (`designer.md`, `devops.md`) makes non-coding and infra work first-class instead of being force-fit into the generic `developer.md` charter.
- No new infrastructure, server, or protocol — the git-only, PR-mediated collaboration model documented in `README.md` and `CLAUDE.md` is preserved and reinforced, not replaced.

### Negative
- Every template/command/doc file that hard-coded the five-role vocabulary needs a coordinated edit; missing one leaves stale role names in a user-facing artifact.
- Existing installed `conclave/` directories are not auto-migrated and will show the old roster shape until manually updated.
- Two new charter files (`designer.md`, `devops.md`) are added maintenance surface, written without a specific target project's Designer/DevOps workflow to validate against (this repo has no design or infra layer of its own).

### Neutral
- `product-manager.md`, `tech-lead.md`, `scrum-master.md`, `qa.md`, and `developer.md` charter *content* is unchanged — only how they're selected (via Process role tag / discipline routing) changes.
- `conclave_version` in `config.template.md` should be bumped (e.g. `0.1.0` → `0.2.0`) to signal the schema change, though this ADR does not mandate a specific version scheme.

## PR / Branch Conflicts

No open PRs and no `develop` branch exist in `lucasgio/conclave` (only `main`) — no open work to cross-check for overlap.

## Links

- Related: none — this is the first ADR in this repository (`docs/adr/` did not exist prior to this decision).
- Remote ref: none (`--remote-adrs` not used).
- **Refined by**: `docs/specs/discipline-based-roles/spec.md` §10 ("Decisiones tomadas") narrows this ADR's Decision-section wording on *when* the `discipline` field is populated — the spec locks it to the Tech Lead during `/conclave-planning` only (never during `/conclave-spec`), to protect that command's PM/TL parallel dispatch. It also applies the Scrum Master's discipline-match assignment rule unconditionally, superseding this ADR's `[to be validated]` Acceptance Criteria wording that had implied it was gated by `peer_pr_review.required`. The spec is the binding implementation detail; read it alongside this ADR for the exact mechanics.
