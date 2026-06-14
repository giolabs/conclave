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

## Conventions

### Branch naming
Use `feat/US-NNN-<slug>` for stories, `fix/<short-slug>` for bugs, `chore/<short-slug>` for maintenance.

### Commit messages
Reference the story ID in the commit: `feat(US-001): add JWT middleware`.

### PR titles
Mirror the story title: `US-001: Add JWT middleware`.

## How to update this file

Edit it directly. The next `/conclave-*` command will pick up the changes. Commit the edit so the rest of the team sees it.
