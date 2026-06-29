---
title: Roles
description: Los cinco role charters que Conclave ships y qué comandos invocan a cada uno.
category: methodology
order: 4
lang: es
---

# Roles

Conclave shipea **cinco role charters** — archivos markdown bajo `skills/conclave/agents/` que los slash commands cargan como prefijos de system prompt cuando lanzan subagents.

| Rol | Charter | Invocado por |
|---|---|---|
| Product Manager | `agents/product-manager.md` | `/conclave-spec` (backlog), `/conclave-planning` (revisión de scope) |
| Tech Lead | `agents/tech-lead.md` | `/conclave-spec` (arquitectura), `/conclave-planning` (feasibility), `/conclave-pr-review` (code review) |
| Scrum Master | `agents/scrum-master.md` | `/conclave-planning` (facilitator) |
| Developer | `agents/developer.md` | `/conclave-dev` |
| QA | `agents/qa.md` | `/conclave-qa` |

## Product Manager

Funcionalmente el **Product Owner** en términos Scrum. Dueño del Product Backlog, prioriza, define criterios de aceptación.

- **Input**: idea + contexto + clarificaciones + (opcionalmente) draft arquitectónico del Tech Lead.
- **Output**: Product Backlog ordenado como historias INVEST con prioridad MoSCoW, estimación T-shirt, criterios de aceptación Gherkin.
- **Checklist de calidad**: cada historia testeable, cada criterio verificable, backlog ordenado por valor, criterios de aceptación escritos antes de estimar.

## Tech Lead

Dueño de las decisiones arquitectónicas, riesgos técnicos, y la gate de aprobación de PR a nivel código.

- **Input**: idea + contexto + clarificaciones (para spec); diff del PR + arquitectura + ADRs (para pr-review).
- **Output**:
  - `/conclave-spec` → Architectural Foundation: overview + ADRs + risks + cross-cutting concerns + mermaid diagram.
  - `/conclave-planning` → findings de feasibility por historia.
  - `/conclave-pr-review` → verdict estructurado (approved / request-changes) + findings por archivo (blocker / non-blocking) + evaluación de ADR proposal.

## Scrum Master

Facilita ceremonias, surface blockers, protege el proceso del equipo. No escribe código, no es dueño del backlog ni la arquitectura.

- **Input**: sprint draft + roster + backlog + DoR + (opcionalmente) retro anterior.
- **Output**: meeting record para la ceremonia actual (sprint planning hoy; standup / review / retro en futuras iteraciones).

## Developer

Agarra una historia, la rompe en tareas técnicas, implementa con tests, prepara un PR.

- **Input**: story file + acceptance file + architecture + DoD + branch actual.
- **Output**: código + tests + commits + body del PR (renderizado desde `templates/pr-body.template.md`) + update del status en el frontmatter de la historia.

**Reglas duras**: cada escenario Gherkin mapea a por lo menos un test; sin desviación arquitectónica sin un ADR proposal en el body del PR; nunca modifica criterios de aceptación; nunca mergea su propio PR.

## QA

Verificación adversarial contra criterios de aceptación.

- **Input**: story file + acceptance file + DoD + diff del PR + status de CI.
- **Output**: verification report (appendeado a `acceptance/AC-US-NNN.md`) + update de status de la historia (`verified` o `done` según profile, o `review` con blockers).

**Reglas duras**: verifica los criterios, no el código; nunca aprueba o pide cambios en el PR (ese es trabajo del TL); nunca aprueba una historia cuyo DoD no está cumplido; nunca borra secciones de verificación previas.
