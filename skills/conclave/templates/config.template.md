---
project_name: "{{project_name}}"
project_type: "{{project_type}}"        # backend | frontend | mobile | devops | multi
stack:
  language: "{{language}}"
  framework: "{{framework}}"
  datastore: "{{datastore}}"
  infrastructure: "{{infrastructure}}"
repo_url: "{{repo_url}}"
claude_md_path: "CLAUDE.md"
initialized_at: "{{iso_date}}"
conclave_version: "0.5.0"

# Whether this is a solo developer or a real team. Set once by /conclave-init.
# solo forces team_profile to lean and renders a single-person roster.
team_mode: "{{team_mode}}"              # solo | team

# Which ceremonies / quality gates the team commits to.
# Profiles set sensible defaults; the per-ceremony flags override them.
team_profile: "{{team_profile}}"        # lean | full-scrum | custom

ceremonies:
  sprint_planning:
    required: true                      # ALWAYS required (structural — no sprint without a plan)
  qa_verification:
    required: true                      # ALWAYS required (structural — no done without a quality gate)
    ci_wait_timeout_minutes: 20          # how long /conclave-qa polls CI for a UAT run's conclusion before treating it as blocked
  daily_standup:
    required: {{daily_standup_required}}
  backlog_grooming:
    required: {{backlog_grooming_required}}
  peer_pr_review:
    required: {{peer_pr_review_required}}
  sprint_review:
    required: {{sprint_review_required}}
  sprint_retrospective:
    required: {{sprint_retrospective_required}}
---

# Conclave configuration

This file captures the project-level configuration Conclave uses to generate and verify artifacts. It is read by every `/conclave-*` command.

## Team mode

`{{team_mode}}` — `solo` if this is a one-person project (forces `team_profile: lean`, roster is a single row covering every discipline), `team` otherwise. Set once by `/conclave-init`; not meant to be hand-edited afterward (growing from solo to a team is a manual `roster.md` edit plus flipping this field — see `conclave/team/roster.md`).

## Project type
`{{project_type}}`

## Confirmed stack
- **Language**: `{{language}}`
- **Framework**: `{{framework}}`
- **Datastore**: `{{datastore}}`
- **Infrastructure**: `{{infrastructure}}`

## Team profile

`{{team_profile}}` — sets which ceremonies and quality gates this team commits to. Three options:

| Profile | When to use | Standup | Grooming | Peer PR review | Sprint review | Retro |
|---------|-------------|---------|----------|----------------|----------------|-------|
| `lean` | Solo devs, small (2–3) teams, internal tools | off | off | off | off | off |
| `full-scrum` | Cross-functional teams, stakeholders to demo to | required | required | required | required | required |
| `custom` | Mixed needs | per-ceremony flags below | | | | |

Two gates are **always required** regardless of profile because they are structural to Scrum:

- **Sprint Planning** — without a plan there is no sprint.
- **QA verification** — without a quality gate there is no Definition of Done.

Anything Conclave generates (stories with Gherkin acceptance criteria, DoD checklist, ADR-based architecture) is also non-negotiable — it is the structure that makes everything else work.

To change the profile, edit `team_profile` in the frontmatter above. To override a single ceremony without changing the profile, edit its `required:` flag under `ceremonies:` and set `team_profile: custom`. Conclave's ceremony commands (`/conclave-planning`, `/conclave-standup`, `/conclave-review`, `/conclave-retro`) read these flags and skip silently when `required: false`.

## UAT / CI gate

`ceremonies.qa_verification.ci_wait_timeout_minutes` (default `20`) bounds how long a single `/conclave-qa` run polls the target repo's CI for the conclusion of the UAT tests QA generated and pushed. If CI hasn't concluded when the timeout elapses, that run is treated as blocked — see `conclave/team/testing-environments.md` for the environment-variable/secret names the generated tests read (never real values).

## Conventions

### Branch naming
Use `feat/US-NNN-<slug>` for stories, `fix/<short-slug>` for bugs, `chore/<short-slug>` for maintenance.

### Commit messages
Reference the story ID in the commit: `feat(US-001): add JWT middleware`.

### PR titles
Mirror the story title: `US-001: Add JWT middleware`.

## How to update this file

Edit it directly. The next `/conclave-*` command will pick up the changes. Commit the edit so the rest of the team sees it.
