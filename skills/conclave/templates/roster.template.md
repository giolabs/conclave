---
status: living
last_updated_at: "{{iso_date}}"
---

# Team roster

Every project has six disciplines, whether or not they map to six different people: **Tech Lead, Frontend, Backend, QA, Designer, DevOps**. Product Manager and Scrum Master are optional **process roles** — any discipline-holder can additionally carry one.

`/conclave-init` renders exactly one of the two tables below into the real `conclave/team/roster.md`, based on the `team_mode` the user chose — never both.

### `team_mode: team`

| Member | GitHub handle | Discipline | Process role(s) | Notes |
|--------|---------------|------------|------------------|-------|
| {{name_1}} | @{{handle_1}} | Tech Lead | | |
| {{name_2}} | @{{handle_2}} | Frontend | | |
| {{name_3}} | @{{handle_3}} | Backend | | |
| {{name_4}} | @{{handle_4}} | QA | | |
| {{name_5}} | @{{handle_5}} | Designer | | |
| {{name_6}} | @{{handle_6}} | DevOps | | |

Any discipline the user answered `TBD` for keeps the row with `TBD` in place of the name/handle rather than being dropped — the discipline still exists, it's just unstaffed.

### `team_mode: solo`

| Member | GitHub handle | Discipline | Process role(s) | Notes |
|--------|---------------|------------|------------------|-------|
| {{name_1}} | @{{handle_1}} | Tech Lead, Frontend, Backend, QA, Designer, DevOps | PM, SM | Solo project — one person covers every discipline. |

## Role rules in this team

- The `Discipline` column can hold more than one value (comma-separated) when one person covers several — common on small and solo teams.
- One person can hold multiple disciplines and process roles at once (e.g. a Tech Lead who also runs the PM duties).
- The Tech Lead has final say on architectural decisions and ADRs.
- Whoever holds the Product Manager process role has final say on priority and acceptance.
- Whoever holds the Scrum Master process role has final say on process and ceremony cadence.
- If no one holds the Product Manager or Scrum Master process role, the Tech Lead and the team decide priority and process by consensus.
- Anyone on the team can propose changes via PR to any of these files.

## How to update

Edit the table above, commit, push, open a PR. Roster changes deserve a brief PR description so the team knows what changed.
