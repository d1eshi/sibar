# SIBAR Auditor Response 1

## Core Thesis

SIBAR puede convertirse en MVP funcional solo si reduce su promesa a esto:

> Dado un artefacto acotado del repo, SIBI puede hacer que el usuario prediga, trace y modifique mentalmente una parte concreta del sistema, y luego producir un juicio de readiness con evidencia citada del repo y de la respuesta del usuario.

No debe prometer "entiendo tu codebase". Debe prometer:

> "Puedo evaluar si tú estás listo para tocar este flujo específico."

La versión self-hosted es viable porque el repo ya tiene las piezas correctas: concept graph, autopsy, gap detection, readiness, evals determinísticos y trazas LLM. Pero todavía el riesgo principal es que el sistema parezca grounded solo porque cita archivos, sin probar comprensión causal.

## MVP Definition

El MVP más pequeño no es una app completa. Es una sesión reproducible sobre un slice de SIBAR/SIBI.

Slice recomendado:

`artifact intake -> concept graph -> ownership question -> user answer -> gap/readiness -> issue candidate -> repair -> re-evaluation`

Debe funcionar sobre un boundary como:

- `src/runtime-concept-graph.ts`
- `src/runtime-gap-detection.ts`
- `src/runtime-readiness.ts`
- tests asociados en `Tests/`

Promesa mínima demostrable:

1. SIBI selecciona un concepto real: por ejemplo "Runtime state persistence".
2. Hace una pregunta que requiere trazar evidencia.
3. El usuario responde.
4. SIBI clasifica la respuesta contra evidencia.
5. Detecta un gap concreto o confirma readiness limitada.
6. Genera una reparación accionable.
7. Reevalúa la misma habilidad después del repair.

Si no hay re-evaluación, no es aprendizaje. Es feedback.

## Required Architecture

La arquitectura necesaria tiene cinco capas, no más:

1. **Artifact Boundary**
   Define qué archivos pueden usarse como evidencia. Sin esto, el sistema hace trampa. Ya existe en specs y evals.

2. **Repo Evidence Index**
   No basta con citas. Cada claim debe apuntar a archivo, línea, excerpt y tipo de evidencia:
   - source behavior
   - test behavior
   - doc/spec intent
   - user answer
   - prior memory
   - failed/accepted model signal

3. **Concept/Flow Graph**
   "Entender un codebase" significa representar responsabilidades, flujos y riesgos, no listar archivos. El contrato actual en `docs/specs/02_concept_graph.md` va en la dirección correcta.

   Pero falta distinguir:
   - file dependency
   - runtime flow
   - data lifecycle
   - ownership boundary
   - product concept
   - test oracle

4. **Evaluation Engine**
   Debe separar:
   - user answer
   - artifact truth
   - expected reasoning operation
   - grading decision
   - confidence
   - repair action

   Lo actual en `src/runtime-gap-detection.ts` ya modela gaps, pero el grading todavía depende demasiado de una `AnswerQuality` externa. El MVP necesita casos donde la clasificación sea verificable por rubric.

5. **Learning Memory + Readiness**
   Readiness no puede ser "contestó bien una vez". Debe ser:
   - respondió con evidencia
   - corrigió un gap
   - transfirió a un caso cercano
   - sostuvo la explicación después de un intervalo
   - predijo riesgo de cambio

## Gap Taxonomy

Tipos de gaps que SIBI debe detectar:

1. **Surface Gap**
   El usuario reconoce nombres pero no responsabilidades.
   Ejemplo: sabe que existe `runtime-gap-detection.ts`, pero no puede decir cuándo se crea un `LearningGap`.

2. **Flow Gap**
   No puede trazar una operación entre archivos.
   Ejemplo: no conecta autopsy question -> answer quality -> gap -> readiness report.

3. **Boundary Gap**
   Confunde qué está dentro o fuera del artifact boundary.
   Este es crítico para SIBAR porque self-hosting sin boundary se convierte en repo chat genérico.

4. **Responsibility Gap**
   Atribuye la decisión al módulo equivocado.
   Ejemplo: dice que el LLM decide readiness cuando el spec dice que deterministic validation es la autoridad.

5. **Evidence Gap**
   Responde correctamente de forma vaga, sin citar comportamiento observable.

6. **Causal Gap**
   Puede describir código, pero no predecir qué se rompe si cambia.

7. **Test Oracle Gap**
   No sabe qué test prueba qué contrato, o confunde cobertura con prueba de comprensión.

8. **Product Gap**
   Entiende el código pero no la promesa pedagógica que el código intenta servir.

9. **False Confidence Gap**
   Declara alta confianza mientras contradice evidencia del repo.

10. **Design-Induced Gap**
   El usuario falla porque el software/docs/API están mal diseñados, no porque no entienda.

## Evaluation Contract

Antes de declarar un gap, SIBI debe exigir cinco evidencias:

1. **User Evidence**
   Qué dijo, predijo, omitió o declaró incierto el usuario.

2. **Artifact Evidence**
   Archivo/línea/excerpt dentro del boundary.

