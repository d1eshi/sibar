# AutoResearch aplicado a Cognitive Debt, Ownership Manifesto y Ownership Workbench

Fecha: 2026-05-22
Consultado en internet: 2026-05-22
Estado: research memo operativo para parent/worker harness

## Objetivo

Definir un metodo de `autoresearch` util para Sibar/Sibi y usarlo para probar una hipotesis central:

> el problema de Sibi no es solo revisar codigo AI-assisted, sino detectar y reducir la brecha entre cambio aceptado y ownership humano demostrado sobre boundaries y relaciones.

El deliverable no es un resumen de papers. Tiene que servir para convertir research en:

```text
hipotesis -> contratos -> evidencia reproducible -> ingestión LLM acotada -> UI -> tests -> verificacion
```

Este memo complementa, no reemplaza, [docs/research/cognitive-debt-ownership-research.md](/Users/d1eshi/.codex/worktrees/bcfa/sibar/sibi/docs/research/cognitive-debt-ownership-research.md) y aterriza el tema en el workbench definido en [docs/specs/sibi-ownership-workbench/04_implementation_slices.md](/Users/d1eshi/.codex/worktrees/bcfa/sibar/sibi/docs/specs/sibi-ownership-workbench/04_implementation_slices.md).

## Contexto local minimo usado

- [README.md](/Users/d1eshi/.codex/worktrees/bcfa/sibar/sibi/README.md)
- [docs/ownership-wedge.md](/Users/d1eshi/.codex/worktrees/bcfa/sibar/sibi/docs/ownership-wedge.md)
- [docs/specs/sibi-ownership-workbench/README.md](/Users/d1eshi/.codex/worktrees/bcfa/sibar/sibi/docs/specs/sibi-ownership-workbench/README.md)
- [docs/specs/sibi-ownership-workbench/03_runtime_evidence_contract.md](/Users/d1eshi/.codex/worktrees/bcfa/sibar/sibi/docs/specs/sibi-ownership-workbench/03_runtime_evidence_contract.md)
- [docs/specs/sibi-ownership-workbench/04_implementation_slices.md](/Users/d1eshi/.codex/worktrees/bcfa/sibar/sibi/docs/specs/sibi-ownership-workbench/04_implementation_slices.md)
- [docs/specs/sibi-ownership-workbench/06_cognitive_debt_metrics.md](/Users/d1eshi/.codex/worktrees/bcfa/sibar/sibi/docs/specs/sibi-ownership-workbench/06_cognitive_debt_metrics.md)
- [docs/research/cognitive-debt-ownership-research.md](/Users/d1eshi/.codex/worktrees/bcfa/sibar/sibi/docs/research/cognitive-debt-ownership-research.md)

No use una skill externa de research. Adopte un metodo manual, trazable y documentable.

## Metodo de autoresearch adoptado

### 1. Fuente de inspiracion

Tomo `autoresearch` de Karpathy como patron, no como implementacion literal. La idea util no es "dejar un agente suelto", sino esta estructura:

1. acotar fuertemente la superficie modificable;
2. fijar un presupuesto corto y comparable por iteracion;
3. medir contra una señal concreta, no contra intuicion;
4. conservar solo lo que mejora la señal;
5. mover el trabajo humano al protocolo, no al output puntual.

