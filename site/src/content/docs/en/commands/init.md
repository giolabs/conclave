---
title: /conclave-init
description: Bootstrap the conclave/ directory in your repo and pick a team profile.
category: commands
order: 1
lang: en
---

# /conclave-init

Initialize a Conclave Scrum workspace at the root of the current repository.

```
/conclave-init
```

This command is **read/write inside your repo only**. It does not touch the plugin's own files. The output is a fully-formed `conclave/` directory the team can immediately work from.

## What it asks

`/conclave-init` uses `AskUserQuestion` to collect:

1. **Project name** (default: the basename of the repo).
2. **Project type**: backend / frontend / mobile / devops / multi.
3. **Team size**: 2–3, 4–6, 7+ (rough; scales the roster template).
4. **Sprint length**: 1, 2, 3 or 4 weeks (default 2).
5. **Timezone** (e.g. `America/Montevideo`, default UTC).
6. **Team profile**: `lean`, `full-scrum`, or `custom` — controls which ceremonies are required. See [profiles](/conclave/en/docs/profiles/) for details.

## What it creates

```
conclave/
├── README.md
├── config.md
├── team/
│   ├── roster.md
│   └── ceremonies.md
├── product/
│   ├── definition-of-ready.md
│   └── definition-of-done.md
├── context/
└── sprints/
```

`product/backlog.md` and `product/architecture.md` are intentionally left empty — `/conclave-spec` populates them.

## What it does NOT do

- **Does not commit.** The team should review the seed files (especially roster, DoR and DoD) before committing.
- **Does not touch files outside `conclave/`** — your code is safe.

## After it runs

The four files you almost certainly want to hand-edit:

- `conclave/team/roster.md` — list your real team members.
- `conclave/team/ceremonies.md` — adjust to your real cadence (sprint length, planning day, etc.).
- `conclave/product/definition-of-ready.md` — customize the checklist.
- `conclave/product/definition-of-done.md` — customize the checklist.

Then commit:

```bash
git add conclave/
git commit -m "conclave: bootstrap Scrum workspace"
```

And move on to `/conclave-spec`.

## Idempotency

Re-running `/conclave-init` on a workspace that already has `conclave/config.md` is refused. To change the profile or other settings, edit `conclave/config.md` directly.
