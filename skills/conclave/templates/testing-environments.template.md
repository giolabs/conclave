---
status: living
last_updated_at: "{{iso_date}}"
---

# Testing environments

Names of the CI environment variables and secrets the UAT tests QA generates read at run time — in CI, not inside a Claude Code session. QA never resolves, reads, or writes a secret value itself. Never put a real value in this file, only names already configured in your CI provider's secrets store.

## Environments

| Name | Playwright base URL env var | API base URL env var | Notes |
|---|---|---|---|
| TBD | TBD | TBD | Fill in before UAT is enabled — e.g. `PLAYWRIGHT_BASE_URL`, `API_BASE_URL`. |

## Postman variables

Maps a variable used inside `tests/uat/api-collection.postman_collection.json` / `tests/uat/postman-environment.json` to the CI secret or env var that supplies its real value at Newman-run time.

| Postman variable | Populated from CI secret/env var |
|---|---|
| TBD | TBD |

## Test users

| Label | Represents | CI secret/env var holding the credential |
|---|---|---|
| TBD | e.g. standard-user, admin, readonly | TBD |

## How to update

Edit the tables above with the exact names of environment variables/secrets already configured in your CI (GitHub Actions repo/environment secrets, etc.). Set the real values there — never in this file. Until every `TBD` above is replaced, `/conclave-qa` skips UAT generation and verifies acceptance criteria exactly as it did before this file existed.