En `karpathy/autoresearch`, el humano itera sobre `program.md`, el agente toca una unica superficie, corre experimentos con presupuesto fijo y conserva o descarta segun una metrica comparable. Esa disciplina es la parte reusable para Sibi. Fuente principal: [karpathy/autoresearch](https://github.com/karpathy/autoresearch).

### 2. Traduccion del metodo a research de producto

Para Sibi, el loop queda asi:

```text
Pregunta de producto acotada
  -> set corto de fuentes primarias
  -> claim map con hipotesis y rivales
  -> traduccion obligatoria a contrato/producto
  -> chequeo de falsabilidad
  -> conservar o descartar claim
  -> escribir siguiente protocolo
```

### Regla de oro

Ningun hallazgo "sobrevive" si no puede mapearse al menos a una de estas superficies:

- contrato runtime;
- dato de evidencia;
- pregunta de ownership;
- estado UI;
- criterio de readiness;
- test reproducible;
- condicion de escalacion a Sibar.

### 3. Protocolo reproducible

### Paso A. Bounded question

Preguntar algo chico y operacional. En este caso:

```text
Como puede Sibi detectar cognitive debt sin fingir mastery, usando attempt-first,
evidence-first y transfer-first sobre boundaries reales?
```

### Paso B. Claim ledger

Cada claim se escribe con:

- `claim`
- `why it matters`
- `source type`
- `product translation`
- `falsifier`

### Paso C. Rival hypotheses pass

Antes de cerrar la tesis central, escribir rivales serias. Si no hay rivales, no hay research: solo confirmacion.

### Paso D. Translation gate

Todo claim tiene que terminar en uno o mas de:

- schema o contract field;
- evidence derivation rule;
- UI state;
- fixture;
- Playwright path;
- browser/agent manifest rule.

### Paso E. Keep/discard

Se conserva un claim solo si cumple tres cosas:

1. tiene soporte razonable;
2. no contradice el manifiesto local;
3. produce una decision implementable.

## Hipotesis central

### Tesis

La mejor definicion operativa para Sibi es:

```text
cognitive debt = cambio aceptado - ownership demostrado
```

Pero el workbench no debe intentar medir eso como "comprension total". Debe medirlo boundary por boundary, a partir de:

- intento del usuario;
- evidencia disponible;
- calibracion entre autoconfianza y evidencia;
- capacidad de transferencia a una boundary o relacion cercana;
- recurrencia de gaps.

### Implicacion principal

Sibi gana si actua como `ownership verification runtime`, no como reviewer generico ni como chat de explicaciones.

## Hipotesis rivales

### Rival A. El problema real es solo technical debt

Lectura rival: si el codigo esta mal, basta con mejorar calidad del codigo y tests.

Por que no alcanza:

- la evidencia externa muestra desacople entre performance y comprension con asistentes GenAI;
- puede haber codigo prolijo y aun asi bajo ownership humano;
- el manifiesto local ya separa output de readiness.

### Rival B. El problema real es solo cognitive load

Lectura rival: el problema no es debt sino sobrecarga momentanea; una UI mejor o mejor documentacion alcanza.

Por que no alcanza:

- `load` describe costo presente;
- `debt` describe acumulacion y recurrencia;
- Sibi necesita memoria de intentos y gaps repetidos, no solo UX mas amable.

### Rival C. Un LLM fuerte con full-repo context ya resuelve ownership

Lectura rival: si Copilot/Claude/Codex ya juntan contexto del repo, el producto diferencial desaparece.

Por que no alcanza:

- esas herramientas optimizan review o implementacion;
- no prueban que el humano responsable puede explicar, predecir y defender el cambio;
- la evidencia reciente sugiere que los loops de verificacion, no el acceso a contexto por si solo, predicen mejor comprension.

### Rival D. Tests verdes + review humana ya son suficiente proxy de ownership

Por que no alcanza:

- tests pueden validar comportamiento sin validar modelo mental;
- el usuario puede aceptar un cambio que pasa tests pero no puede re-explicar ni extender;
- esto es exactamente el hueco que Sibi dice querer cerrar.

## Evidencia externa sintetizada

### 1. Carga cognitiva

Sweller (1988) argumenta que resolver problemas sin suficiente estructura consume capacidad cognitiva que no queda disponible para adquirir esquemas. Traduccion a Sibi: pedir explicacion libre sobre un diff complejo sin anclas ni subgoals es demasiado caro para novatos o para zonas brownfield. Fuente: [Cognitive load during problem solving: Effects on learning](https://www.sciencedirect.com/science/article/pii/0364021388900237).

### 2. Ilusion de comprension

Rozenblit y Keil (2002) muestran que la gente suele creer que entiende un mecanismo mejor de lo que realmente puede explicar; la confianza cae cuando tiene que producir la explicacion. Traduccion a Sibi: `attempt-before-explanation` no es una preferencia de UX; es un detector de falsa claridad. Fuente: [The misunderstood limits of folk science: an illusion of explanatory depth](https://www.sciencedirect.com/science/article/pii/S0364021302000782).

### 3. Self-explanation y scaffolding

Chi et al. (1989) y trabajo posterior en code comprehension muestran que la autexplicacion mejora aprendizaje, y que el scaffolding guiado suele superar la autexplicacion libre. Traduccion a Sibi: no conviene chat libre; conviene pregunta acotada, evidence anchors y repair minima. Fuentes:

- [Self-Explanations: How Students Study and Use Examples in Learning to Solve Problems](https://cir.nii.ac.jp/crid/1364233270473969408)
- [Improving Code Comprehension Through Scaffolded Self-explanations](https://par.nsf.gov/biblio/10447589-improving-code-comprehension-through-scaffolded-self-explanations)
- [The effects of open self-explanation prompting during source code comprehension](https://digitalcommons.memphis.edu/facpubs/3247/)

### 4. Transfer y retrieval

Carpenter (2012) y revisiones posteriores muestran que recuperar y aplicar conocimiento favorece transferencia, no solo retencion literal. Traduccion a Sibi: una boundary no deberia consolidarse solo por una respuesta correcta local; necesita al menos un probe de transferencia cuando la relacion lo requiera. Fuentes:

- [Testing Enhances the Transfer of Learning](https://journals.sagepub.com/doi/10.1177/0963721412452728)
- [Retrieval Practice Consistently Benefits Student Learning](https://link.springer.com/article/10.1007/s10648-021-09595-9)

### 5. Automation bias y verification bypass

Parasuraman y Manzey (2010) vinculan complacencia y automation bias con menor vigilancia sobre sistemas automatizados. La traduccion actual al coding asistido aparece en estudios y reportes recientes que describen `verification gap` y `verification-bypass`. Fuentes:

- [Complacency and bias in human use of automation: an attentional integration](https://pubmed.ncbi.nlm.nih.gov/21077562/)
- [Sonar Data Reveals Critical "Verification Gap" in AI Coding: 96% Don’t Fully Trust Output, Yet Only 48% Verify It](https://www.sonarsource.com/company/press-releases/sonar-data-reveals-critical-verification-gap-in-ai-coding/)
- [Comprehension Debt in GenAI-Assisted Software Engineering Projects](https://arxiv.org/abs/2604.13277)

### 6. Program comprehension y mental models

La revision sistematica de Heinonen et al. (2023) refuerza que los programadores forman modelos mentales de programas, tareas y conceptos, y que el campo sigue fragmentado. Traduccion a Sibi: el workbench no debe reducir comprehension a "entender este archivo". Tiene que trabajar sobre boundaries y relaciones. Fuente: [Synthesizing research on programmers’ mental models of programs, tasks and concepts — A systematic literature review](https://aaltodoc.aalto.fi/items/148189ee-cfea-4dea-8c69-82cc176f94f9).

### 7. Evidencia reciente en brownfield + Copilot

Qiao et al. (2025) reportan mejoras de performance sin mejora global de comprension y muestran que los `verification loops` predicen mejor comprension que el uso pasivo. Traduccion a Sibi: el producto no deberia premiar output rapido sino verificacion activa. Fuente: [Code Comprehension with GitHub Copilot: Performance Gains, Comprehension Trade-offs, and Behavioral Predictors in Brownfield Programming](https://arxiv.org/abs/2511.02922).

### 8. Contexto de mercado

GitHub, VS Code y Claude Code ya avanzan sobre agentes con contexto de repo, revisiones y modos de aprendizaje. Esto valida la categoria, pero no resuelve el hueco de `human ownership verification`. Fuentes:

- [About GitHub Copilot code review](https://docs.github.com/en/copilot/concepts/agents/code-review)
- [GitHub Copilot in VS Code](https://code.visualstudio.com/docs/copilot/overview)
- [Output styles - Claude Code Docs](https://code.claude.com/docs/en/output-styles)

## Lectura aplicada a Sibar/Sibi

### 1. Ownership manifesto

El manifiesto local ya estaba bien orientado:

- attempt before explanation;
- evidence before narrative;
- readiness over output;
- ownership boundary como unidad;
- escalacion a Sibar cuando el gap deja de ser local.

La evidencia externa no contradice ese manifiesto. Lo endurece.

### 2. Definiciones operativas recomendadas

### Cognitive load

Estado de esfuerzo mental necesario para comprender o reparar una boundary en este intento.

### Cognitive debt

Pasivo acumulado cuando un cambio o artefacto aceptado supera el ownership demostrado y el gap persiste entre intentos, relaciones o dias.

### Ownership

Capacidad demostrada, no declarada, de:

- explicar que cambio;
- conectar boundary con evidencia;
- anticipar un riesgo o efecto de cambio;
- reparar un gap minimo;
- transferir parte de esa comprension a una relacion cercana cuando aplique.

### 3. Formula de producto recomendada

No mostrar una formula unica al usuario. Mantenerla como regla interna:

```text
ownership confidence is earned by attempt + evidence fit + calibration + transfer
```

Y derivar debt desde señales locales:

```text
cognitive debt signal =
  relation_gap_density
  + readiness_debt
  + calibration_gap
  + recurring_gap_pressure
```

Esto es consistente con la spec local de metricas, pero agrega dos restricciones:

1. ninguna metrica vale sin `attempt_id`;
2. ninguna metrica se muestra como prueba de mastery.

## De research a implementacion

### 1. Contratos que deberian existir o endurecerse

### A. Attempt contract

Mantener la idea local de `attempt_id`, pero agregar:

- `attempt_prompt_id`
- `boundary_id`
- `answer_mode` (`typed`, `selected`, `mixed`)
- `self_confidence_before`
- `self_confidence_after`
- `attempt_outcome` (`connected`, `partial`, `inconclusive`, `no_answer`, `conflict`)

Razon: la IOED sugiere que la confianza antes y despues del intento importa como señal de calibracion.

### B. Ownership question contract

Agregar tipologia de pregunta:

- `what_changed`
- `why_this_boundary`
- `caller_or_consumer`
- `test_or_contract`
- `risk_if_changed`
- `repair_step`
- `transfer_probe`

Razon: permite medir no solo acierto sino tipo de hueco.

### C. Gap contract

Agregar:

- `gap_type`
- `relation_scope`
- `repair_cost_band` (`small`, `medium`, `large`)
- `recurs_on_boundary`
- `recurs_across_days`

Razon: debt es acumulacion, no solo error puntual.

### D. Evidence contract

El spec actual esta bien. Recomendacion: sumar una distincion de `relation_anchor`:

- `caller`
- `callee`
- `test`
- `doc`
- `runtime_contract`
- `diff_hunk`

Razon: hace reproducible el pasaje desde evidence a UI y desde UI a repair.

### E. Readiness contract

No permitir `owned` o equivalente fuerte sin:

- intento registrado;
- evidencia anclada;
- calibracion dentro de umbral;
- ausencia de conflicto abierto;
- transferencia si la boundary tiene fan-out mayor que umbral.

### 2. Ingestion LLM acotada

El LLM no debe producir readiness. Solo puede producir:

- boundary candidates;
- question candidates;
- inferred relation hypotheses;
- repair suggestions;
- contradiction alerts.

Input minimo para el modelo:

```json
{
  "boundary": {},
  "attempt": {},
  "evidence_refs": [],
  "observed_relations": [],
  "open_gaps": [],
  "allowed_outputs": [
    "question",
    "repair",
    "boundary_hypothesis",
    "transfer_probe"
  ]
}
```

Regla de ingestion:

```text
LLM output -> schema validate -> evidence cross-check -> downgrade if unverifiable -> UI projection
```

### 3. UI reproducible

### Principle

La UI no deberia "explicar mas". Deberia `hacer visible el proximo acto verificable`.

### Recommended right-panel sequence

1. `Current boundary`
2. `Why this boundary now`
3. `Attempt prompt`
4. `Confidence before`
5. `Evidence anchors`
6. `Your answer`
7. `Gap diagnosis`
8. `Smallest repair`
9. `Re-attempt`
10. `Transfer probe` cuando aplique

### States to preserve

- `owned`
- `partial`
- `blocked`
- `gap`
- `questionable`

### States to add carefully

- `uncalibrated`
- `transfer_pending`
- `recurring_gap`

Estas etiquetas no son cosmeticas. Tienen que salir de contratos y no de copy libre.

### 4. Verificacion reproducible

Cada afirmacion visible debe tener:

- `attempt_id`
- `boundary_id`
- `evidence_ref_ids`
- `rule_id` o `manifest_action_id`

Eso permite:

- replay en lab;
- fixture deterministica;
- inspeccion por verificador gpt-5.2 high;
- Playwright sobre el mismo trayecto.

## Traduccion a slices del workbench

### Slice 3: Relation-Gap Evidence Extraction

Endurecer para que no solo detecte relacion, sino tipo de deuda potencial:

- `missing caller`
- `missing test path`
- `missing contract path`
- `context mismatch`
- `verification bypass risk`

Research gate:

- al menos una fixture donde el modelo infiere una relacion y el runtime la baja a `unverified`;
- al menos una fixture donde no hay caller y eso bloquea readiness.

### Slice 4: Boundary Builder and Risk Scoring

Agregar peso por:

- fan-out;
- dependency depth;
- relation uncertainty;
- recurring unresolved gap.

Research gate:

- demostrar que el boundary de mayor riesgo no es necesariamente el archivo mas grande ni el diff mas largo.

### Slice 5: Attempt Harness, Calibration, and Readiness Gate

Este es el slice mas directamente validado por la literatura.

Agregar:

- confianza antes/despues;
- prompt typing;
- explicit `no answer` path;
- repair step ligado a evidencia;
- rechazo de readiness por sobreconfianza.

Research gate:

- caso de usuario confiado pero inconcluso;
- caso de usuario poco confiado pero correcto;
- re-attempt que reduce calibration gap.

### Slice 6: Transfer Verification

No tratar transfer como nice-to-have. Es el anti-falso-positivo principal despues del intento.

Research gate:

- una boundary pasa intento local pero falla transfer;
- el estado no consolida ownership estable hasta reparar eso.

### Slice 7: Workspace Escalation

Escalar a Sibar cuando aparezca una de estas combinaciones:

- `recurring_gap` + `high load`
- dos intentos fallidos + prerequisito fuera de boundary actual
- transfer fail + dependency chain
- alto fan-out + baja calibracion persistente

### Slice 8: Ownership Memory Store

Sin memoria no hay debt; solo errores sueltos. Este slice es obligatorio para que `cognitive debt` tenga realidad operativa.

Guardar:

- intentos;
- cambios de confianza;
- gaps recurrentes;
- transfer results;
- repair history.

### Slice 9: Metrics + Daily Readout

Recomendacion clave: no mostrar un `Debt Score` unico como headline. Mostrar:

- top unresolved boundaries;
- calibration hotspots;
- recurring gaps;
- transfer failures;
- next 3 repair actions.

La lectura diaria debe priorizar accion, no ranking.

## Harness-ready plan: research -> contratos -> UI -> tests

### Fase R1. Spec hardening

Outputs:

- actualizar spec de runtime/evidence si hace falta;
- definir campos nuevos para attempt/calibration/transfer.

Workers:

- implementacion docs/spec worker
- verificador gpt-5.2 high

Acceptance:

- cada nuevo campo tiene formula o source;
- no hay metricas sin trazabilidad.

### Fase R2. Fixture protocol

Outputs:

- fixtures con 4 patrones minimos:
  - black-box acceptance
  - context mismatch
  - missing caller/test path
  - confident-but-wrong answer

Acceptance:

- cada fixture tiene expected evidence refs, expected state, expected gap and repair.

### Fase R3. Runtime contracts

Outputs:

- types para attempt, gap recurrence, calibration, transfer;
- derivaciones deterministicas sin modelo.

Acceptance:

- el runtime puede recomputar estado desde artefactos persistidos.

### Fase R4. UI path

Outputs:

- panel de intento;
- confidence before/after;
- repair + re-attempt;
- transfer probe;
- readout minimo.

Acceptance:

- no hay explain-first path;
- todo estado visible tiene evidencia o regla.

### Fase R5. Verification

Outputs:

- Playwright path por cada fixture;
- browser/agent manifest equivalente.

Acceptance:

- misma ruta validada por UI y manifiesto;
- mismatch bloquea claim visible.

## Hipotesis falsables

### H1. Attempt-first reduce falsa confianza

Prediccion:

- la confianza promedio deberia bajar o calibrarse despues del primer intento en casos de baja comprension real.

Refutacion:

- si la confianza antes/despues no cambia y aun asi el diagnostico mejora, la IOED puede no ser una señal tan util en este contexto.

### H2. Verification loops predicen mejor ownership que output speed

Prediccion:

- usuarios que hacen reintento con evidence anchors y repair minima consolidan mejor transfer que usuarios que solo leen explicaciones.

Refutacion:

- si la explicacion directa produce igual o mejor transferencia con menor costo, el manifiesto attempt-first necesita revision.

### H3. Boundary-level routing es mejor que file-level routing

Prediccion:

- las preguntas sobre relations/boundaries discriminan mejor ownership que preguntas por archivo aislado.

Refutacion:

- si file-level prompts predicen igual de bien transfer y repair success, la complejidad extra del boundary model podria ser innecesaria.

### H4. Memory of recurring gaps es necesaria para hablar de debt

Prediccion:

- sin memoria, los usuarios y verificadores no pueden distinguir entre confusiones puntuales y pasivos acumulados.

Refutacion:

- si una sesion aislada explica casi toda la varianza util para routing, la nocion de debt acumulada puede estar sobrediseñada para v0.1.

## Riesgos

1. confundir `cognitive debt` con un score de inteligencia del usuario;
2. usar autoconfianza como verdad en lugar de usarla como insumo de calibracion;
3. mostrar demasiadas metricas y aumentar la carga que queremos reducir;
4. dejar que el LLM meta relaciones inventadas y contamine readiness;
5. convertir el producto en tutor teorico en vez de loop de ownership verificable;
6. medir debt sin memoria y terminar con pseudometrica decorativa.

## Decisiones que quedan para el usuario/orquestador

1. Si `cognitive debt` sera visible como termino en UI o quedara interno.
2. Si el umbral de transferencia para consolidar `owned` aplica siempre o solo en boundaries con alto fan-out.
3. Si la calibracion visible al usuario sera numerica o solo cualitativa.
4. Si el readout diario vive en Sibi o solo despues de escalacion a Sibar.
5. Si la primera implementacion de `ownership memory` queda local/session-scoped o ya nace exportable.

## Recomendacion de producto

Para v0.1:

- mantener `cognitive debt` como termino interno de sistema y research;
- mostrar al usuario lenguaje mas concreto:
  - `ownership gaps`
  - `unverified relation`
  - `recurring gap`
  - `repair next`
  - `transfer pending`

Eso baja riesgo de sonar pseudo-cientifico demasiado pronto.

## Propuesta de siguiente research loop

Si el parent quiere seguir el metodo de autoresearch en otro worker, el siguiente loop deberia ser estrecho:

```text
Pregunta:
Que señales minimas permiten detectar "confident but wrong" sin usar modelo?

Superficie editable:
solo docs/spec + fixtures

Metricas de exito:
- se puede derivar estado deterministico
- hay al menos 3 fixtures discriminables
- el verificador puede rechazar owned con trazabilidad
```

## Changelog note

No actualice `CHANGELOG.md` porque hay un slice activo tocandolo.

Texto sugerido para un commit posterior:

```text
Docs: add autoresearch memo for cognitive debt, ownership calibration, and workbench translation
```

## Fuentes principales

Fuentes consultadas el 2026-05-22:

1. Karpathy, `autoresearch`: [https://github.com/karpathy/autoresearch](https://github.com/karpathy/autoresearch)
2. Sweller 1988: [https://www.sciencedirect.com/science/article/pii/0364021388900237](https://www.sciencedirect.com/science/article/pii/0364021388900237)
3. Rozenblit y Keil 2002: [https://www.sciencedirect.com/science/article/pii/S0364021302000782](https://www.sciencedirect.com/science/article/pii/S0364021302000782)
4. Chi et al. 1989 index: [https://cir.nii.ac.jp/crid/1364233270473969408](https://cir.nii.ac.jp/crid/1364233270473969408)
5. Oli et al. 2023: [https://par.nsf.gov/biblio/10447589-improving-code-comprehension-through-scaffolded-self-explanations](https://par.nsf.gov/biblio/10447589-improving-code-comprehension-through-scaffolded-self-explanations)
6. Tamang et al. 2020: [https://digitalcommons.memphis.edu/facpubs/3247/](https://digitalcommons.memphis.edu/facpubs/3247/)
7. Carpenter 2012: [https://journals.sagepub.com/doi/10.1177/0963721412452728](https://journals.sagepub.com/doi/10.1177/0963721412452728)
8. Agarwal et al. 2021: [https://link.springer.com/article/10.1007/s10648-021-09595-9](https://link.springer.com/article/10.1007/s10648-021-09595-9)
9. Parasuraman y Manzey 2010: [https://pubmed.ncbi.nlm.nih.gov/21077562/](https://pubmed.ncbi.nlm.nih.gov/21077562/)
10. Heinonen et al. 2023: [https://aaltodoc.aalto.fi/items/148189ee-cfea-4dea-8c69-82cc176f94f9](https://aaltodoc.aalto.fi/items/148189ee-cfea-4dea-8c69-82cc176f94f9)
11. Qiao et al. 2025: [https://arxiv.org/abs/2511.02922](https://arxiv.org/abs/2511.02922)
12. Ahmad 2026: [https://arxiv.org/abs/2604.13277](https://arxiv.org/abs/2604.13277)
13. GitHub Copilot code review docs: [https://docs.github.com/en/copilot/concepts/agents/code-review](https://docs.github.com/en/copilot/concepts/agents/code-review)
14. VS Code Copilot overview: [https://code.visualstudio.com/docs/copilot/overview](https://code.visualstudio.com/docs/copilot/overview)
15. Claude Code output styles: [https://code.claude.com/docs/en/output-styles](https://code.claude.com/docs/en/output-styles)
16. Sonar verification gap report: [https://www.sonarsource.com/company/press-releases/sonar-data-reveals-critical-verification-gap-in-ai-coding/](https://www.sonarsource.com/company/press-releases/sonar-data-reveals-critical-verification-gap-in-ai-coding/)
