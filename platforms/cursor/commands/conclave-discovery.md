---
name: conclave-discovery
description: Turn a raw product idea (or an incomplete product document) into the product documentation package Conclave inception needs — discovery (problem, ICP, personas, competitors, UVP, features), tech stack, data model, BLOC (domain rules) and MVP (Product Goal, metrics, candidate epics, Sprint 0, sequencing) — written as plain markdown under docs/product/. Run it before /conclave-init when the repo has no product document; /conclave-init offers it automatically. Works with or without a conclave/ workspace.
---

# /conclave-discovery [idea] [--from <path>] [--out <dir>]


> **Cursor runtime notes (ADR-002):** This command is the Cursor port of the Claude Code twin.
> - Prefer the **`AskQuestion`** tool for structured prompts when running in top-level Agent chat. If unavailable (e.g. inside a `Task`/subagent), use an explicit numbered option list and wait for the user's reply.
> - Spawn role work with the **`Task`** tool (or Cursor custom agents), loading the matching file under `agents/<role>.md` as the subagent charter — not Claude Code's `Agent` tool.
> - Template and skill paths are relative to this plugin root: `skills/conclave/templates/...` and `skills/conclave/board-app/...`.
> - There is no `allowed-tools` frontmatter; Cursor session permissions apply.
> - Concurrent batches still issue ≤ 3 Task calls per wave (correctness over wall-clock if Cursor serializes them).


Produce the **product documentation package** that `/conclave-init` turns into the Scrum inception artifacts (`vision.md`, epics, architecture + ADRs, roadmap). Markdown only, written to `docs/product/` by default — these are the team's product documents, not Conclave state, so they live **outside** `conclave/`.

```
/conclave-discovery                                  # asks for the idea
/conclave-discovery "una app para que vendedores de ML respondan preguntas con IA"
/conclave-discovery --from docs/brief.md             # complete an existing, partial document
/conclave-discovery --out docs/                      # different output folder
```

| # | File | Written by | Feeds in Conclave |
|---|---|---|---|
| 00 | `00-discovery.md` | Product Manager (+ Haiku research) | `vision.md` (problem, personas, metrics) |
| 01 | `01-tech-stack.md` | Tech Lead | stack in `config.md`, `architecture.md`, ADRs, Sprint 0 enablers |
| 02 | `02-data-model.md` | Tech Lead | `architecture.md`, story technical notes |
| 03 | `03-bloc.md` | Tech Lead | Gherkin scenarios at every `/conclave-planning` |
| 04 | `04-mvp.md` | Product Manager | Product Goal, MVP scope, epics, roadmap |
| — | `README.md` | orchestrator | index; marks the folder as a Conclave product package |

There is **no stakeholder questionnaire**: Conclave does not need one to run, and open questions are recorded in `00-discovery.md` instead.

---

## Step 1 — Resolve context

1. `git rev-parse --show-toplevel` → `REPO_ROOT` (not a git repo → use the current directory and say so).
2. Parse args: free text → `IDEA`; `--from <path>` → `SOURCE_DOC` (must exist; read it); `--out <dir>` → `OUT_DIR` (default `docs/product/`).
3. If `conclave/config.md` exists, read `project_language`, `project_name`, `stack.*`, `launch_date`, `sprint.length_weeks`, `models.*` (`MODEL_FOR_PM`, `MODEL_FOR_TL`; overrides → default → null).
4. Detect existing code: same signal-file scan as `/conclave-init` Step 1. Record `DETECTED_STACK` (may be empty). When code exists, the Tech Lead documents and extends the detected stack — it never proposes replacing it.
5. If `OUT_DIR/README.md` exists with `conclave_product_package: true` → `AskQuestion`: **Regenerate** (overwrites the five files; git keeps history) / **Update with new info** (Steps run with the existing package as `SOURCE_DOC`, preserving hand-edited sections that the new info does not contradict) / **Cancel**.

## Step 2 — Setup questions (one `AskQuestion`)

Ask together, skipping anything already known:
1. **Idea** — only when neither `IDEA` nor `SOURCE_DOC` was given: *"Describe the product: what it does, for whom, what problem it solves. A paragraph is enough."*
2. **Language** of the documents — `es` / `en` / other. Default: `project_language` from config, else the language the user is writing in.
3. **Project type** — `SaaS B2B`, `SaaS B2C`, `Marketplace`, `Mobile-first consumer`, `Fintech`, `Internal tool`, `Other`. When the idea makes it obvious, propose it as the first option.
4. **Team** — `solo`, `2–3`, `4–8` (affects stack and timeline).
5. **Constraints** (optional) — deadline / launch date, budget, mandated or banned technologies, compliance.

Echo the answers back in one line.

