# Cognitive Debt, Cognitive Load y Ownership Verification para Sibi/Sibar

Fecha: 2026-05-22

## Objetivo

Conectar el manifiesto de Sibar/Sibi con una hipótesis de producto accionable sobre `cognitive debt` y con un set inicial de métricas, interacción y próximos slices. El punto de partida local es consistente: Sibi ya se define como sistema `attempt-before-explanation`, enfocado en ownership verificable sobre artefactos reales, no en chat ni en output rápido ([`docs/product/README.md`](../../../docs/product/README.md), [`docs/product/00_foundation.md`](../../../docs/product/00_foundation.md), [`docs/product/01_moat.md`](../../../docs/product/01_moat.md), [`docs/ownership-wedge.md`](../ownership-wedge.md), [`docs/specs/sibi-ownership-workbench/04_implementation_slices.md`](../specs/sibi-ownership-workbench/04_implementation_slices.md), [`docs/specs/deep-ownership-workspace/00_current_north_star.md`](../../../docs/specs/deep-ownership-workspace/00_current_north_star.md)).

## Método usado

No instalé ni dependí de una skill externa. La decisión fue deliberada: para este trabajo convenía una metodología pública y trazable, con enlaces directos a papers, abstracts, docs oficiales y documentos internos, evitando dependencia de autenticación, calidad variable de resúmenes cerrados o heurísticas opacas de terceros.

Proceso seguido:

1. leer el marco local mínimo pedido;
2. formular preguntas e hipótesis iniciales;
3. buscar fuentes académicas/primarias y docs oficiales recientes;
4. separar evidencia por tipo: teoría cognitiva, program comprehension, mercado/producto, docs internas;
5. evaluar credibilidad, recencia y sesgos;
6. sintetizar una tesis operativa para producto y métricas.

## 1. Research Plan

### Preguntas

1. ¿Qué debería significar `cognitive debt` en Sibi más allá de una metáfora?
2. ¿Cómo se diferencia de `technical debt`, `cognitive load` y code review tradicional?
3. ¿Qué evidencia externa valida un loop `attempt-first`, `self-explanation`, `verification`, `transfer` y `readiness`?
4. ¿Qué señales medibles pueden estimar ownership real sin fingir una “mastery score” total?
5. ¿Cuándo Sibi resuelve el problema localmente y cuándo debe derivar a un Workspace más profundo de Sibar?

### Hipótesis iniciales

1. La deuda cognitiva no es solo “no entiendo el repo”; es el diferencial entre superficie mutada y modelo humano verificablemente demostrado.
2. `Attempt-first` no es una preferencia UX; es un mecanismo anti-ilusión de comprensión y anti-automation bias.
3. La mejor unidad de evaluación no es el archivo sino la `ownership boundary` y sus relaciones.
4. Las métricas útiles no miden solo exactitud; deben medir calibración, cobertura de evidencia, transferencia y churn.
5. El Workspace de Sibar no debe abrirse por defecto: aparece cuando el gap ya no es de una review guiada sino de construcción/rehabilitación de modelo mental multi-sesión.

### Criterios de fuente

- Académicas/primarias: papers clásicos de cognición/aprendizaje, revisiones sistemáticas, abstracts abiertos, proceedings recientes.
- Producto/mercado: docs oficiales de GitHub, Anthropic, VS Code, y reportes oficiales recientes sobre verificación.
- Internas: manifiesto/product docs/specs activas del repo.

### Keywords usadas

- `cognitive load theory`
- `self explanation learning`
- `illusion of explanatory depth`
- `automation bias complacency`
- `program comprehension mental models`
- `retrieval practice transfer learning`
- `AI coding ownership responsibility`
- `comprehension debt ai-assisted software engineering`
- `verification gap AI coding`
- `agentic code review official docs`

## 2. Source Gathering

### Académicas y primarias

