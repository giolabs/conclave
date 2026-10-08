# ADR-007: Knowledge Before Code — Spikes, ADR → SPEC Flow, and a Release Horizon

- **Status**: proposed
- **Date**: 2026-10-07
- **Deciders**: Iosvany Alvarez, Giolabs
- **Tags**: planning, epics, spikes, adr, spec, roadmap, release-planning, tech-lead
- **Stack**: Conclave Claude Code / Cursor plugin (markdown commands + prose-orchestrated subagents); target-repo `conclave/` markdown contract
- **Release**: v2.0.0, part of the Scrum Lite lifecycle (inception → planning → build → close)

## Context

The first cut of the v2.0.0 Scrum Lite lifecycle gave Conclave an epic layer and a roadmap, but the path from an epic to its stories had one step: `/conclave-planning` refined candidate one-liners straight into stories. Reviewing that design surfaced three gaps:

1. **No place for unknowns.** An epic whose design depends on something nobody has measured ("can LISTEN/NOTIFY carry the realtime load?") was refined into feature stories anyway. The unknown surfaced mid-sprint as a blocked story or an ADR written after the code. Scrum's answer — a timeboxed spike — had no representation: not a story type, not a roadmap entry, not a deliverable QA could check.
2. **ADRs without a design.** `/conclave-adr` records one decision at a time. Nothing composed an epic's decisions into a design the team could split: contracts, data changes, test strategy, rollout, and a story breakdown. Planning's PM worked from one-liners; the TL's feasibility pass could only flag problems after the stories existed.
3. **The number of sprints was an output nobody could set.** The SM derived the roadmap length from epic sizes. A team with a fixed release ("we have 6 sprints") had no way to say so, and nothing reported which epics fell outside it.

## Decision

**Make knowledge an explicit, planned deliverable between an epic and its stories, and let the team fix the release horizon.**

```
Epic (what · why) → Spike(s) (unknowns, timeboxed) → ADR(s) (one decision each) → SPEC (how) → Stories
```

1. **Risk assessment on every epic.** The Tech Lead adds `uncertainty` (low/medium/high), `needs_spec`, the ADRs the epic depends on, and open questions phrased as decisions. At inception this is a new wave (Step 6.5) after PM and TL have both produced their drafts; `/conclave-epic` runs the same pass.
2. **Spikes are stories.** `type: spike` with `question`, `timebox` (XS–M, capped by `delivery.spike_max_timebox`) and `spike_outputs`. They reuse the story state machine, capacity and velocity, so nothing downstream needs a parallel pipeline. `/conclave-dev` routes them to the Tech Lead whatever their discipline; the PR is docs-only (prototypes stay on a lab branch); QA verifies the findings and outputs, not runtime behaviour; `/conclave-close` writes the findings back into the epic.
3. **SPEC per epic.** `/conclave-spec EP-NNN` has the TL compose `SPEC-NNN` from the epic's ADRs (writing any missing ones as `proposed`), and the PM check its scope. A human approves it (`/conclave-spec approve`). Planning refines the epic's stories from the SPEC's §11 breakdown and links each story to the SPEC and ADRs it implements.
4. **Gates where the epic asks for them, not everywhere.** Planning's new Step 2.5 only acts on `needs_spec: true` (warn or require, per `delivery.spec_gate`) and `uncertainty: high` (offer the spike first). A well-understood epic flows straight from candidate stories to planning.
5. **Release horizon.** `sprint.planned_sprints: auto | N`. With N, the SM fills exactly N slots and lists the rest under *Beyond the horizon*, naming any `must` epic left out. `/conclave-roadmap replan [--sprints N]` changes it and re-sequences future slots; `show` prints the release plan. The roadmap schedules `spike:EP-NNN` entries one slot ahead of high-uncertainty epics.

## Alternatives considered

| Option | Why not |
|---|---|
| Spikes as a separate artifact type (`SPIKE-NNN`) with their own command pipeline | Duplicates planning, capacity, dev, QA and close for no behavioural gain; a spike *is* sprint work. |
| Fold the SPEC into the epic file | Epics are PM-owned and coarse; mixing the TL's design into them blurs ownership and makes `/conclave-epic edit` dangerous. |
| Require a SPEC for every epic | Heavy for small epics; the risk pass decides which epics need one. |
| Let the SM keep deriving the sprint count only | Fixed-horizon releases are the common case for client work; hiding what does not fit is worse than stating it. |

## Consequences

- New commands `/conclave-spike`, `/conclave-spec`, `/conclave-roadmap`; new templates `tech-spec.template.md`, `spike-findings.template.md`; new directories `product/specs/` and `sprints/SPRINT-NNN/spikes/`.
- Inception gains one Tech Lead call (the risk pass); `/conclave-epic new|edit|split` gain one as well.
- Ships inside v2.0.0. `/conclave-init --upgrade` adds the config keys and runs the risk pass on the epics it derives; an epic missing the fields reads as `low` / `false`, a config without them as `auto` / `warn`.
- The Tech Lead now executes spikes and reviews their PRs; in small teams that is the same person. The QA gate on the deliverable keeps one independent check.
- ADR numbers can be consumed by concurrent spikes; `/conclave-dev` reserves disjoint ranges per spike, so gaps in ADR numbering are possible and allowed.