3. **Expected Operation**
   Qué tipo de comprensión se estaba evaluando:
   - recall
   - explanation
   - trace
   - prediction
   - modification
   - debug
   - transfer

4. **Contradiction or Insufficiency**
   Debe decir exactamente si el problema es:
   - incorrecto
   - incompleto
   - no grounded
   - sobreconfiante
   - fuera de boundary
   - insuficiente para el layer esperado

5. **Next Repair**
   Un gap sin repair action no sirve.

Contrato mínimo:

```ts
GapFinding {
  concept_id
  evaluated_operation
  expected_answer_shape
  user_claim
  artifact_counterevidence
  missing_reasoning_step
  confidence
  severity
  repair_task
  reevaluation_prompt
}
```

La regla dura:

> No hay gap sin cita del usuario y cita del repo.

## Benchmark Design

El primer benchmark interno debe probar si SIBI detecta gaps reales mejor que un chat genérico.

Ya existe una base en:

- `Tests/deterministic-pedagogy-evals.test.ts`
- `docs/missions/sibi-v01-build-to-learn/evals/dataset/cases`
- `src/evals/deterministic-pedagogy`

Pero el benchmark actual parece centrado en clasificación de casos fixture. El benchmark self-hosted debe agregar casos con respuestas humanas o simuladas sobre el propio repo.

Diseño concreto:

1. Seleccionar 5 conceptos reales:
   - artifact boundary
   - concept graph generation
   - gap detection
   - readiness report
   - model signal validation

2. Crear 8 respuestas por concepto:
   - correct grounded
   - correct but uncited
   - partial
   - wrong responsibility
   - wrong flow
   - overconfident wrong
   - declared uncertainty
   - design-confusion plausible

3. Gold labels manuales:
   - gap type
   - expected layer
   - severity
   - confidence
   - required evidence
   - acceptable repair task

4. Ejecutar:
   - SIBI
   - generic chat with same files
   - generic chat without eval contract
   - maybe SIBI with LLM disabled

5. Medir no solo si "acierta", sino si produce evidencia útil.

## Product Loop

El loop correcto:

1. **Evaluation**
   SIBI pregunta algo que requiere acción cognitiva, no definición.
   Ejemplo: "Traza cómo una respuesta parcial termina afectando el readiness report."

2. **Gap**
   Detecta el missing reasoning step.
   Ejemplo: "El usuario salta de answer quality a readiness sin explicar persistencia del gap en artifact session."

3. **Issue**
   Convierte el gap a un issue de aprendizaje o producto:
   - learning issue: usuario necesita practicar trace
   - docs issue: falta explicación del boundary
   - product issue: UI no muestra evidence chain
   - test issue: no hay coverage del caso

4. **Repair**
   Asigna tarea concreta:
   - trace across files
   - explain from cited lines
   - predict code change impact
   - write missing test expectation
   - improve docs where confusion is design-induced

5. **Improvement**
   Puede ser mejora del usuario o mejora del producto.
   SIBI debe decidir cuál.

6. **Re-evaluation**
   Pregunta equivalente, no idéntica.
   Si el usuario memorizó la respuesta anterior, no cuenta.

## Cómo distinguir gap del usuario vs problema de diseño

Regla práctica:

Es gap del usuario si:

- la evidencia existe
- está dentro del boundary
- el naming/docs/tests son razonablemente discoverable
- otros usuarios o gold answer lo resuelven
- la respuesta contradice código claro

Es problema de diseño si:

- la responsabilidad está duplicada o dispersa sin razón
- el nombre del módulo induce una interpretación falsa
- docs y código contradicen
- tests no expresan el contrato
- el sistema requiere conocimiento oculto
- el usuario falla con una inferencia razonable

SIBI debería producir dos outputs separados:

```text
LearningGap: "El usuario no conectó X con Y."
ProductIssue: "El repo no hace visible que X gobierna Y."
```

Si todo se etiqueta como gap del usuario, el producto se vuelve arrogante e inútil.

## Metadata Necesaria

Para que un proyecto sea evaluable, necesita:

1. **Manifest**
   - artifact id
   - included paths
   - excluded paths
   - entry points
   - test commands
   - docs/spec paths
   - owner intent

2. **Roadmap**
   - qué capacidades existen
   - qué está fuera de scope
   - qué promesas no deben evaluarse todavía

3. **Concept Map**
   - conceptos
   - source evidence
   - dependencies
   - flows
   - risk areas

4. **Docs**
   - product promise
   - architecture notes
   - contracts
   - known limitations

5. **Tests**
   - behavior tests
   - eval tests
   - fixture cases
   - regression cases for false confidence

6. **Mastery Checks**
   Para cada concepto:
   - explain check
   - trace check
   - modify check
   - debug check
   - transfer check

7. **Rubrics**
   No basta con preguntas. Cada check necesita:
   - expected evidence
   - forbidden claims
   - partial credit rules
   - gap labels
   - repair action

## Métricas

Usaría estas métricas desde el primer benchmark:

1. **Gap Precision**
   De los gaps declarados, cuántos son reales según gold label.

2. **Gap Recall**
   De los gaps reales, cuántos detecta.