1. John Sweller, “Cognitive load during problem solving: Effects on learning” (1988), base de `cognitive load theory` y del costo de resolver sin estructura instruccional adecuada: [ScienceDirect](https://www.sciencedirect.com/science/article/pii/0364021388900237).
2. Chi, Bassok, Lewis, Reimann y Glaser, “Self-explanations: How students study and use examples in learning to solve problems” (1989), evidencia fuerte de que los mejores aprendices generan explicaciones propias y monitorean mejor sus gaps: [Arizona Board of Regents / DOI](https://experts.azregents.edu/en/publications/self-explanations-how-students-study-and-use-examples-in-learning/).
3. Rozenblit y Keil, “The misunderstood limits of folk science: an illusion of explanatory depth” (2002), base para el problema de sobreestimar comprensión hasta intentar explicar: [ScienceDirect abstract](https://www.sciencedirect.com/science/article/pii/S0364021302000782).
4. Parasuraman y Manzey, “Complacency and bias in human use of automation” (2010), revisión sobre automation bias y complacencia en sistemas automatizados: [PubMed](https://pubmed.ncbi.nlm.nih.gov/21077562/).
5. Heinonen, Lehtelä, Hellas y Fagerholm, “Synthesizing research on programmers’ mental models...” (2023), revisión sistemática sobre modelos mentales de programadores: [Aalto Open Access](https://aaltodoc.aalto.fi/items/148189ee-cfea-4dea-8c69-82cc176f94f9).
6. Carpenter, “Testing Enhances the Transfer of Learning” (2012), revisión útil para justificar transferencia como outcome y no solo recuerdo local: [SAGE](https://journals.sagepub.com/doi/10.1177/0963721412452728).
7. Agarwal, Nunes y Blunt, “Retrieval Practice Consistently Benefits Student Learning” (2021), revisión sistemática aplicada: [Springer](https://link.springer.com/article/10.1007/s10648-021-09595-9).
8. Ahmad, “Comprehension Debt in GenAI-Assisted Software Engineering Projects” (2026), paper reciente sobre patrones de acumulación de debt en uso de GenAI: [arXiv](https://arxiv.org/abs/2604.13277).
9. Seo, Deldari y Mentis, “Whose Code Is It? How AI Autonomy Reshapes Ownership, Responsibility, and Disclosure in AI-Assisted Programming” (2026), registro institucional de conference proceeding sobre ownership/responsibility percibidos a mayor autonomía del asistente; verificar venue antes de usarlo como fundamento fuerte: [Drexel / DOI](https://researchdiscovery.drexel.edu/esploro/outputs/conferenceProceeding/Whose-Code-Is-It-How-AI/991022166402204721).
10. “Beyond the Steeper Curve: AI-Mediated Metacognitive Decoupling...” (2026), propuesta reciente sobre desacople entre output, entendimiento y autopercepción: [arXiv](https://arxiv.org/abs/2603.29681).
11. “Metacognitive calibration: a methodological expansion and empirical application” (2023), útil para diseñar medición de calibración y no solo accuracy: [ETH Zurich](https://www.research-collection.ethz.ch/entities/publication/1ae43e84-9472-4193-bf25-3afd1e44e3d3).

### Producto / mercado / docs oficiales

1. GitHub Copilot code review ya opera con capacidades agentic, full-project context y fallback limitado cuando falta esa capacidad: [GitHub Docs](https://docs.github.com/en/copilot/concepts/agents/code-review).
2. GitHub Copilot / VS Code describe un modelo `agent-first` con ejecución local, background y cloud sobre el proyecto entero: [VS Code Docs](https://code.visualstudio.com/docs/copilot/overview).
3. Claude Code GitHub Actions ofrece análisis, PR creation y cambios completos desde `@claude`, con permisos de lectura/escritura sobre contents/issues/PRs: [Claude Code Docs](https://code.claude.com/docs/en/github-actions).
4. Claude Code ya distingue un modo “Learning”, donde el agente deja `TODO(human)` y fuerza participación del humano: [Claude Code Output Styles](https://code.claude.com/docs/en/output-styles).
5. Sonar reporta un `verification gap`: 96% no confía del todo en el output AI, pero solo 48% siempre lo verifica; además 38% dice que revisar AI code cuesta más que revisar código humano: [Sonar press release, 2026-01-08](https://www.sonarsource.com/company/press-releases/sonar-data-reveals-critical-verification-gap-in-ai-coding/).

### Docs internas

1. `Artifact before course`, `Attempt before explanation`, `Readiness over output`: [`docs/product/README.md`](../../../docs/product/README.md).
2. Sibi como `Build-to-Learn` y ownership verification: [`docs/product/00_foundation.md`](../../../docs/product/00_foundation.md).
3. El moat está en `understanding memory`, no en chat history: [`docs/product/01_moat.md`](../../../docs/product/01_moat.md).
4. La fórmula operativa local de deuda cognitiva ya está insinuada: [`docs/ownership-wedge.md`](../ownership-wedge.md).
5. La UI north star de Misión/Track/Session/Artifact y foco guiado por operación: [`docs/specs/deep-ownership-workspace/00_current_north_star.md`](../../../docs/specs/deep-ownership-workspace/00_current_north_star.md).
6. Los slices actuales del workbench: [`docs/specs/sibi-ownership-workbench/04_implementation_slices.md`](../specs/sibi-ownership-workbench/04_implementation_slices.md).

## 3. Source Evaluation

### Lectura de confiabilidad

- **Alta confiabilidad**: Sweller, Chi et al., Rozenblit y Keil, Parasuraman y Manzey, Heinonen et al., Carpenter, Agarwal et al. Son papers o revisiones ampliamente citadas y conceptualmente estables.
- **Alta utilidad, recencia media/alta**: GitHub Docs, VS Code Docs, Claude Code Docs, Sonar. Son fuentes primarias de producto, pero reflejan el punto de vista del proveedor.
- **Prometedoras pero todavía tempranas**: Ahmad 2026, metacognitive decoupling 2026. Son valiosas para naming y framing contemporáneo del problema, pero varias son preprints o trabajo emergente.
- **Muy relevante para la distinción ownership/responsibility**: Seo et al. 2026. Es un registro institucional de conference proceeding; conviene verificar venue y revisión antes de usarlo como fundamento fuerte.

### Sesgos y límites

1. La literatura clásica de aprendizaje no fue producida para code review o AI coding; hay que inferir con cuidado.
2. La literatura reciente sobre `comprehension debt` todavía está consolidándose; sirve más para hipótesis que para verdad cerrada.
3. Los docs oficiales de producto describen capacidades, no validan outcomes pedagógicos.
4. El reporte de Sonar es encuesta comercial: útil para dimensionar mercado y pain, no para inferencia causal fina.
5. La mayoría de la evidencia de retrieval practice y self-explanation proviene de educación formal y tareas acotadas; Sibi opera sobre artefactos reales y entornos más ruidosos.

## 4. Synthesis

### 4.1 Qué es `cognitive debt` para Sibi/Sibar

Para Sibi, `cognitive debt` puede definirse así:

> deuda cognitiva = superficie del sistema aceptada o mutada - ownership humano demostrado sobre esa superficie y sus relaciones

No es solo “falta de documentación” ni “código difícil”. Es una discrepancia verificable entre:

- lo que el sistema ahora hace;
- lo que la persona cree entender;
- lo que efectivamente puede explicar, predecir, modificar y defender con evidencia.

La literatura externa refuerza cuatro piezas:

1. **Carga cognitiva**: cuando la complejidad relacional es alta, el aprendizaje sufre si la tarea exige demasiado procesamiento no guiado ([Sweller 1988](https://www.sciencedirect.com/science/article/pii/0364021388900237)).
2. **Autexplicación**: pedirle al humano que explique en sus palabras mejora comprensión y expone el gap entre ejemplo y principio ([Chi et al. 1989](https://experts.azregents.edu/en/publications/self-explanations-how-students-study-and-use-examples-in-learning/)).
3. **Ilusión de comprensión**: la gente sobreestima su entendimiento hasta que debe producir una explicación concreta ([Rozenblit & Keil 2002](https://www.sciencedirect.com/science/article/pii/S0364021302000782)).
4. **Automation bias**: cuanto más hace la automatización, más probable es aceptar o no inspeccionar críticamente su salida ([Parasuraman & Manzey 2010](https://pubmed.ncbi.nlm.nih.gov/21077562/)).

Sibi ya está alineado con esto: no explica primero; obliga a producir evidencia de modelo mental y usa el gap como señal.

### 4.2 Diferencia con `technical debt`

`Technical debt` describe compromisos internos del sistema que encarecen cambio, operación o mantenimiento.

`Cognitive debt` describe compromisos en la relación humano-sistema:

- el sistema puede compilar y pasar tests;
- pero el responsable no puede justificar por qué existe una rama, qué boundary toca, qué caller depende, ni qué rompería un cambio.

Se conectan, pero no son lo mismo:

- puede haber alta deuda técnica y bajo debt cognitivo si el equipo entiende muy bien el desastre;
- puede haber baja deuda técnica y alto debt cognitivo si el agente produjo algo prolijo que nadie puede defender.

### 4.3 Diferencia con `cognitive load`

`Cognitive load` es un estado o costo de procesamiento durante la tarea.

`Cognitive debt` es un pasivo acumulado. Surge cuando:

- la carga para construir modelo mental es alta;
- el sistema de trabajo prioriza throughput;
- la verificación humana es superficial o desplazada;
- el conocimiento no se consolida ni transfiere.

En otras palabras:

- `load` explica parte del mecanismo;
- `debt` describe la consecuencia organizable y acumulable.

### 4.4 Diferencia con simple code review

El code review normal pregunta “¿esto está bien?”.

Sibi pregunta además:

1. ¿el humano entiende qué cambió?
2. ¿puede conectar evidencia, boundary y caller?
3. ¿puede anticipar riesgos?
4. ¿puede transferir esa comprensión a otro slice relacionado?
5. ¿su confianza está calibrada o está fingiendo ownership?

GitHub y Anthropic ya se mueven hacia review agentic y full-project context ([GitHub Docs](https://docs.github.com/en/copilot/concepts/agents/code-review), [Claude Code Docs](https://code.claude.com/docs/en/github-actions)), pero ese layer sigue optimizado para detectar issues o proponer fixes. Sibi se diferencia si su output principal no es el comentario sobre el código, sino el veredicto pedagógico-evidencial sobre ownership humano.

## 5. Product Thesis

### 5.1 Tesis central

La oportunidad de producto no es “otro AI code reviewer”.

La oportunidad es:

> Sibi es el runtime de ownership verification para software AI-assisted: detecta dónde el humano todavía no puede reclamar comprensión operacional suficiente y lo obliga a demostrarla sobre evidencia.

Eso conecta perfecto con:

- `Attempt before explanation`;
- `Gaps are evidence`;
- `Readiness over output`;
- `understanding memory` como moat.

### 5.2 Qué reduce y qué expone Sibi

Sibi no “paga” toda la deuda cognitiva automáticamente. Hace tres cosas mejores:

1. **La expone**: muestra dónde el usuario no puede conectar claim, evidencia y boundary.
2. **La acota**: convierte “no entiendo el PR” en gaps específicos: contrato, lifecycle, caller, test, boundary o deletion risk.
3. **La reduce**: fuerza intento, reparación mínima, reintento y luego chequea transferencia.

### 5.3 Cuándo Sibi basta

Sibi debería resolver localmente cuando:

- el diff o slice es acotado;
- hay 1-3 boundaries principales;
- el usuario puede progresar con preguntas guiadas y evidencia local;
- el problema es de verificación/readiness, no de curriculum amplio.

### 5.4 Cuándo derivar al Workspace de Sibar

Derivar a Sibar Workspace cuando aparece alguno de estos umbrales:

1. **Debt sistémica**: el gap toca varias boundaries y no se repara con una sesión corta.
2. **Prerequisitos faltantes**: el usuario no falla por el cambio puntual sino por un modelo previo ausente.
3. **Transfer failure**: entiende el caso local pero falla al cambiar de slice/artefacto análogo.
4. **Repeated misconceptions**: el mismo patrón reaparece entre sesiones.
5. **Artifact graph spread**: el ownership depende de navegar varios artefactos, no un solo diff.

En ese punto ya no conviene una review guiada solamente. Conviene el stack de `Mission -> Track -> Session -> Artifact` del north star de Sibar ([spec actual](../../../docs/specs/deep-ownership-workspace/00_current_north_star.md)).

## 6. Metrics

La recomendación es evitar una métrica única prematura. Conviene un panel de señales con un `Cognitive Debt Score` tentativo solo como agregado interno.

### 6.1 Señales base

#### Attempt-first rate

Mide disciplina de producto, no aprendizaje profundo.

```text
attempt_first_rate =
  sesiones con intento del usuario antes de explicación significativa
  / sesiones elegibles
```

Objetivo: alto. Si cae, el producto deriva a explain-first.

#### Evidence coverage

Mide cuánto del claim del usuario queda anclado en evidencia válida.

```text
evidence_coverage =
  claims del usuario con evidencia válida asociada
  / claims requeridos por la boundary actual
```

Puede medirse por claim o por pregunta.

#### Boundary gap density

```text
boundary_gap_density =
  gaps confirmados en una boundary
  / claims esperados en esa boundary
```

Sirve para priorizar qué boundary debe ir al frente de la cola.

#### Relation gap rate

No alcanza con entender un archivo. Importa conectar archivos, tests, callers, runtime y persistence.

```text
relation_gap_rate =
  prompts relacionales fallidos
  / prompts relacionales totales
```

Ejemplos relacionales: “qué caller depende de esto”, “qué contrato valida este test”, “qué se rompe si esto devuelve null”.

#### Overconfidence delta

Necesita que el usuario declare confianza o readiness antes/después del intento.

```text
overconfidence_delta =
  self_assessed_readiness - demonstrated_readiness
```

Escala sugerida: `0..1` o `0..100`.

Positivo alto = riesgo. Negativo moderado no es malo; puede indicar cautela.

#### Retry and latency

```text
attempts_to_ready = intentos válidos hasta estado ready
time_to_first_grounded_attempt = tiempo hasta primer intento con evidencia suficiente
repair_latency = tiempo entre feedback mínimo y reintento
```

Esto mide fricción, no solo comprensión.

#### Selection churn

Si el usuario salta demasiado entre archivos sin consolidar una boundary, eso puede indicar desorientación.

```text
selection_churn =
  cambios de selección únicos
  / boundary_owned
```

También puede separarse en `tree_churn` y `evidence_churn`.

#### Voice interaction readiness

Si en el futuro hay voz, no alcanza medir ASR accuracy. Hay que medir si la modalidad soporta ownership real.

```text
voice_readiness =
  turnos de voz que terminan en claim utilizable con evidencia
  / turnos de voz ownership-eligible
```

Subseñales:

- tasa de corrección/repetición;
- grounding success tras voz;
- pérdida de contexto por turnos largos;
- porcentaje de turnos que terminan en “show me the evidence”.

#### Transfer to new slice

Es la métrica más alineada con `durable ownership`.

```text
transfer_score =
  performance en boundary/slice análogo no visto
  después de una reparación previa
```

Idealmente con delay:

```text
delayed_transfer_score = transfer_score medido después de N horas o N días
```

### 6.2 Score agregado tentativo

Solo para priorización interna, no para mostrar al usuario como nota:

```text
cognitive_debt_score =
  w1*(1 - evidence_coverage)
  + w2*boundary_gap_density
  + w3*relation_gap_rate
  + w4*max(overconfidence_delta, 0)
  + w5*normalized_selection_churn
  + w6*normalized_attempts_to_ready
  - w7*transfer_score
```

Notas:

- los pesos deben calibrarse empíricamente;
- no usar como “verdad” del usuario;
- sirve para ordenar boundaries, activar derivación y priorizar intervención.

## 7. Interaction Model

### 7.1 Postura de producto

La interacción correcta no es `chat-first`. Debe sentirse como una review guiada con evidencia y una operación clara.

Secuencia recomendada:

1. qué se va a revisar;
2. por qué esa boundary va primero;
3. qué evidencia mínima mirar;
4. prompt de ownership;
5. intento del usuario;
6. diagnóstico de gap;
7. reparación mínima;
8. reintento;
9. decisión local: `blocked | partial | ready | escalate`.

### 7.2 UI/lab/user-facing

#### User-facing default

- Cola guiada de review, no chat abierto.
- Boundary actual con razón de prioridad.
- Evidence panel visible y accionable.
- Prompt de intento corto y específico.
- Resultado con gap concreto, no con explicación general.
- Estado cognitivo del árbol: `unvisited`, `attempted`, `partial`, `owned`, `blocked`.

#### Lab/debug

- Trazas completas de derivación.
- Claims del modelo vs claims verificados.
- Scoring intermedio.
- Historial de intentos.
- Conflicts/verification failures.

Esto ya coincide con la separación default/lab sugerida en [`docs/ownership-wedge.md`](../ownership-wedge.md).

### 7.3 Playwright / agent-flow verification

La verificación del flujo no debería limitarse a “renderiza la UI”.

Casos a automatizar:

1. no aparece explicación larga antes del primer intento;
2. un intento vacío o inconcluso registra observación acotada y avanza según regla;
3. una respuesta con evidencia insuficiente baja readiness;
4. una respuesta relacional correcta mejora estado de boundary;
5. la vista lab no aparece por defecto;
6. el árbol refleja estado cognitivo, no solo selección visual;
7. la derivación a Workspace ocurre solo bajo umbral explícito.

### 7.4 Voz / “Jarvis” sin caer en chat-first

La voz puede servir, pero como interfaz de operación guiada, no como wrapper conversacional general.

Recomendación:

- usar voz para navegar la review, capturar intentos y pedir evidencia;
- no usar voz como canal principal para explicaciones extensas;
- exigir grounding visual/textual siempre que la voz produzca un claim;
- mantener la unidad de trabajo en boundary + evidence, no en conversación libre.

Comandos/turnos de voz útiles:

- “siguiente boundary”
- “mi claim es…”
- “mostrame la evidencia”
- “qué caller depende de esto”
- “no estoy seguro”

Anti-patrones:

- asistente charlatán que explica sin intento;
- voz que reemplaza el panel de evidencia;
- dictado largo no estructurado sin anclaje a selection/boundary.

## 8. Slice / Spec Impact

No edité [`04_implementation_slices.md`](../specs/sibi-ownership-workbench/04_implementation_slices.md), pero la investigación sugiere estos ajustes o slices nuevos.

### Propuesta A: extender Slice 4 con relación explícita

Agregar al `OwnershipBoundary` un bloque de relaciones obligatorias:

- upstream callers probables;
- downstream effects;
- test/contract linkage;
- boundary type (`runtime`, `persistence`, `adapter`, `prompt`, etc.).

Razón: gran parte del debt cognitivo no está en el archivo aislado sino en la relación.

### Propuesta B: nuevo slice de Calibration Contract entre Slice 5 y 7

Nombre tentativo: `Slice 5.5 - Calibration and Readiness`.

Entregables:

- `self_assessed_readiness`;
- `demonstrated_readiness`;
- `overconfidence_delta`;
- reglas de downgrade por evidencia insuficiente;
- storage de calibración por boundary.

### Propuesta C: nuevo slice de Transfer Probe después de memoria básica

Nombre tentativo: `Slice 7.5 - Transfer Verification`.

Entregables:

- boundary análoga o second slice probe;
- delayed revisit labels;
- `transfer_score`;
- gating de `ready` fuerte vs `ready-local`.

### Propuesta D: derivación explícita a Workspace

Antes de integrar todo Sibar, agregar contrato de escalación:

```ts
type WorkspaceEscalation = {
  reason:
    | "multi_boundary_gap"
    | "missing_prerequisite"
    | "repeated_misconception"
    | "transfer_failure"
    | "artifact_spread";
  supportingBoundaryIds: string[];
  recommendedMissionShape?: string;
};
```

### Propuesta E: voz después, no antes

La voz no debería entrar antes de:

1. boundary builder estable;
2. attempt harness estable;
3. calibration básica;
4. evidence drawer usable.

Si entra antes, degrada a chat demo.

## 9. Open Questions / Risks

1. **Unidad de scoring**: ¿score por question, por boundary o por session? Probablemente las tres, con distinta semántica.
2. **Costo de instrumentación**: capturar evidence/ref/attempt/calibration sin volver la UI pesada.
3. **False precision**: riesgo de vender “ownership score” como ciencia exacta.
4. **Gaming**: el usuario puede aprender a responder en formato correcto sin comprender.
5. **Transfer real**: medir transferencia de forma robusta es más caro que medir un intento local.
6. **LLM dependence**: si el extractor propone boundaries flojas, todo el loop pedagógico se sesga.
7. **Mercado**: GitHub/Cursor/Anthropic pueden sumar “learning” o “review” features; la defensa depende de que Sibi posea evidencia, memoria y readiness, no solo better explanations.
8. **Voice novelty trap**: agregar voz demasiado temprano puede empujar el producto a showmanship.

## Decision-ready recommendations

- Definir `cognitive debt` en specs como brecha entre superficie aceptada y ownership demostrado, no como sinónimo de confusión general.
- Introducir `relation gap` como señal de primera clase junto a `file gap`.
- Agregar captura de `self_assessed_readiness` y `overconfidence_delta` en el harness.
- Separar `ready-local` de `ready-transferable`.
- Diseñar `evidence_coverage` como métrica central del runtime antes de cualquier score agregado.
- Añadir reglas explícitas de derivación a Workspace por `multi_boundary_gap`, `missing_prerequisite`, `repeated_misconception`, `transfer_failure` y `artifact_spread`.
- Extender el árbol cognitivo para mostrar no solo estado del archivo sino tipo de gap.
- Mantener la vista lab oculta por defecto y usarla solo para trazabilidad/debug.
- Planear Playwright alrededor de invariantes pedagógicas, no solo de render.
- Postergar voz hasta tener stable boundary/evidence/calibration loops.
- No posicionar Sibi como AI reviewer genérico; posicionarlo como ownership verification runtime para trabajo AI-assisted.

## Conclusión

La tesis local del repo resiste bien el contraste externo. La literatura clásica explica por qué `attempt-first` y `self-explanation` son mecanismos plausibles de aprendizaje y detección de gap; la literatura reciente sobre AI-assisted development y ownership muestra que el problema ya no es solo calidad del código sino desplazamiento de comprensión y responsabilidad; y los productos líderes siguen concentrados en generar, revisar o automatizar cambios, no en verificar ownership humano.

La hipótesis accionable es clara: **Sibi debe medir y operar sobre verificación de ownership humano a nivel de boundary y relación, usando evidencia, calibración y transferencia como primitives.** Cuando ese loop local no alcanza, la derivación natural es al Workspace de Sibar como sistema de reparación y memoria más profunda.

## Bibliografía breve

- Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. [ScienceDirect](https://www.sciencedirect.com/science/article/pii/0364021388900237)
- Chi, M. T. H., Bassok, M., Lewis, M. W., Reimann, P., & Glaser, R. (1989). Self-explanations... [Arizona Board of Regents](https://experts.azregents.edu/en/publications/self-explanations-how-students-study-and-use-examples-in-learning/)
- Rozenblit, L., & Keil, F. (2002). The misunderstood limits of folk science... [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0364021302000782)
- Parasuraman, R., & Manzey, D. H. (2010). Complacency and bias in human use of automation. [PubMed](https://pubmed.ncbi.nlm.nih.gov/21077562/)
- Heinonen, A., Lehtelä, B., Hellas, A., & Fagerholm, F. (2023). Programmers’ mental models SLR. [Aalto](https://aaltodoc.aalto.fi/items/148189ee-cfea-4dea-8c69-82cc176f94f9)
- Carpenter, S. K. (2012). Testing Enhances the Transfer of Learning. [SAGE](https://journals.sagepub.com/doi/10.1177/0963721412452728)
- Agarwal, P. K., Nunes, L. D., & Blunt, J. R. (2021). Retrieval Practice Consistently Benefits Student Learning. [Springer](https://link.springer.com/article/10.1007/s10648-021-09595-9)
- Ahmad, M. O. (2026). Comprehension Debt in GenAI-Assisted Software Engineering Projects. [arXiv](https://arxiv.org/abs/2604.13277)
- Seo, J., Deldari, E., & Mentis, H. M. (2026). Whose Code Is It? [Drexel / DOI](https://researchdiscovery.drexel.edu/esploro/outputs/conferenceProceeding/Whose-Code-Is-It-How-AI/991022166402204721)
- GitHub Copilot code review docs. [GitHub Docs](https://docs.github.com/en/copilot/concepts/agents/code-review)
- GitHub Copilot in VS Code. [VS Code Docs](https://code.visualstudio.com/docs/copilot/overview)
- Claude Code GitHub Actions / Output Styles. [Claude Docs](https://code.claude.com/docs/en/github-actions), [Output Styles](https://code.claude.com/docs/en/output-styles)
- Sonar 2026 State of Code verification gap release. [Sonar](https://www.sonarsource.com/company/press-releases/sonar-data-reveals-critical-verification-gap-in-ai-coding/)
