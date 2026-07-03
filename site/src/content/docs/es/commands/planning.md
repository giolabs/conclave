---
title: /conclave-planning
description: Ceremonia de Sprint Planning profile-aware. SM facilita, PM valida scope, TL valida feasibility.
category: commands
order: 3
lang: es
---

# /conclave-planning

Corré el **Sprint Planning** para el sprint draft actual. Cuando termina, el sprint se mueve de `draft` a `active` y el equipo se compromete con las historias seleccionadas.

```
/conclave-planning
```

Esta es una de las dos gates **estructurales** de Scrum que Conclave enforce — requerida en cada profile, no se puede saltear.

## Qué hace

1. Localiza el sprint draft (el `SPRINT-NNN` más alto con `status: draft`).
2. Carga contexto: `config.md`, roster, backlog, DoR, architecture, archivos del sprint actual, opcionalmente la retro del sprint anterior. Si el roster es previo a la columna `Discipline`, cada miembro se trata como multi-discipline con un aviso único de compatibilidad.
3. Pregunta al equipo por inputs — la profundidad escala con el profile:
   - Siempre: fechas del sprint, nombre del facilitator.
   - Full-scrum: ajustes de capacidad per-dev, carryover commitments.
   - Cuando grooming está off: si refinar top-of-backlog dentro del planning.
4. **Delega en dos waves — PM + TL en paralelo primero (Wave 1), después SM solo (Wave 2).** La asignación necesita saber la discipline de cada historia antes de poder elegir un assignee válido, así que SM espera el output de TL en vez de adivinar antes de tiempo:
   - Wave 1 — TL valida feasibility **y asigna una `discipline`** (`frontend | backend | qa | design | devops | multi`) a cada historia; PM valida scope.
   - Wave 2 — SM asigna cada historia a un miembro del roster cuya `Discipline` matchee (o que tenga Tech Lead, para historias cross-cutting). Si nadie matchea, marca un **coverage gap** sin resolver en vez de adivinar.
5. Reconcilia los outputs:
   - Swaps de scope del PM → surface al usuario para accept/reject.
   - Findings de feasibility del TL → registra como recomendaciones.
   - Validación de DoR → dropea historias que fallan (o se niega a lockear en full-scrum). Ahora incluye chequear que cada historia tenga una `discipline` asignada.
   - Coverage gaps → se levantan vía `AskUserQuestion`: asignar a Tech Lead como fallback temporal, o elegir a alguien más. Cada gap se resuelve antes de lockear el sprint.
   - Capacity check → avisa over-commit > 20%.
6. Escribe outputs (mirá abajo).

## Qué produce

- `conclave/sprints/SPRINT-NNN/meta.md` actualizado con `status: active`, fechas target.
- `conclave/sprints/SPRINT-NNN/spec.md` actualizado con assignees, `status: active`.
- Cada `stories/US-NNN-*.md` frontmatter actualizado: `assignee` y `discipline` seteados, `status: ready`.
- `conclave/sprints/SPRINT-NNN/planning.md` — el meeting record (goal, capacidad, assignments, discipline assignments & coverage gaps, findings de DoR, experiments importados de la retro anterior).
- `conclave/product/backlog.md` actualizado para mostrar historias seleccionadas como `in-progress` en el sprint activo.

## Profile awareness

| Profile | Preguntas de capacidad | Backlog grooming | Preguntas de carryover |
|---|---|---|---|
| `lean` | salteadas | absorbido en planning | salteadas |
| `full-scrum` | preguntadas per-dev | separado (asumido ya hecho) | preguntadas |
| `custom` | depende de flags | depende de flags | depende de flags |

## Guardrails

- Se niega a correr si no hay sprint en `draft`.
- Se niega a correr si `sprint_planning.required` está de alguna forma `false` en `config.md` — es estructural.
- No se puede re-correr en el mismo sprint después de que va `active` — una segunda invocación se rechaza.
- Nunca commitea.

## Después de que corre

Cada dev asignado corre [`/conclave-dev US-NNN`](/conclave/es/docs/commands/dev/) para su historia.
