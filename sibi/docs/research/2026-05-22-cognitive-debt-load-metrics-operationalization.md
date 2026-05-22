# Cognitive Debt / Load Metrics Operationalization for Sibi Ownership Workbench

Fecha: 2026-05-22
Consultado en internet: 2026-05-22
Estado: memo operativo para traducir research a contratos, fixtures y slices

## Objetivo

Mejorar Slice 8/9 con una definicion operacional de `cognitive debt` y
`cognitive load` que sirva para:

- detectar deuda real sin fingir una mastery score global;
- usar solo senales observables o instrumentables con bajo costo;
- separar claramente metricas de sesion vs metricas longitudinales;
- evitar pseudo-mastery en PRs, boundaries y diffs AI-assisted.

Este memo complementa:

- [`docs/specs/sibi-ownership-workbench/06_cognitive_debt_metrics.md`](../specs/sibi-ownership-workbench/06_cognitive_debt_metrics.md)
- [`docs/specs/sibi-ownership-workbench/04_implementation_slices.md`](../specs/sibi-ownership-workbench/04_implementation_slices.md)
- [`docs/research/cognitive-debt-ownership-research.md`](./cognitive-debt-ownership-research.md)
- [`docs/research/2026-05-22-cognitive-debt-autoresearch-ownership-workbench.md`](./2026-05-22-cognitive-debt-autoresearch-ownership-workbench.md)
- [`../../../docs/specs/07_understanding_memory.md`](../../../docs/specs/07_understanding_memory.md)

## Executive Thesis

Para Sibi/Sibar:

- `cognitive load` es el costo de procesamiento de una boundary en este intento;
- `cognitive debt` es el pasivo acumulado cuando el cambio aceptado supera el
  ownership demostrado y el gap persiste;
- `pseudo-mastery` aparece cuando hay senales de exito local o confianza alta,
  pero faltan evidencia, verificacion, transferencia o estabilidad en el tiempo.

Conclusion practica: Slice 9 no deberia producir un score unico. Deberia producir
un panel pequeno de metricas y flags con formulas deterministas.

## 1. Definiciones operacionales

### 1.1 Cognitive load

Definicion operacional:

> esfuerzo mental requerido para construir, verificar o reparar el modelo mental
> de una ownership boundary durante un intento concreto.

En Sibi conviene separarlo en dos componentes:

1. `structural_load`: demanda objetiva de la boundary segun fanout, depth,
   conflictos y relaciones faltantes;
2. `experienced_load`: esfuerzo reportado por la persona al cerrar el intento.

`cognitive load` no implica deuda por si solo. Puede haber alta carga con buen
aprendizaje si el usuario logra verificar, reparar y transferir.

### 1.2 Cognitive debt

Definicion operacional:

> pasivo acumulado por boundary cuando el sistema ya fue tocado, aceptado o
> marcado como listo, pero la persona no demuestra ownership suficiente sobre
> mecanismo, relaciones, riesgo y verificacion.

En Sibi la deuda no se define por "codigo dificil". Se define por evidencia de:

- gaps persistentes;
- sobreconfianza;
- falla de transferencia;
- retry sin consolidacion;
- estados `ready` que luego colapsan.

### 1.3 Pseudo-mastery

Definicion operacional:

> estado aparente de comprension en el que el usuario parece "listo" por una
> respuesta local, una explicacion larga o una confianza alta, pero no puede
> sostener esa comprension con evidencia, transferencia o reintentos estables.

En producto, pseudo-mastery debe modelarse como `flag`, no como score de
aprendizaje.

## 2. Research grounding

La propuesta abajo se apoya en cinco ideas bastante estables:

