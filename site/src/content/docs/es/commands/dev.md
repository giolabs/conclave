---
title: /conclave-dev
description: El Developer agarra una historia, la implementa con tests, abre un PR.
category: commands
order: 4
lang: es
---

# /conclave-dev US-NNN

Agarrá una única user story del sprint activo y manejala a través de la implementación. Cuando termina, la historia está en `status: review` con una feature branch y un PR listo para verificación QA vía `/conclave-qa US-NNN`.

```
/conclave-dev US-001
```

El argumento es requerido y debe matchear un story file bajo el sprint activo.

## Qué hace

1. Verifica que el working tree esté limpio (se niega en un working tree sucio).
2. Localiza el sprint activo y el story file. Se niega si la historia está pasada la gate del dev.
3. Chequea el assignee — si no matchea con vos, pregunta si tomar la historia.
4. Carga contexto: `config.md` (profile + peer-review flag), architecture, DoD, roster, story, acceptance.
5. Crea la branch `feat/US-NNN-<slug>` desde la branch de integración.
6. Marca la historia `in-progress` en su propio commit (visible al equipo inmediatamente).
7. **Delega al subagent Developer.** El agente:
   - Lee story, acceptance, architecture, DoD.
   - Planea un breakdown técnico (solo scratch — no commiteado).
   - Detecta o bootstrapea el test setup.
   - Implementa story-then-test, escenario por escenario. Cada escenario Gherkin obtiene por lo menos un test que pasa.
   - Corre la suite de tests entera una vez al final.
   - Linta / typechequea.
   - Commitea en chunks scopeados (`feat(US-NNN): ...`).
   - Renderiza el body del PR desde `templates/pr-body.template.md`.
8. Pushea la branch.
9. Abre el PR vía `gh pr create` (o printea el comando preparado si `gh` falta).
10. Taggea un peer reviewer si `peer_pr_review.required: true` — agarra uno del roster, excluyendo al assignee.
11. Marca la historia `status: review`.

## Qué produce

- Código + tests en el repo.
- Una feature branch `feat/US-NNN-<slug>` pusheada a `origin`.
- Un PR (o comando `gh pr create` preparado).
- Frontmatter del story-file actualizado: `assignee`, `status: review`.

## Reglas duras que el subagent Dev sigue

- Cada escenario Gherkin mapea a por lo menos un test que pasa.
- Sin desviación arquitectónica sin un ADR proposal en el body del PR.
- Nunca modifica criterios de aceptación. Si parecen mal, flaggea vía comentario, no arregla silenciosamente.
- No toca ningún archivo bajo `conclave/` excepto el frontmatter de su propio story file.
- Nunca mergea su propio PR.

## Profile awareness

- `peer_pr_review.required: true` → taggea un peer (típicamente el Tech Lead) como reviewer, el checklist condicional del PR body incluye el item de aprobación del TL.
- `peer_pr_review.required: false` → no se requiere reviewer separado. El Dev igual se auto-revisa.

## Resume en una branch existente

Si `feat/US-NNN-<slug>` ya existe localmente (la historia está `in-progress` de una corrida previa), el comando ofrece tres opciones: switch y resume, delete y recrear, o abort. En resume, el subagent Developer lee lo que ya existe en la branch antes de agregar código nuevo.

## Después de que corre

- QA verifica: `/conclave-qa US-NNN`.
