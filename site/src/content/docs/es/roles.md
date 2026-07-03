---
title: Roles
description: Los siete role charters que Conclave ships y qué comandos invocan a cada uno.
category: methodology
order: 4
lang: es
---

# Roles

Conclave shipea **siete role charters** — archivos markdown bajo `skills/conclave/agents/` que los slash commands cargan como prefijos de system prompt cuando lanzan subagents.

Seis son **disciplinas**, siempre presentes en el roster mapeen o no a seis personas distintas: Tech Lead, Frontend, Backend, QA, Designer, DevOps. Product Manager y Scrum Master son **process roles opcionales** que cualquier dueño de disciplina puede llevar además — no son disciplinas en sí mismas.

| Rol | Tipo | Charter | Invocado por |
|---|---|---|---|
| Tech Lead | Disciplina | `agents/tech-lead.md` | `/conclave-spec` (arquitectura), `/conclave-planning` (feasibility + asignación de discipline, Wave 1), `/conclave-pr-review` (code review) |
| Frontend / Backend | Disciplina | `agents/developer.md` | `/conclave-dev` (historias con `discipline: frontend \| backend \| multi`) |
| QA | Disciplina | `agents/qa.md` | `/conclave-qa` |
| Designer | Disciplina | `agents/designer.md` | `/conclave-dev` (historias con `discipline: design`) |
| DevOps | Disciplina | `agents/devops.md` | `/conclave-dev` (historias con `discipline: devops`) |
| Product Manager | Process role (opcional) | `agents/product-manager.md` | `/conclave-spec` (backlog), `/conclave-planning` (revisión de scope, Wave 1) |
| Scrum Master | Process role (opcional) | `agents/scrum-master.md` | `/conclave-planning` (facilitator + asignación, Wave 2 — corre después de Product Manager y Tech Lead) |

## Product Manager

Funcionalmente el **Product Owner** en términos Scrum, cuando alguien lleva este process role opcional. Dueño del Product Backlog, prioriza, define criterios de aceptación.

- **Input**: idea + contexto + clarificaciones + (opcionalmente) draft arquitectónico del Tech Lead.
- **Output**: Product Backlog ordenado como historias INVEST con prioridad MoSCoW, estimación T-shirt, criterios de aceptación Gherkin.
- **Checklist de calidad**: cada historia testeable, cada criterio verificable, backlog ordenado por valor, criterios de aceptación escritos antes de estimar.

## Tech Lead

Dueño de las decisiones arquitectónicas, riesgos técnicos, la asignación de discipline por historia, y la gate de aprobación de PR a nivel código.

- **Input**: idea + contexto + clarificaciones (para spec); draft sprint + arquitectura (para planning); diff del PR + arquitectura + ADRs (para pr-review).
- **Output**:
  - `/conclave-spec` → Architectural Foundation: overview + ADRs + risks + cross-cutting concerns + mermaid diagram.
  - `/conclave-planning` (Wave 1, en paralelo con Product Manager) → findings de feasibility por historia, **más un valor de `discipline`** (`frontend | backend | qa | design | devops | multi`) por historia.
  - `/conclave-pr-review` → verdict estructurado (approved / request-changes) + findings por archivo (blocker / non-blocking) + evaluación de ADR proposal.

## Scrum Master

Facilita ceremonias, asigna historias, surface blockers, protege el proceso del equipo. No escribe código, no es dueño del backlog ni la arquitectura.

- **Input**: sprint draft + roster + backlog + DoR + findings de Wave 1 de Product Manager y Tech Lead (incluyendo la `discipline` asignada a cada historia) + (opcionalmente) retro anterior.
- **Output**: meeting record para la ceremonia actual (sprint planning hoy; standup / review / retro en futuras iteraciones). Corre en **Wave 2** — después de que Product Manager y Tech Lead retornan — porque la asignación necesita saber la discipline de cada historia primero.

**Regla dura**: solo asigna una historia a un miembro del roster cuya `Discipline` matchee (o que tenga Tech Lead, para historias cross-cutting). Si no hay match, marca un coverage gap sin resolver para que el orquestador lo levante con el humano — nunca adivina.

## Developer

Agarra una historia etiquetada `discipline: frontend`, `backend`, o `multi` (también el fallback para historias sin discipline seteada), la rompe en tareas técnicas, implementa con tests, prepara un PR.

- **Input**: story file + acceptance file + architecture + DoD + branch actual.
- **Output**: código + tests + commits + body del PR (renderizado desde `templates/pr-body.template.md`) + update del status en el frontmatter de la historia.

**Reglas duras**: cada escenario Gherkin mapea a por lo menos un test; sin desviación arquitectónica sin un ADR proposal en el body del PR; nunca modifica criterios de aceptación; nunca mergea su propio PR.

## Designer

Agarra una historia etiquetada `discipline: design`. Produce decisiones de UI/UX y un handoff listo para Frontend — nunca código de aplicación.

- **Input**: story file + acceptance file + architecture (por convenciones de design system existentes) + DoD.
- **Output**: design notes / handoff spec (markdown) + body del PR mapeando cada escenario Gherkin a una decisión de diseño + update del status en el frontmatter de la historia.

**Reglas duras**: cada escenario Gherkin mapea a por lo menos una decisión de diseño; nunca escribe código de implementación frontend; nunca modifica criterios de aceptación; nunca mergea su propio PR.

## DevOps

Agarra una historia etiquetada `discipline: devops`. Implementa cambios de pipeline CI/CD e infraestructura como código, el mismo loop operativo que Developer.

- **Input**: story file + acceptance file + architecture (por el stack de infra confirmado) + DoD + branch actual.
- **Output**: cambios de pipeline/infra + evidencia de verificación (dry-run, corrida de CI, o plan diff) + body del PR + update del status en el frontmatter de la historia.

**Reglas duras**: cada escenario Gherkin mapea a por lo menos una evidencia de verificación; nunca hardcodea secrets; nunca modifica lógica de negocio de la aplicación; nunca mergea su propio PR.

## QA

Verificación adversarial contra criterios de aceptación. Agnóstico a la discipline — verifica toda historia de la misma forma sin importar cuál de los roles anteriores la produjo.

- **Input**: story file + acceptance file + DoD + diff del PR + status de CI.
- **Output**: verification report (appendeado a `acceptance/AC-US-NNN.md`) + update de status de la historia (`verified` o `done` según profile, o `review` con blockers).

**Reglas duras**: verifica los criterios, no el código; nunca aprueba o pide cambios en el PR (ese es trabajo del TL); nunca aprueba una historia cuyo DoD no está cumplido; nunca borra secciones de verificación previas.
