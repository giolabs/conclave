---
title: State machine de stories
description: Cómo una historia se mueve de backlog a done, profile-aware.
category: methodology
order: 3
lang: es
---

# State machine de stories

Una user story se mueve por un conjunto chico de estados bien definidos. El camino exacto depende del profile del equipo — específicamente si `peer_pr_review.required` está on.

## Los estados

| Status | Significado |
|---|---|
| `backlog` | Existe en el Product Backlog pero todavía no está ready. |
| `ready` | Pasa la Definition of Ready; se puede traer a un sprint. |
| `in-progress` | Asignada y siendo implementada (`/conclave-dev`). |
| `review` | PR abierto, esperando verificación QA. |
| `verified` | QA pasó los criterios de aceptación; esperando aprobación del PR por Tech Lead. **Solo usado cuando `peer_pr_review.required: true`.** |
| `done` | Todos los gates pasaron, DoD cumplido, PR mergeable. |

## Transiciones

```
backlog → ready → in-progress → review → [verified] → done
```

### Cuando `peer_pr_review.required: true` (default full-scrum)

```
review ──/conclave-qa──→ verified ──/conclave-pr-review──→ done
                ↘                                        ↗
                  blocked → vuelta a review para arreglar
```

QA pasa → `status: verified`, postea un PR comment con el verdict. El Tech Lead corre `/conclave-pr-review`, revisa el diff contra la arquitectura y los ADRs, después corre `gh pr review --approve`. On approve → `status: done`.

### Cuando `peer_pr_review.required: false` (default lean)

```
review ──/conclave-qa──→ done
              ↘
                blocked → vuelta a review para arreglar
```

QA pasa → `status: done` directamente. No hay gate separada del Tech Lead. QA es la señal de merge.

## Manejo de fallas

Una falla en cualquier gate devuelve la historia a `review`. El dev arregla, pushea nuevos commits, y la(s) gate(s) re-corren:

- **QA encontró criterios fallando** → la historia queda en `review` con una sección `## QA blockers` agregada al story file. Arreglo → push → re-correr `/conclave-qa`.
- **TL encontró code blockers** → la historia vuelve a `review` con una sección `## TL findings`. Arreglo → push → re-correr `/conclave-qa` (los criterios pudieron haberse desplazado) → `/conclave-pr-review`.

Un solo blocker alcanza para mantener la historia fuera de `done`. No hay "approve with notes" cuando hay un blocker.

## Audit trail

Cada transición se commitea a git. El verification report en `acceptance/AC-US-NNN.md` es append-only — cada corrida de `/conclave-qa` agrega una nueva sección `## Verification — <date>`, nunca borra runs previos. Lo mismo aplica a los findings del TL.

Podés reconstruir el historial completo de cualquier historia con `git log -- conclave/sprints/SPRINT-NNN/stories/US-NNN-*.md`.