**Vague-idea gate.** If the idea cannot name a user and a problem (e.g. "an app to sell things"), ask 2–3 targeted questions in one more `AskQuestion` (who exactly, what they do today, what outcome they want) before continuing. Never invent the missing facts.

## Step 3 — Competitor research (Haiku, read-only)

One `Agent` call:
- **Model**: `haiku`.
- **Prompt**: *"Research only — do not write files. For this product idea and ICP hint, find 3–5 real direct competitors with WebSearch/WebFetch. For each return: name, URL, one-line positioning, pricing model, one strength, one gap. Return a markdown table plus a `Sources` list with the date accessed. If you find none, say so explicitly."* Include `IDEA`/`SOURCE_DOC` and the Step 2 answers.
- If web tools are unavailable or the call fails, continue with an empty table and record *"competitor research not run"* in `00-discovery.md` open questions.

## Step 4 — Discovery (Product Manager)

One `Agent` call:
- **Model**: `MODEL_FOR_PM` (omit if null).
- Prompt prefix: full content of `agents/product-manager.md`.
- Task: **discovery mode** (charter section "How you operate inside `/conclave-discovery`"), document `00-discovery.md`.
- Inputs: `IDEA` / `SOURCE_DOC`, Step 2 answers, Step 3 research, `skills/conclave/references/discovery-methodology.md`, the body of `product-discovery.template.md`.
- Language: the Step 2 language for prose; frontmatter keys and identifiers in English.

**Checkpoint** — show one line per item and ask via `AskQuestion` (**Continue** / **Adjust**):

```
ICP:     <one line>
Problem: <one line>
UVP:     <one sentence>
Rivals:  <names>
```

On **Adjust**, take the user's correction in free text and re-run Step 4 once with it. Everything downstream derives from this, so it is the only checkpoint.

## Step 5 — Tech stack, data model, BLOC (Tech Lead)

One `Agent` call:
- **Model**: `MODEL_FOR_TL` (omit if null).
- Prompt prefix: full content of `agents/tech-lead.md`.
- Task: **discovery mode** (charter section "How you operate inside `/conclave-discovery`"): return three blocks — `## 01-tech-stack`, `## 02-data-model`, `## 03-bloc` — matching the bodies of `product-tech-stack.template.md`, `product-data-model.template.md`, `product-bloc.template.md`.
- Inputs: `00-discovery.md` (from Step 4), Step 2 answers, `DETECTED_STACK`, `skills/conclave/references/tech-stack-decision-tree.md`, the three template bodies.

## Step 6 — MVP definition (Product Manager)

One `Agent` call (`MODEL_FOR_PM`, `product-manager.md` prefix), **discovery mode**, document `04-mvp.md`. Inputs: `00-discovery.md`, the three Tech Lead documents, Step 2 answers (team, constraints, launch date), `sprint.length_weeks` (default 2), the body of `product-mvp.template.md`.

## Step 7 — Write the package

1. `mkdir -p $OUT_DIR`.
2. Write `00-discovery.md`, `01-tech-stack.md`, `02-data-model.md`, `03-bloc.md`, `04-mvp.md` from the templates + agent output. Fill frontmatter (`product`, `generated_at`, and `stack:` in `01-tech-stack.md` from the Tech Lead's choices).
3. Write `README.md` from `product-docs-readme.template.md`.
4. **Placeholder audit**: grep the six files for `{{`. Any hit → fill it from the agent output or delete that line/section; never leave a placeholder.
5. If `conclave/config.md` exists and `product_doc_path` is empty, set it to `$OUT_DIR` (a directory is valid).

## Step 8 — Report

```
✓ Product package written to docs/product/

  00 Discovery   ICP: <…> · UVP: <…>
  01 Tech stack  <frontend> · <backend> · <db> · <hosting>
  02 Data model  <n> entities
  03 BLOC        <n> invariants · <n> edge cases
  04 MVP         Product Goal: <…> · <n> candidate epics · ~<n> sprints (±25%)

Open questions: <n> (see 00-discovery.md §9)
```

Next step:
- No `conclave/` yet → `/conclave-init` (it finds this folder and runs inception from it).
- Invoked from inside `/conclave-init` → return control to it; do not print the next-step block.
- `conclave/` already initialized (v2) → the inception artifacts are not regenerated automatically. Use `/conclave-epic new` for new epics, or edit `conclave/product/vision.md`.

## Guardrails

- Write only inside `$OUT_DIR` (and `product_doc_path` in an existing `conclave/config.md`).
- Do not commit.
- Do not invent facts: unknowns go to open questions; research claims carry their source and date.
- Do not create stories, epics files, or anything under `conclave/` — that is `/conclave-init` and `/conclave-planning`.
- Markdown only; diagrams only as Mermaid.
