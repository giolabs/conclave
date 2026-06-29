---
title: /conclave-qa
description: Verificá adversarialmente una historia contra sus criterios de aceptación Gherkin. Estructuralmente requerido.
category: commands
order: 5
lang: es
---

# /conclave-qa US-NNN

Verificá una historia en `status: review` contra sus criterios de aceptación. Cuando termina, la historia se movió a uno de tres estados:

- **`verified`** — QA pasó, esperando aprobación del PR por el Tech Lead. Pasa cuando `peer_pr_review.required: true`.
- **`done`** — QA pasó y no hay gate separada del TL. Pasa cuando `peer_pr_review.required: false`.
- **`review` (con blockers)** — QA encontró fallas.

```
/conclave-qa US-001
```

Esta es una de las dos gates **estructurales** de Scrum que Conclave enforce — requerida en cada profile.

## Qué hace

1. Se niega si `qa_verification.required` está de alguna forma `false` — es estructural.
2. Localiza el story y el acceptance file. Se niega si `status` no es `review`.
3. Switchea a la dev branch `feat/US-NNN-<slug>`. Ofrece `git fetch` si está ausente.
4. Captura el commit SHA como ancla del audit trail.
5. Carga PR metadata vía `gh pr view` (peer approvals, status de CI).
6. **Delega al subagent QA adversarial.** El agente:
   - Lee story y acceptance primero — internaliza qué significa "done".
   - Para cada escenario Gherkin, diseña una ejecución: setea Given, performa When, asserta Then.
   - Corre cada escenario end-to-end. NO confía en el test suite del dev como prueba — re-deriva desde primeros principios.
   - Sondea edge cases más allá de los escenarios explícitos: inputs vacíos/oversized/malformed, concurrencia, credenciales expiradas.
   - Corre el checklist de Definition of Done (saltando items condicionales si su flag de profile está off).
7. Escribe outputs (mirá abajo).

## Qué produce

- Una sección `## Verification — <YYYY-MM-DD>` appendeada a `acceptance/AC-US-NNN.md` — nunca sobrescribe runs previos.
- Frontmatter del story file actualizado:
  - Todo pasa → `status: verified` (si peer-review on) o `status: done` (si off).
  - Algo falla → queda en `status: review` con una sección `## QA blockers` listando items fallando y reproducciones.
- Un PR comment vía `gh pr comment` con el resumen del verdict.

## QA NO aprueba el PR

La contribución del QA al PR es **un comentario** — nunca un review verdict. La aprobación a nivel código es trabajo del Tech Lead vía `/conclave-pr-review US-NNN`. Esta separación matchea la convención Scrum: QA verifica comportamiento, TL aprueba código.

## Reglas duras que el subagent QA sigue

- Verifica los criterios, no el código.
- Nunca reescribe escenarios. Si parecen ambiguos, flaggea como issue de proceso.
- Nunca saltea el checklist de DoD.
- Nunca aprueba una historia que no ejecutó (leer código o output de tests no es verificación).
- Apuesta su reputación con cada aprobación — no aprobaría a menos que apostaría a que la historia es shippable.

## Re-corridas

Una segunda `/conclave-qa` después de los fixes del dev appendea una nueva sección de verificación. El status transiciona a `verified` / `done` (o queda `review`) basado solo en la nueva corrida — runs previos se mantienen para historia pero no afectan el verdict.