3. **Gap Type Accuracy**
   No basta detectar gap. Debe clasificar boundary vs flow vs responsibility vs evidence.

4. **Evidence Quality**
   Score 0-3:
   - 0: sin evidencia
   - 1: cita irrelevante
   - 2: cita relevante pero incompleta
   - 3: cita exacta + conecta user answer con artifact behavior

5. **Time-to-Clarity**
   Minutos o turnos hasta que el usuario sabe:
   - qué no entendió
   - por qué importa
   - qué hacer ahora

6. **Repair Effectiveness**
   Mejora entre evaluación inicial y reevaluación:
   - layer delta
   - fewer missing steps
   - better evidence usage
   - lower false confidence

7. **False Confidence Detection**
   Recall específico sobre respuestas confiadas pero equivocadas.

8. **Design-Issue Detection**
   Porcentaje de confusiones razonables clasificadas como producto/docs, no como usuario.

9. **Grounding Rate**
   Porcentaje de claims con citas válidas dentro del boundary.

10. **Unsupported Claim Rate**
   Cualquier readiness claim sin evidencia debería ser fallo crítico.

## Qué Puede Simularse en MVP

Puede simularse:

- UI completa
- generación automática perfecta del concept map
- LLM live runner
- issue tracker real
- multi-user memory
- long-term spaced repetition
- agent orchestration
- full static analysis

No puede simularse:

- artifact boundary
- evidence citations
- user answer capture
- gap contract
- readiness report
- benchmark gold labels
- reevaluation
- comparación contra generic chat

El corazón del MVP no es IA. Es el contrato de evaluación.

## Qué NO Construir Todavía

No construiría todavía:

- app Mac sofisticada
- dashboard de aprendizaje
- editor plugin
- voice/screen capture
- agent que modifica el repo automáticamente
- knowledge graph complejo
- embeddings/vector DB
- multi-repo support
- marketplace de proyectos
- gamification
- "AI mentor persona"
- generación automática de cursos

Todo eso puede esconder que el sistema no evalúa nada.

## Riesgos

Riesgos técnicos:

- Citas superficiales que no prueban causalidad.
- Concept graph heurístico que parece inteligente pero omite flujos reales.
- LLM grader inestable.
- Boundary leakage.
- Readiness inflado por una sola respuesta buena.
- Tests que validan fixtures pero no comportamiento pedagógico real.
- Self-hosting demasiado circular: SIBI evalúa SIBI con assumptions de SIBI.

Riesgos pedagógicos:

- Confundir explicación verbal con ownership.
- Penalizar incertidumbre honesta.
- No distinguir falta de conocimiento de mala UX del codebase.
- Feedback demasiado abstracto.
- Repairs que enseñan la respuesta, no la habilidad.
- No medir transferencia.

Riesgos de producto:

- Usuario no quiere ser evaluado; quiere avanzar.
- El loop puede sentirse lento.
- Si el primer resultado es obvio, parece un chat caro.
- Si el resultado es severo sin buena evidencia, pierde confianza.
- El valor aparece después de varias sesiones, pero el MVP necesita valor en una.

## 7-Day Build Plan

Día 1:
Definir `sibar.selfhost.manifest.json` con boundary, entrypoints, concepts iniciales, test commands y scope explícito.

Día 2:
Crear 5 mastery checks self-hosted sobre runtime/concept graph/gap/readiness. Cada check debe tener gold answer, required evidence y forbidden claims.

Día 3:
Agregar evaluator que tome `user_answer + check + artifact evidence` y produzca `GapFinding` con contrato estricto.

Día 4:
Crear dataset de 40 respuestas simuladas con gold labels. Incluir overconfidence, uncertainty, boundary violations y design-induced confusion.

Día 5:
Implementar comparación contra generic chat: mismo prompt, mismos archivos, sin contrato SIBI. Medir precision/recall/evidence quality.

Día 6:
Cerrar loop de repair: cada gap produce un repair task y una reevaluation prompt equivalente.

Día 7:
Demo self-hosted completa:
`SIBI evalúa comprensión de SIBI -> detecta gap -> genera issue candidate -> repair -> reevaluación -> readiness report`.

Criterio de éxito de 7 días:

> En al menos 30 casos gold, SIBI supera al chat genérico en evidence quality y false confidence detection, aunque no gane en fluidez.

## Brutal Critique

La idea falla si intentas vender "SIBI entiende codebases". Eso es demasiado grande, demasiado vago y demasiado fácil de falsear.

La versión defendible es más pequeña y más fuerte:

> SIBI verifica ownership local sobre un flujo concreto del codebase usando evidencia, predicción, reparación y reevaluación.

Self-hosting es correcto, pero peligroso. Si SIBI no puede ayudarte a entender por qué `src/runtime-gap-detection.ts` produce un gap, cómo ese gap llega a `src/runtime-readiness.ts`, y qué test protege ese contrato, entonces no tienes producto todavía. Tienes documentación interactiva.

El mayor riesgo no es técnico. Es epistemológico: declarar comprensión sin una prueba observable de transferencia o cambio seguro. El MVP debe ser aburrido, estrecho y duro con la evidencia. Ahí sí puede funcionar.
