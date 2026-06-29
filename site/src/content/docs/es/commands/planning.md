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
2. Carga contexto: `config.md`, roster, backlog, DoR, architecture, archivos del sprint actual, opcionalmente la retro del sprint anterior.
3. Pregunta al equipo por inputs — la profundidad escala con el profile:
   - Siempre: fechas del sprint, nombre del facilitator.
   - Full-scrum: ajustes de capacidad per-dev, carryover commitments.
   - Cuando grooming está off: si refinar top-of-backlog dentro del planning.
4. **Delega a SM, PM y TL en paralelo.**
5. Reconcilia sus outputs:
   - Swaps de scope del PM → surface al usuario para accept/reject.
   - Findings de feasibility del TL → registra como recomendaciones.
   - Validación de DoR → dropea historias que fallan (o se niega a lockear en full-scrum).
   - Capacity check → avisa over-commit > 20%.
6. Escribe outputs (mirá abajo).

## Qué produce

- `conclave/sprints/SPRINT-NNN/meta.md` actualizado con `status: active`, fechas target.
- `conclave/sprints/SPRINT-NNN/spec.md` actualizado con assignees, `status: active`.
- Cada `stories/US-NNN-*.md` frontmatter actualizado: `assignee` seteado, `status: ready`.
- `conclave/sprints/SPRINT-NNN/planning.md` — el meeting record (goal, capacidad, assignments, findings de DoR, experiments importados de la retro anterior).
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
