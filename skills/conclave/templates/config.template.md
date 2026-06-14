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
conclave_version: "0.1.0"

# Which ceremonies / quality gates the team commits to.
# Profiles set sensible defaults; the per-ceremony flags override them.
team_profile: "{{team_profile}}"        # lean | full-scrum | custom

ceremonies:
  sprint_planning:
    required: true                      # ALWAYS required (structural — no sprint without a plan)
  qa_verification:
    required: true                      # ALWAYS required (structural — no done without a quality gate)
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

## Conventions

### Branch naming
Use `feat/US-NNN-<slug>` for stories, `fix/<short-slug>` for bugs, `chore/<short-slug>` for maintenance.

### Commit messages
Reference the story ID in the commit: `feat(US-001): add JWT middleware`.

### PR titles
Mirror the story title: `US-001: Add JWT middleware`.

## How to update this file

Edit it directly. The next `/conclave-*` command will pick up the changes. Commit the edit so the rest of the team sees it.
