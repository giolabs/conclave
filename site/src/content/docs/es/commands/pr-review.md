---
title: /conclave-pr-review
description: El Tech Lead revisa el código, aprueba el PR, mueve la historia a done.
category: commands
order: 6
lang: es
---

# /conclave-pr-review US-NNN

Gate de aprobación del PR por el Tech Lead. Revisa el código de una historia que QA ya verificó behaviormente. En approve, el PR queda aprobado y la historia se mueve a `status: done`. En request-changes, la historia vuelve a `review` para que el dev arregle.

```
/conclave-pr-review US-001
```

Este comando corre **solo cuando `ceremonies.peer_pr_review.required: true`** en `conclave/config.md`. En el profile `lean` el flag está off y el pass del QA es la señal de merge — no hay gate separada del TL.

## Qué hace

1. Se niega si `peer_pr_review.required: false` — no hay gate TL para correr.
2. Localiza la historia. Se niega si `status` no es `verified` — QA debe pasar primero.
3. Switchea a la dev branch `feat/US-NNN-<slug>`.
4. Carga contexto: `config.md`, architecture, DoD, story file, acceptance file (incluyendo el último bloque de verificación del QA), diff completo del PR, PR metadata.
5. **Delega al subagent Tech Lead** en modo PR-review. El TL:
   - Confirma que QA pasó (se niega si no).
   - Lee el diff con la arquitectura en mente. Chequea cada ADR por compliance.
   - Valida items code-level del DoD: lint, typecheck, coverage, sin TODOs/FIXMEs nuevos, docs actualizadas para cambios de API.
   - Chequea calidad de código al nivel TL: trampas de correctness que el QA no puede capturar (race conditions, off-by-one en cleanup, error swallowing), security smells, errores de abstracción, acoplamiento accidental.
   - Evalúa cualquier ADR proposal en el body del PR.
   - Renderiza un verdict estructurado.
6. Actúa sobre el PR según el verdict.

## Qué produce

- Frontmatter del story file:
  - `verdict: approved` → `status: done`.
  - `verdict: request_changes` → `status: review`, más una sección `## TL findings` listando findings severity blocker y non-blocking.
- `gh pr review --approve` o `gh pr review --request-changes` con el verdict estructurado del TL como body.
- Un commit en la dev branch (`chore(US-NNN): TL approved` o `... TL findings raised`).

## Reglas duras que el subagent TL sigue

- Verifica el código, no los criterios.
- No aprueba si hay algún finding severity `blocker`. Sin "approve with notes" cuando hay un blocker.
- No mergea el PR — la aprobación es suficiente.
- No reescribe el código del dev. Los findings van en el verdict; el dev los direcciona.
- Se niega a correr si la historia no es todavía `verified`.

## Re-corridas

Una segunda `/conclave-pr-review` después de los fixes del dev agrega una nueva sección `## TL findings` si quedan findings; en approve, remueve la sección y mueve la historia a `done`. TL reviews previos viven en el history de reviews del PR.

## Después de que corre

- En approve: el PR queda aprobado y mergeable. El equipo decide cuándo mergear (release windows, batching).
- En request-changes: el dev pushea fixes, re-corre `/conclave-qa US-NNN` (los criterios pudieron haberse desplazado), después `/conclave-pr-review` de nuevo.