1. La carga cognitiva alta reduce aprendizaje util si la tarea exige demasiado
   procesamiento sin estructura ([Sweller 1988](https://www.sciencedirect.com/science/article/pii/0364021388900237)).
2. La autexplicacion y el scaffolding mejoran comprension y exponen gaps
   ([Oli et al. 2023](https://par.nsf.gov/biblio/10483041-improving-code-comprehension-through-scaffolded-self-explanations)).
3. La gente suele sobrestimar lo que entiende hasta que tiene que explicarlo
   ([Rozenblit and Keil 2002](https://www.sciencedirect.com/science/article/pii/S0364021302000782)).
4. Recuperar y transferir conocimiento es mejor prueba de consolidacion que
   recordar o repetir localmente ([Carpenter 2012](https://journals.sagepub.com/doi/10.1177/0963721412452728),
   [Agarwal et al. 2021](https://link.springer.com/article/10.1007/s10648-021-09595-9)).
5. En AI coding hay una brecha real entre uso, confianza y verificacion
   ([Sonar 2026-01-08](https://www.sonarsource.com/company/press-releases/sonar-data-reveals-critical-verification-gap-in-ai-coding/),
   [Qiao et al. 2025](https://arxiv.org/abs/2511.02922),
   [Ahmad 2026](https://arxiv.org/abs/2604.13277)).

## 3. Senales observables que podemos capturar hoy

No conviene inventar telemetria opaca. El punto de partida deberia ser lo que
ya existe o cae naturalmente de `attempts`, `evidence`, `ownership boundary`,
`transfer` y UI del workbench.

### 3.1 Senales derivables del contrato actual o de slices ya planeados

| Signal | Fuente | Scope |
| --- | --- | --- |
| `attempt_count` | historial de intentos por boundary | sesion + memoria |
| `self_confidence` | Slice 5 readiness contract | sesion |
| `repair_retry_count` | re-attempts luego de repair | sesion + memoria |
| `transfer_result` | Slice 6 | sesion + memoria |
| `relation_gap_count` | evidence extraction + gap builder | sesion |
| `candidate_relation_items` | scanner/evidence graph | sesion |
| `evidence_kind_mix` | `observed/inferred/unverified/conflict` | sesion |
| `conflict_evidence_count` | verifier/evidence | sesion |
| `boundary_fanout` | relation extraction | sesion |
| `dependency_depth` | relation graph | sesion |
| `open_question_count` | boundary builder | sesion |
| `readiness_state_history` | Slice 8 memory | memoria |
| `recurring_gap_tags` | Slice 8 memory | memoria |

### 3.2 UI events de bajo costo que valen la pena registrar

Estas no requieren "analytics" compleja. Son interacciones explicables y
directamente utiles para verificacion.

| Event | Para que sirve |
| --- | --- |
| `evidence_drawer_opened` | proxy de busqueda activa de evidencia |
| `evidence_ref_opened` | profundidad de inspeccion previa al submit |
| `relation_probe_opened` | confirma trabajo sobre relaciones, no solo archivo |
| `code_selection_created` | ancla la respuesta a lineas o simbolos |
| `attempt_submitted` | corte determinista para metricas |
| `repair_applied` | distingue progreso de simple retry |
| `transfer_probe_opened` | muestra verificacion mas alla del caso local |

Estas events deberian quedar pegadas a `attempt_id` y `boundary_id`.

### 3.3 Lo que no deberiamos usar como proxy primario

- longitud de la respuesta;
- tiempo total en pantalla;
- cantidad de clicks suelta;
- sentiment o tono;
- "AI explained X tokens";
- un score unico de mastery.

## 4. Metricas recomendadas

La recomendacion es publicar pocas metricas y calcular algunas flags internas.

### 4.1 Claim-slot rubric minimo

Antes de hablar de formulas, Slice 5 necesita un rubric chico por boundary. Si
no existe, `evidence_fit` queda demasiado libre.

Rubric minimo por boundary:

1. `responsibility`: que hace esta boundary;
2. `mechanism`: que cambio o que flujo implementa;
3. `relation`: caller/dependency/test/doc afectado;
4. `verification`: como se verifica o que se romperia.

Si una slot no aplica, se marca `n/a` y sale del denominador.

Resultado por slot:

- `correct`
- `partial`
- `missing`
- `conflict`

### 4.2 Evidence Coverage Ratio (`ECR`)

Mide cuanto de la boundary fue efectivamente sostenido con evidencia valida.

```text
ECR =
  (correct_slots + 0.5 * partial_slots)
  / applicable_slots
```

Reglas:

- un slot `conflict` cuenta como `0`;
- un slot solo puede ser `correct` o `partial` si referencia al menos un
  `evidence_ref`;
- `inferred` sin soporte observado no puede subir un slot a `correct`.

Interpretacion:

- alto `ECR` = mejor anclaje entre respuesta y evidencia;
- bajo `ECR` = respuesta narrativa, incompleta o desanclada.

Anti-patterns:

- abrir mucha evidencia irrelevante y usarla para maquillar cobertura;
- dar por buena una explicacion larga aunque no toque `relation` o
  `verification`.

### 4.3 Signed Calibration Gap (`SCG`)

Mide sobreconfianza o subconfianza, no solo distancia absoluta.

```text
SCG = self_confidence - ECR
```

Rango sugerido: `-1..1`

Lectura:

- `SCG > 0.25`: sobreconfianza material;
- `SCG < -0.25`: subconfianza material;
- cerca de `0`: calibracion sana.

Tambien conviene guardar:

```text
ABS_CG = abs(SCG)
```

Anti-patterns:

- usar solo el valor absoluto y perder si el problema es overconfidence o
  underconfidence;
- preguntar confianza despues de mostrarle la respuesta del sistema.

### 4.4 Relation Gap Density (`RGD`)

Mide cuanto de la deuda proviene de relaciones faltantes, no del archivo en si.

```text
RGD =
  relation_gap_count
  / max(1, candidate_relation_items)
```

Donde `relation_gap_count` incluye:

- missing caller;
- missing dependency path;
- missing test path;
- missing runtime contract;
- conflict sobre efecto relacional.

Anti-patterns:

- inflar `candidate_relation_items` con relaciones triviales;
- mezclar gaps semanticos con gaps de navegacion UI.

### 4.5 Verification Depth (`VD`)

Mide si hubo inspeccion activa antes de cerrar el intento. No reemplaza la
correccion, pero ayuda a diferenciar adivinanza de verificacion.

```text
VD =
  unique_evidence_refs_opened_before_submit
  / max(1, applicable_slots)
```

Podemos enriquecerlo con:

```text
verification_actions =
  evidence_ref_opened
  + relation_probe_opened
  + code_selection_created
```

pero el numerador principal deberia seguir siendo `evidence_refs` unicos.

Anti-patterns:

- contar clicks performativos;
- premiar exploracion infinita aunque no mejore `ECR`.

### 4.6 Transfer Stability (`TS`)

Mide si la comprension sale del caso puntual.

```text
TS =
  passed_transfer_probes
  / max(1, required_transfer_probes)
```

Reglas:

- `transfer_skip` no es pass;
- si la boundary requiere transferencia y no hubo probe, el estado no puede ser
  `stable_ready`.

Anti-patterns:

- usar una pregunta demasiado parecida al caso original;
- contabilizar transferencia opcional como equivalente a transferencia
  requerida.

### 4.7 Structural Load Index (`SLI`)

Mide carga objetiva de la boundary con senales baratas del repo.

```text
SLI =
  0.35 * norm(boundary_fanout)
  + 0.25 * norm(dependency_depth)
  + 0.20 * norm(candidate_relation_items)
  + 0.20 * norm(conflict_evidence_count + open_question_count)
```

`norm(x)` deberia ser una normalizacion robusta por percentiles locales o por
capado de rango, no por maximo absoluto del repo.

Lectura:

- alto `SLI` = boundary intrinsecamente demandante;
- no implica deuda por si solo.

Anti-patterns:

- tratar complejidad estructural como fracaso del usuario;
- recalcular con escalas cambiantes que rompan comparabilidad.

### 4.8 Experienced Load Check (`ELC`)

Mide esfuerzo reportado por el usuario luego del intento.

Opcion minima recomendada:

```text
ELC = normalized_post_attempt_effort
```

Implementacion simple:

- 1 pregunta tipo Paas mental effort de 1..9 al cerrar el intento;
- opcionalmente esconderla cuando la sesion es muy corta o demo-fixture.

`ELC` no deberia bloquear readiness por si solo. Su rol es:

- distinguir "alta deuda" de "alta demanda pero bien manejada";
- detectar mismatch entre `SLI` y experiencia reportada.

Anti-patterns:

- usar `ELC` como proxy de correctness;
- hacer demasiadas preguntas tipo survey y convertir el producto en formulario.

### 4.9 Recurring Gap Pressure (`RGP`)

Primera metrica claramente longitudinal de deuda.

```text
RGP =
  recurring_gap_occurrences_last_n_exposures
  / max(1, boundary_exposures_last_n)
```

Donde `gap` deberia ir por taxonomy estable, por ejemplo:

- `missing-caller`
- `missing-test-path`
- `mechanism-confusion`
- `overstates-scope`
- `cannot-verify`

Anti-patterns:

- guardar texto libre sin taxonomy y luego no poder agrupar recurrencias;
- usar ventanas demasiado largas que confundan aprendizaje reciente con historia
  remota.

### 4.10 Ready Collapse Rate (`RCR`)

Metrica longitudinal para detectar pseudo-mastery despues de marcar `ready`.

```text
RCR =
  boundaries_marked_ready_that_later_fail_transfer_or_reopen_gap
  / max(1, boundaries_marked_ready)
```

Si `RCR` sube, el problema no es solo la pregunta actual: el gate de readiness
esta dejando pasar ownership aparente.

## 5. Flags recomendadas

Mas utiles que un mega-score.

### 5.1 Pseudo-mastery flag

Disparar cuando se cumplan al menos dos:

- `ECR < 0.75`
- `SCG > 0.25`
- `TS = 0` cuando `required_transfer_probes > 0`
- `VD < 0.5`
- boundary marcada `ready` y luego reaparece un gap igual

Efecto:

- downgrade de `owned`/`ready` a `questionable` o `provisional_ready`;
- requerir repair minimo o transfer probe antes de avanzar.

### 5.2 Overload-without-debt flag

Disparar cuando:

- `SLI` alto;
- `ELC` alto;
- `ECR` alto;
- `TS` pasa.

Interpretacion:

- la tarea es pesada, pero la persona si esta aprendiendo;
- la accion de producto es pacing/scaffolding, no remediation.

### 5.3 Debt-carryover flag

Disparar cuando:

- `RGP` alto;
- `SCG` sigue positivo en varias exposures;
- `repair_retry_count` crece sin mejorar `ECR`.

Interpretacion:

- ya no es problema de una sola sesion;
- esto deberia empujar a memory/readout y posiblemente a handoff.

## 6. Session-local vs memory store

Separar esto en Slice 8/9 evita mezclar estado presente con deuda acumulada.

### 6.1 Puede ser session-local

| Metrica / signal | Razones |
| --- | --- |
| `ECR` | sale del intento actual |
| `SCG` | usa confianza y score actuales |
| `RGD` | depende del evidence graph actual |
| `VD` | depende de events previos al submit |
| `SLI` | sale de la boundary actual |
| `ELC` | auto-reporte actual |
| `TS` | puede resolverse en la sesion |

### 6.2 Requiere memory store

| Metrica / signal | Razones |
| --- | --- |
| `RGP` | necesita recurrencia entre exposures |
| `RCR` | necesita seguir boundaries que parecian ready |
| `calibration drift` | necesita varias observaciones |
| `gap decay / stale understanding` | necesita tiempo y revisit |
| `daily readout` real | necesita resumir varias boundaries y sesiones |

### 6.3 Recomendacion de contrato para Slice 8

Slice 8 no deberia guardar solo snapshots de boundary state. Deberia guardar:

1. `attempt_record`
2. `attempt_slot_results`
3. `ui_verification_events`
4. `transfer_probe_result`
5. `gap_tags`
6. `readiness_decision`
7. `readiness_reason_codes`

Cada item con:

- `boundary_id`
- `attempt_id`
- `timestamp`
- `evidence_ref_ids`
- `session_id`

Eso deja a Slice 9 recomputar metricas sin logica oculta.

## 7. Como deberia verse Daily Readout ("que aprendi hoy?")

El readout tiene que describir aprendizaje verificable, no autopercepcion.

### 7.1 Principios

- mostrar avance por boundary y relacion, no por charla;
- incluir que sigue incierto;
- mostrar al menos una prueba de transferencia o ausencia de ella;
- evitar lenguaje de "ya dominas X".

### 7.2 Campos recomendados

```text
DailyReadout
  date
  boundaries_advanced[]
  relations_i_can_now_explain[]
  unresolved_gaps[]
  repeated_gaps[]
  transfer_checks[]
  confidence_mismatches[]
  load_hotspots[]
  tomorrow_revisit[]
```

### 7.3 Forma de lectura

El bloque "que aprendi hoy" deberia sonar asi:

1. `Hoy pude explicar`:
   - boundaries o relaciones que pasaron `ECR` + `TS`.
2. `Todavia no puedo defender`:
   - gaps con `RGP` alto o `RGD` alto.
3. `Me confundi en`:
   - mismatches de calibracion (`SCG` alto).
4. `Me costo, pero cerro`:
   - `SLI`/`ELC` altos con exito.
5. `Mañana conviene revisar`:
   - stale concepts, repeated gaps, transfer pendiente.

### 7.4 Ejemplo de copy

```text
Hoy avanzaste 2 boundaries.
Ahora podes explicar el flujo de invalidacion en CacheBoundary y su test vecino.
Sigue abierto el caller path hacia ReportExporter.
Tuviste una senal de sobreconfianza en BillingGuard: confianza 0.9 con ECR 0.5.
El punto mas pesado del dia fue NotificationDispatcher; costo alto, pero la transferencia paso.
Manana conviene reintentar missing-caller en ReportExporter y revisar una vez mas el runtime contract.
```

## 8. Tests y fixtures que deberian probar cada metrica

No hace falta testear "la psicologia". Hace falta testear determinismo del
pipeline y guardrails correctos.

### 8.1 `ECR`

Fixture:

- boundary con 4 slots aplicables;
- intento con 2 `correct`, 1 `partial`, 1 `missing`.

Debe dar:

```text
ECR = (2 + 0.5) / 4 = 0.625
```

### 8.2 `SCG`

Fixture A:

- `self_confidence = 0.9`
- `ECR = 0.4`

Esperado:

```text
SCG = 0.5
```

Flag: sobreconfianza.

Fixture B:

- `self_confidence = 0.3`
- `ECR = 0.8`

Flag: subconfianza.

### 8.3 `RGD`

Fixture:

- 5 candidate relations;
- 3 gaps confirmados (`missing-caller`, `missing-test-path`, `conflict`).

Esperado:

```text
RGD = 3 / 5 = 0.6
```

### 8.4 `VD`

Fixture:

- 4 slots aplicables;
- 3 evidence refs unicos abiertos antes de `attempt_submitted`.

Esperado:

```text
VD = 3 / 4 = 0.75
```

Debe ignorar opens ocurridos despues del submit.

### 8.5 `TS`

Fixture:

- 1 transfer probe requerido;
- mismo intento local correcto, pero transfer fail.

Esperado:

- `TS = 0`
- no puede quedar `stable_ready`

### 8.6 `SLI`

Fixture:

- boundary con fanout alto, depth medio, varios conflicts.

Esperado:

- `SLI` alto aunque la persona luego pase la boundary;
- el test debe demostrar que `SLI` no baja readiness por si solo.

### 8.7 `ELC`

Fixture:

- `ELC` alto con `ECR` alto y `TS` pass.

Esperado:

- aparece `overload-without-debt`;
- no remediation automatica.

### 8.8 `RGP`

Fixture longitudinal:

- mismo `gap_tag = missing-caller` reaparece en 3 de 4 exposures.

Esperado:

```text
RGP = 0.75
```

### 8.9 `RCR`

Fixture longitudinal:

- 3 boundaries marcadas `ready`;
- 1 falla transferencia despues;
- 1 reabre el mismo gap.

Esperado:

```text
RCR = 2 / 3
```

### 8.10 Pseudo-mastery guardrail

Fixture:

- `ECR = 0.5`
- `SCG = 0.35`
- `TS = 0`
- `VD = 0.25`

Esperado:

- `pseudo_mastery_flag = true`
- no puede subir a `owned`

## 9. Recomendaciones concretas para Slice 8 y Slice 9

### 9.1 Slice 8

Reforzar el objetivo actual:

- no solo persistir attempts;
- persistir la unidad minima para recomputar metricas.

Agregar explicitamente:

1. claim-slot outcomes por attempt;
2. taxonomy de `gap_tags`;
3. UI verification events pegadas a `attempt_id`;
4. readiness reason codes;
5. transfer probe records;
6. `stale_after` o `next_review_at` para no fingir memoria eterna.

Sin esto, Slice 9 queda dependiente de heuristicas no auditables.

### 9.2 Slice 9

Separar en dos capas:

1. `session metrics`
   - `ECR`
   - `SCG`
   - `RGD`
   - `VD`
   - `SLI`
   - `ELC`
   - `TS`
2. `longitudinal debt/readout`
   - `RGP`
   - `RCR`
   - calibration drift
   - stale understanding
   - daily readout

Y agregar dos reglas:

- readiness no se resume a una sola formula;
- ninguna boundary pasa a `stable_ready` si requiere transferencia y no la tiene.

## 10. Posibles nuevos slices

### Slice 5A - Attempt Scoring Contract

Antes de Slice 8/9, conviene un slice pequeno que formalice:

- claim slots;
- slot outcomes;
- confidence capture timing;
- evidence ref requirements.

Sin ese contrato, `ECR` y `SCG` quedan ambiguos.

### Slice 6A - Transfer Probe Contract

Formaliza:

- cuando una boundary requiere transferencia;
- como se elige la boundary vecina;
- rubrica de `pass/fail/skip`.

Sin esto, `TS` se vuelve subjetivo.

### Slice 9A - Pseudo-mastery Guardrails

Si no se quiere inflar Slice 9, se puede separar un slice corto para:

- downgrade rules (`provisional_ready`, `questionable`);
- flags de sobreconfianza;
- collapse de ready.

## 11. Riesgos y decisiones

### Riesgos

1. Sobreinstrumentacion:
   demasiados events pueden volver caro el producto y opaco el analisis.
2. Score-itis:
   si todo termina en un numero unico, se pierde interpretabilidad.
3. Click-gaming:
   `VD` puede gamificarse si se cuentan clicks en lugar de evidencia util.
4. Boundary rubric pobre:
   si los claim slots no estan bien definidos, `ECR` y `SCG` miden ruido.
5. Transfer probe mal diseniado:
   un probe demasiado parecido al original no detecta pseudo-mastery.

### Decisiones recomendadas

1. Priorizar flags + 5-7 metricas pequenas sobre un mega-score.
2. Tratar `load` y `debt` como conceptos relacionados pero distintos.
3. Hacer que `ECR`, `SCG` y `TS` gobiernen pseudo-mastery.
4. Hacer que `RGP` y `RCR` vivan solo en memoria longitudinal.
5. Mantener el daily readout orientado a "que pude demostrar" y "que sigue
   incierto", nunca a "ya dominas X".

## 12. Fuente minima recomendada para el spec siguiente

Las fuentes mas utiles para el proximo pase de spec son:

1. Sweller 1988 para justificar `load` como demanda de tarea:
   [Cognitive load during problem solving: Effects on learning](https://www.sciencedirect.com/science/article/pii/0364021388900237)
2. Rozenblit and Keil 2002 para justificar `attempt-before-explanation`:
   [The misunderstood limits of folk science: an illusion of explanatory depth](https://www.sciencedirect.com/science/article/pii/S0364021302000782)
3. Oli et al. 2023 para self-explanations guiadas en code comprehension:
   [Improving code comprehension through scaffolded self-explanations](https://par.nsf.gov/biblio/10483041-improving-code-comprehension-through-scaffolded-self-explanations)
4. Heinonen et al. 2023 para boundaries y modelos mentales:
   [Synthesizing research on programmers' mental models of programs, tasks and concepts](https://aaltodoc.aalto.fi/items/148189ee-cfea-4dea-8c69-82cc176f94f9)
5. Carpenter 2012 y Agarwal et al. 2021 para transferencia y retrieval:
   [Testing enhances the transfer of learning](https://journals.sagepub.com/doi/10.1177/0963721412452728)
   [Retrieval practice consistently benefits student learning](https://link.springer.com/article/10.1007/s10648-021-09595-9)
6. Qiao et al. 2025 y Ahmad 2026 como evidencia emergente sobre AI coding y
   comprehension debt:
   [Code comprehension with GitHub Copilot](https://arxiv.org/abs/2511.02922)
   [Comprehension Debt in GenAI-Assisted Software Engineering Projects](https://arxiv.org/abs/2604.13277)
7. Sonar 2026 y GitHub Docs 2026 como contexto de mercado y verificacion:
   [Verification gap in AI coding](https://www.sonarsource.com/company/press-releases/sonar-data-reveals-critical-verification-gap-in-ai-coding/)
   [About GitHub Copilot code review](https://docs.github.com/en/copilot/concepts/agents/code-review)

## 13. Source log

Fuentes externas consultadas el 2026-05-22:

- Sweller, J. (1988). Cognitive load during problem solving: Effects on learning.
  https://www.sciencedirect.com/science/article/pii/0364021388900237
- Rozenblit, L., and Keil, F. (2002). The misunderstood limits of folk science:
  an illusion of explanatory depth.
  https://www.sciencedirect.com/science/article/pii/S0364021302000782
- Oli, S., et al. (2023). Improving code comprehension through scaffolded
  self-explanations. https://par.nsf.gov/biblio/10483041-improving-code-comprehension-through-scaffolded-self-explanations
- Heinonen, O., Lehtela, A., Hellas, A., and Fagerholm, F. (2023).
  Synthesizing research on programmers' mental models of programs, tasks and
  concepts. https://aaltodoc.aalto.fi/items/148189ee-cfea-4dea-8c69-82cc176f94f9
- Carpenter, S. K. (2012). Testing enhances the transfer of learning.
  https://journals.sagepub.com/doi/10.1177/0963721412452728
- Agarwal, P. K., Nunes, L. D., and Blunt, J. R. (2021). Retrieval practice
  consistently benefits student learning.
  https://link.springer.com/article/10.1007/s10648-021-09595-9
- Hart, S. G. (NASA TLX reference page, accessed 2026-05-22).
  https://humansystems.arc.nasa.gov/groups/TLX/
- Qiao, Y., et al. (2025, preprint). Code comprehension with GitHub Copilot:
  Performance gains, comprehension trade-offs, and behavioral predictors in
  brownfield programming. https://arxiv.org/abs/2511.02922
- Ahmad, A. (2026, preprint). Comprehension Debt in GenAI-Assisted Software
  Engineering Projects. https://arxiv.org/abs/2604.13277
- SonarSource (2026-01-08). Verification gap in AI coding.
  https://www.sonarsource.com/company/press-releases/sonar-data-reveals-critical-verification-gap-in-ai-coding/
- GitHub Docs (accessed 2026-05-22). About GitHub Copilot code review.
  https://docs.github.com/en/copilot/concepts/agents/code-review

Fuentes locales usadas:

- [`docs/specs/sibi-ownership-workbench/06_cognitive_debt_metrics.md`](../specs/sibi-ownership-workbench/06_cognitive_debt_metrics.md)
- [`docs/specs/sibi-ownership-workbench/04_implementation_slices.md`](../specs/sibi-ownership-workbench/04_implementation_slices.md)
- [`docs/specs/sibi-ownership-workbench/03_runtime_evidence_contract.md`](../specs/sibi-ownership-workbench/03_runtime_evidence_contract.md)
- [`docs/research/cognitive-debt-ownership-research.md`](./cognitive-debt-ownership-research.md)
- [`docs/research/2026-05-22-cognitive-debt-autoresearch-ownership-workbench.md`](./2026-05-22-cognitive-debt-autoresearch-ownership-workbench.md)
- [`../../../docs/specs/07_understanding_memory.md`](../../../docs/specs/07_understanding_memory.md)
