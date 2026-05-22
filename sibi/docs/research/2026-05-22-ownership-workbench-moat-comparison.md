# Ownership Workbench: moat y comparativa

Fecha: 2026-05-22
Consultado en internet: 2026-05-22

## Objetivo

Responder con más precisión qué está construyendo Sibar/Sibi, contra quién compite de verdad y qué tendría que sentirse distinto si el diferencial no es "otro AI reviewer".

Contexto local mínimo usado:

- `../docs/product/00_foundation.md`
- `../docs/product/01_moat.md`
- `docs/ownership-wedge.md`
- `docs/research/cognitive-debt-ownership-research.md`
- `docs/research/2026-05-22-cognitive-debt-autoresearch-ownership-workbench.md`

## Tesis en 5 bullets

1. Sibi no es un AI code reviewer; es un `ownership workbench` para verificar si el humano realmente puede reclamar comprensión operativa sobre software AI-assisted.
2. El wedge no es "entender un repo" sino "reducir la distancia entre cambio aceptado y ownership demostrado" sobre boundaries concretas.
3. Copilot, Cursor, Claude Code, Sourcegraph/Cody y CodeRabbit ganan hoy en velocidad, contexto, automatización y PR throughput; no en verificación pedagógica del owner humano.
4. El moat real de Sibar no es el grafo del repo sino el `understanding graph`: evidencia, gaps, misconceptions, intentos, retención y readiness acumulados por boundary.
5. Si la UI se parece a chat, review inbox o IDE copiloting, perdemos la categoría; debe sentirse como una ceremonia guiada de ownership y readiness, no como otra superficie de output.

## 1. Qué carajo estamos construyendo

### Categoría

La mejor categoría no es `AI code review`, `repo chat` ni `AI tutor`.

La categoría más precisa hoy es:

> `ownership workbench` para software AI-assisted y brownfield unfamiliar

Versión más agresiva:

> el sistema de record para ownership humano sobre software generado o mutado con AI

Eso encaja con el foundation local: `build-to-learn`, `attempt before explanation`, `readiness over output`, y con el moat local: `understanding memory`, no `chat history`.

### Wedge

El wedge no es "aprendé a programar" ni "revisá mejor tu PR".

Es este momento específico:

```text
el agente ya produjo o modificó algo útil
-> el humano responsable tiene que demostrar que puede explicarlo,
   predecirlo, cambiarlo y defenderlo sin fingir
```

Primera promesa creíble:

> sobre un diff, archivo o boundary acotada, Sibi puede decir si estás listo
> para tocarla o qué gap te falta cerrar antes.

### No-goals

No estamos construyendo, al menos en este wedge:

1. un editor AI generalista;
2. un PR bot que optimiza comentarios;
3. un repo chat con más contexto;
4. un curso genérico de programación;
5. un agente autónomo que muta el workspace por vos;
6. un knowledge base pasivo de documentación;
7. una métrica totalizante de "mastery" del repo entero.

## 2. Qué moat real tiene Sibar/Sibi

Si el diferencial no es `AI code review`, el moat tiene que vivir en un activo distinto.

### Moat principal

El moat real es la combinación de cuatro cosas:

1. `Ownership verification runtime`
   Un runtime que no deja pasar claims blandos del LLM ni del usuario sin evidencia, scope y traducción pedagógica.

2. `Understanding graph`
   No solo artifact graph. También concept graph, learner graph, misconception graph, practice graph, memory graph y después team graph.

3. `Readiness contract`
   El output importante no es el comentario sobre el código. Es el veredicto `blocked | limited | ready`, con razones, gaps y siguiente reparación mínima.

4. `Boundary-first product loop`
   La unidad no es archivo ni conversación. Es una `ownership boundary` que el usuario debe poder explicar, conectar y cambiar.

### Por qué esto sí es defensible

Los asistentes generalistas mejoran cuanto más rápido responden, editan y ejecutan.
Sibi mejora cuando sabe frenar, pedir intento, detectar ilusión de comprensión y registrar memoria de gaps.

Ese incentivo es distinto y crea un dataset/product state distinto:

- qué boundary tocó el usuario;
- qué creyó entender;
- qué pudo justificar con evidencia;
- dónde falló;
- qué reparación funcionó;
- si retuvo o transfirió luego.

Chat y diffs son commodity. Historial de ownership demostrado no.

### Moat secundario

Si Sibar crece hacia workspace, aparece un segundo moat:

> memoria longitudinal de ownership de una persona o equipo sobre sistemas que cambian rápido

Ni Copilot ni Cursor ni CodeRabbit están estructurados hoy para ser el ledger de esa memoria.

## 3. Comparativa contra productos/categorías actuales

## Lectura general

El mercado actual cubre bastante bien cinco cosas:

1. generar cambios;
2. revisar PRs;
3. recuperar contexto del repo;
4. automatizar iteración y CI;
5. enrutar trabajo y conocimiento operativo.

Lo que no cubre bien es:

> verificar si el humano responsable quedó en condiciones de reclamar ownership.

## Tabla rápida

| Producto/categoría | Qué optimiza hoy | Dónde gana | Dónde se corta para Sibi |
| --- | --- | --- | --- |
| GitHub Copilot + code review | agentic coding dentro de GitHub/VS Code | branch/PR automation, plan, review, agent sessions | revisa código y ejecuta trabajo; no mantiene un ledger de ownership humano demostrado |
| Cursor + Bugbot | editor AI nativo + background agents + PR review | velocidad, edición, contexto histórico de PRs, remote agents | entiende repo para producir cambios; no exige intento ni readiness pedagógica |
| Claude Code | agente local/cloud con herramientas, permisos y estilos | autonomía, composabilidad, CI, modo learning parcial | puede enseñar mientras codifica, pero sigue orientado a shipping y tarea, no a certificar ownership |
| Sourcegraph/Cody | code intelligence + search + deep search | navegación, búsqueda, contexto cross-repo, preguntas complejas | responde sobre el código; no modela misconceptions ni readiness del owner |
| CodeRabbit | AI PR review especializado | incremental review, findings, autofix, summaries, generated tests | excelente primera pasada de review; no mide si el humano ya entiende lo revisado |
| Linear | coordinación, triage, docs, agentes como teammates | sistema operativo del trabajo, delegación y docs | ownership allí es accountability de workflow, no comprensión técnica verificada |
| Herramientas de learning tipo Exercism/CodeCrafters | aprendizaje activo y practice loops | learn-by-doing y fluidez | no parten de tu artefacto real ni de tu diff real; no cierran ownership sobre software vivo |

## Producto por producto

### GitHub Copilot / Copilot code review

Lo que muestran las fuentes oficiales:

- Copilot cloud agent trabaja en un entorno efímero con GitHub Actions, puede investigar el repo, crear un plan, hacer cambios en branch y opcionalmente abrir PR ([GitHub Docs](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent), consultado 2026-05-22).
- VS Code posiciona a Copilot como un sistema de agentes que planifican, editan archivos, ejecutan comandos, se autocorrigen y permiten handoff entre sesiones locales, background y cloud ([VS Code Docs](https://code.visualstudio.com/docs/copilot/overview), actualizado 2026-05-20, consultado 2026-05-22).
- La review de cambios AI-generated en VS Code está pensada como flujo de aceptar/rechazar ediciones ya aplicadas, con auto-accept opcional ([VS Code Docs](https://code.visualstudio.com/docs/copilot/chat/review-code-edits), actualizado 2026-05-20, consultado 2026-05-22).
- La documentación de trust & safety insiste en review humana, approvals y sandboxing, o sea: el problema de verificación existe, pero no es el centro de la experiencia ([VS Code Docs](https://code.visualstudio.com/docs/copilot/concepts/trust-and-safety), actualizado 2026-05-20, consultado 2026-05-22).
- Copilot code review acepta instrucciones custom por repo para modular qué comenta, pero sigue siendo review de PR, no ownership assessment ([GitHub Docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/request-a-code-review/use-code-review?tool=webui), consultado 2026-05-22).

Dónde gana hoy:

- workflow nativo en GitHub;
- branch/commit/PR automation;
- plan-before-build ya productizado;
- revisión y control de cambios bastante integrados.

Dónde no llega:

- no obliga al humano a intentar explicar;
- no crea estado durable de qué boundary entendés;
- no distingue "el PR está bien" de "vos ya podés cambiar esta zona con seguridad".

### Cursor / Bugbot

Fuentes oficiales y docs indexadas:

- Bugbot revisa PRs, identifica bugs, issues de seguridad y calidad, corre automático en updates del PR y puede dispararse manualmente ([Cursor Bugbot](https://docs.cursor.com/en/bugbot), consultado 2026-05-22).
- Cursor indexa el codebase con embeddings y también indexa PRs mergeados; el agente puede traer PRs, commits, issues o branches al contexto ([Cursor Codebase Indexing](https://docs.cursor.com/chat/codebase), consultado 2026-05-22).
- Los background agents clonan el repo desde GitHub, trabajan en una branch separada, tienen internet access y auto-runs de terminal commands en infraestructura aislada ([Cursor Background Agents](https://docs.cursor.com/background-agents), consultado 2026-05-22).

Dónde gana hoy:

- editor muy orientado a throughput;
- contexto histórico útil para "cómo se resolvió antes";
- cadena completa editar -> iterar -> revisar -> handoff.

Dónde no llega:

- el contexto histórico sirve para contestar y cambiar, no para medir ownership;
- Bugbot encuentra problemas del PR, no gaps del responsable;
- el producto está diseñado para acelerar producción, no para desacelerar en el punto correcto.

### Claude Code

Fuentes oficiales:

- Claude Code se posiciona como herramienta agentic que vive en terminal, compone con MCP y automatiza code review / issue triage en CI ([Claude Code Overview](https://code.claude.com/docs/en/overview), consultado 2026-05-22).
- Tiene `auto mode` con classifier y permissions para decidir autonomía y riesgo ([Claude Code Auto Mode](https://code.claude.com/docs/en/auto-mode-config), consultado 2026-05-22).
- Tiene un `Learning` output style donde pide aportes estratégicos del humano y deja `TODO(human)` ([Claude Code Output Styles](https://code.claude.com/docs/en/output-styles), consultado 2026-05-22).

Dónde gana hoy:

- gran flexibilidad local/cloud/CI;
- conexión con tooling y docs externas;
- ya reconoce que hay valor en involucrar al humano durante el coding.

Dónde no llega:

- `Learning` es un estilo de interacción, no un runtime de ownership verification;
- no hay contrato explícito de readiness por boundary;
- no guarda un misconception/memory graph como core asset.

### Sourcegraph / Cody

Fuentes oficiales:

- Sourcegraph se define como plataforma de code intelligence: code search, deep search, code navigation, fix/refactor y Cody ([Sourcegraph Docs](https://sourcegraph.com/docs), consultado 2026-05-22).
- Deep Search responde preguntas complejas explorando el codebase; Cody escribe, arregla y mantiene código ([Sourcegraph Docs](https://sourcegraph.com/docs), consultado 2026-05-22).
- Cody recupera contexto mediante search y code intelligence, con permisos estrictos ([Cody FAQ](https://sourcegraph.com/docs/cody/faq), consultado 2026-05-22).

Dónde gana hoy:

- contexto cross-repo real;
- búsqueda/navegación mucho mejor que la mayoría;
- fuerte para responder "dónde vive esto" y "qué usa esto".

Dónde no llega:

- entiende el código para responder preguntas;
- no tiene una ceremonia de intento, repair y readiness;
- ownership en Sourcegraph se acerca más a code intelligence y observabilidad del codebase que a verificación del humano.

### CodeRabbit

Fuentes oficiales:

- Hace PR review automático con múltiples modelos y feedback accionable ([CodeRabbit PR Reviews](https://docs.coderabbit.ai/overview/pull-request-review), consultado 2026-05-22).
- Corre full analysis al abrir el PR e incremental review en nuevos commits ([CodeRabbit PR Reviews](https://docs.coderabbit.ai/overview/pull-request-review), consultado 2026-05-22).
- Tiene comandos para `full review`, `pause`, `resume`, `autofix`, generar unit tests y sequence diagram ([CodeRabbit Commands](https://docs.coderabbit.ai/reference/review-commands), consultado 2026-05-22).

Dónde gana hoy:

- especialización real en review workflow;
- incrementalidad bien pensada;
- capa útil de autofix y artifacts sobre PR.

Dónde no llega:

- aunque mejore la review, el usuario igual puede mergear sin entender;
- el estado que acumula es review state, no understanding state;
- no está diseñado para decir "no estás listo para tocar esta boundary".

### Linear / knowledge y workflow

Fuentes oficiales:

- Linear permite agentes como app users que se delegan por issue, pero el humano sigue siendo responsable del trabajo ([Linear AI Agents](https://linear.app/docs/agents-in-linear), consultado 2026-05-22).
- Tiene triage intelligence para sugerir propiedades y relaciones usando LLMs ([Linear Triage Intelligence](https://linear.app/docs/triage-intelligence), consultado 2026-05-22).
- Los proyectos pueden tener overview, resources, external links y documentos internos ([Linear Project Overview](https://linear.app/docs/project-overview), consultado 2026-05-22).

Dónde gana hoy:

- ownership como accountability de trabajo;
- coordinación, visibilidad y docs en el flujo real;
- buen sistema operativo para "qué hay que hacer".

Dónde no llega:

- no verifica comprensión técnica humana;
- el `responsible owner` en Linear no equivale a `ready to modify this boundary`;
- su knowledge layer es operativa, no pedagógica.

### Learning tools adyacentes

Adjuntos pero no competidores directos:

- Exercism optimiza fluidez por lenguaje mediante ejercicios y mentoring ([Exercism Docs](https://exercism.org/docs/using/getting-started), consultado 2026-05-22).
- CodeCrafters optimiza learning-by-building sobre sistemas tipo `build your own X` ([CodeCrafters Docs](https://app.codecrafters.io/concepts/overview), consultado 2026-05-22).

Qué muestran:

- el aprendizaje activo importa;
- el intento propio importa;
- el scaffolding mínimo funciona.

Pero no cubren el problema central de Sibi:

> ownership sobre artefactos vivos, ajenos, generados por AI y con presión de entrega.

## 4. Dónde otros productos ganan hoy y dónde no cubren ownership verification

## Dónde ganan hoy

1. `Throughput`
   Generan, revisan y corrigen más rápido.

2. `Context retrieval`
   Tienen repo context, PR history, search y tool use ya maduros.

3. `Workflow embedding`
   Viven dentro de GitHub, VS Code, terminal, CI o issue tracker.

4. `Automation`
   Pueden branch, run tests, iterate, comment, open PRs y hasta autofix.

5. `Ergonomics`
   La experiencia base se siente útil en el minuto uno.

## Dónde no cubren human ownership verification

1. No fuerzan `attempt-before-explanation` como regla central.
2. No convierten gaps del usuario en estado de producto de primera clase.
3. No separan `code correctness` de `human readiness`.
4. No modelan misconceptions recurrentes por boundary.
5. No hacen transferencia o retención como output del sistema.
6. No operan con el objetivo principal de reducir `cognitive debt`.

La señal de mercado es fuerte: incluso los vendors que empujan autonomy siguen agregando approvals, diff review, trust & safety y controles. Son respuestas parciales a un gap real de verificación, no soluciones a ownership humano.

Un dato útil de contexto: Sonar reportó el 2026-01-08 que 96% de developers no confía plenamente en el código generado por AI y solo 48% dice verificarlo siempre antes de commitear ([Sonar press release](https://www.sonarsource.com/company/press-releases/sonar-data-reveals-critical-verification-gap-in-ai-coding/), consultado 2026-05-22). Esa brecha valida la dirección general, pero Sibi no debería convertirse en otra capa de "quality gate" solamente.

## 5. Qué implica para UI/UX

Si el producto se siente como "más features para code review", perdimos.

### Qué tendría que sentirse distinto

1. `Ceremonia, no chat`
   La sesión arranca con una revisión guiada y una cola priorizada de boundaries, no con una caja vacía.

2. `Intento antes de ayuda`
   La primera acción del usuario es explicar, predecir o conectar evidencia.

3. `Estado cognitivo visible`
   Cada boundary tiene estado como `unvisited`, `attempted`, `partial`, `owned`, `blocked`, `questionable`.

4. `Evidencia antes de narrativa`
   La UI siempre muestra por qué se está preguntando algo y qué evidencia toca.

5. `Repair mínima`
   En vez de soltar una explicación larga, el sistema ofrece la mínima reparación necesaria para un reintento.

6. `Readiness explícita`
   El usuario debe sentir que el objetivo no es "entender todo", sino quedar habilitado o no para tocar una parte concreta.

### Qué no debería sentirse

No debería sentirse como:

- inbox de comentarios AI;
- doc generator;
- onboarding browser de archivos;
- pareja de chat que responde todo;
- evaluación escolar abstracta separada del trabajo real.

### Traducción concreta a interfaz

Después del Slice 6, la UI debería empujar estas superficies:

1. `Current boundary`
   Qué estamos revisando ahora y por qué.

2. `Ownership prompt`
   Pregunta acotada, no textarea libre sin contexto.

3. `Evidence rail`
   Paths, symbols, tests, callers, diff hunk, contratos y riesgos asociados.

4. `Gap diagnosis`
   Qué faltó exactamente en el intento.

5. `Next repair`
   Qué leer, qué conectar o qué predecir antes de reintentar.

6. `Readiness panel`
   Veredicto actual, confianza, condiciones para pasar a ready.

7. `Memory trail`
   Qué gap ya apareció antes y si quedó reparado o vuelve.

En síntesis: la UX tiene que sentirse más cerca de una `checkride` técnica o una `guided ownership review` que de un editor AI.

## 6. Recomendaciones concretas para nuevos slices/specs después del Slice 6

## Slice 7: Boundary queue y orchestration

Objetivo:

- priorizar la secuencia de revisión por boundary, no por archivo;
- mostrar razón de orden y siguiente paso.

Contrato sugerido:

- `boundaryId`
- `priority`
- `reason`
- `evidenceRefs`
- `nextCheck`

## Slice 8: Attempt capture + gap rubric

Objetivo:

- estructurar el intento del usuario;
- clasificar gaps en tipos reutilizables.

Tipos iniciales:

- no answer
- paraphrase only
- cannot connect caller
- cannot explain contract
- cannot predict failure mode
- boundary confusion
- runtime/persistence confusion

## Slice 9: Evidence rail y traceability UI

Objetivo:

- hacer visible por qué el sistema pregunta algo;
- permitir que el usuario audite el claim.

Esto baja el riesgo de "LLM mysticism" y refuerza la gobernanza del runtime.

## Slice 10: Readiness contract + transfer probe

Objetivo:

- formalizar el paso de `limited` a `ready`;
- agregar al menos una prueba pequeña de transferencia cuando la boundary lo requiera.

Sin esto, `ready` corre riesgo de ser solo "respondió bien una vez".

## Slice 11: Misconception memory

Objetivo:

- registrar confusiones recurrentes por persona y por boundary class;
- reinyectarlas en futuras sesiones.

Este slice ya empieza a construir moat real.

## Slice 12: Ownership handoff/export

Objetivo:

- producir un artifact corto y útil para lead/manager/reviewer:
  - qué boundary se revisó,
  - qué quedó owned,
  - qué sigue bloqueado,
  - qué cambio no debería delegarse todavía.

Esto conecta Sibi con Sibar sin convertirlo en dashboard prematuro.

## Slice 13: Escalation to Sibar workspace

Objetivo:

- definir el umbral exacto de cuándo una review guiada ya no alcanza y hay que abrir mission/track/session más profundo.

Sin esta transición, Sibi corre el riesgo de quedar demasiado chico para problemas reales o demasiado grande para el wedge.

## 7. Decisiones pendientes para el usuario

1. `Unidad principal`
   ¿La primera unidad visible va a ser boundary, diff hunk o file-with-checks? Mi recomendación: boundary, con file/check como evidencia subordinada.

2. `Definición operativa de ready`
   ¿Qué condiciones mínimas habilitan `ready`? Mi recomendación: explicación causal + evidencia + riesgo + modificación/predicción acotada.

3. `Alcance de la primera sesión`
   ¿Se optimiza para un PR/diff, un directorio o un artifact arbitrario? Mi recomendación: diff/PR primero.

4. `Nivel de intervención del sistema`
   ¿Sibi solo pregunta y diagnostica, o también propone micro-reparaciones y lectura guiada? Mi recomendación: repair mínima sí; explicación larga por default no.

5. `Persistencia de memoria`
   ¿La memoria de misconceptions vive por repo, por usuario o por boundary taxonomy compartida? Mi recomendación inicial: por usuario + repo, con taxonomy reusable.

6. `Audiencia inicial`
   ¿Esto es primero para solo builders AI-heavy, o también para leads que revisan trabajo de otros? Mi recomendación: builder AI-heavy primero; manager/readiness export después.

7. `Grado de severidad`
   ¿Sibi puede bloquear un merge o solo bloquear confianza/readiness del usuario? Mi recomendación: no bloquear merge en el wedge; bloquear readiness y ownership claims.

## 8. Riesgos

1. `Confusión de categoría`
   Si la UI deriva a chat/review/doc browser, el usuario lo leerá como "otro assistant" y no entenderá el wedge.

2. `Fricción excesiva`
   Si el attempt-first se vuelve escolar o burocrático, el usuario lo evita.

3. `Readiness falsa`
   Si el veredicto `ready` sale sin suficiente evidencia o transferencia mínima, se destruye la credibilidad del producto.

4. `Overbuild pedagógico`
   Si nos vamos demasiado hacia tutoría general, perdemos la ancla en artifact real y en ownership laboral.

5. `Subestimar incumbentes`
   Copilot, Cursor y Claude Code pueden agregar modos de learning/review rápidamente; el moat no puede depender solo de UX copy o prompts.

6. `No cerrar la transición a Sibar`
   Si no queda claro cuándo Sibi escala a workspace más profundo, terminamos con un producto ni liviano ni completo.

## 9. Conclusión

La mejor lectura estratégica hoy es esta:

Sibi no compite principalmente por ser mejor generando o revisando código. Compite por adueñarse del momento posterior al output, donde el equipo necesita decidir si todavía conserva ownership humano real.

Eso lo ubica más cerca de una nueva capa de infraestructura de comprensión y readiness que de otra feature de copiloting.

Si mantenemos ese foco, el moat no depende de tener un modelo mejor que los demás, sino de construir el sistema que mejor sabe:

- pedir intento;
- validar evidencia;
- registrar gaps;
- reparar misconceptions;
- y acumular memoria durable de ownership.

## Fuentes externas

Fuentes oficiales y principales consultadas el 2026-05-22:

- GitHub Copilot cloud agent: [docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent)
- GitHub Copilot code review: [docs.github.com/en/copilot/how-tos/use-copilot-agents/request-a-code-review/use-code-review](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/request-a-code-review/use-code-review)
- VS Code Copilot overview: [code.visualstudio.com/docs/copilot/overview](https://code.visualstudio.com/docs/copilot/overview)
- VS Code review AI edits: [code.visualstudio.com/docs/copilot/chat/review-code-edits](https://code.visualstudio.com/docs/copilot/chat/review-code-edits)
- VS Code trust & safety: [code.visualstudio.com/docs/copilot/concepts/trust-and-safety](https://code.visualstudio.com/docs/copilot/concepts/trust-and-safety)
- Cursor Bugbot: [docs.cursor.com/en/bugbot](https://docs.cursor.com/en/bugbot)
- Cursor Background Agents: [docs.cursor.com/background-agents](https://docs.cursor.com/background-agents)
- Cursor Codebase Indexing: [docs.cursor.com/chat/codebase](https://docs.cursor.com/chat/codebase)
- Claude Code overview: [code.claude.com/docs/en/overview](https://code.claude.com/docs/en/overview)
- Claude Code auto mode: [code.claude.com/docs/en/auto-mode-config](https://code.claude.com/docs/en/auto-mode-config)
- Claude Code output styles: [code.claude.com/docs/en/output-styles](https://code.claude.com/docs/en/output-styles)
- Sourcegraph docs: [sourcegraph.com/docs](https://sourcegraph.com/docs)
- Cody FAQ: [sourcegraph.com/docs/cody/faq](https://sourcegraph.com/docs/cody/faq)
- CodeRabbit PR review: [docs.coderabbit.ai/overview/pull-request-review](https://docs.coderabbit.ai/overview/pull-request-review)
- CodeRabbit review commands: [docs.coderabbit.ai/reference/review-commands](https://docs.coderabbit.ai/reference/review-commands)
- Linear AI agents: [linear.app/docs/agents-in-linear](https://linear.app/docs/agents-in-linear)
- Linear triage intelligence: [linear.app/docs/triage-intelligence](https://linear.app/docs/triage-intelligence)
- Linear project overview: [linear.app/docs/project-overview](https://linear.app/docs/project-overview)
- Exercism getting started: [exercism.org/docs/using/getting-started](https://exercism.org/docs/using/getting-started)
- CodeCrafters concepts: [app.codecrafters.io/concepts/overview](https://app.codecrafters.io/concepts/overview)
- Sonar verification gap press release, publicado 2026-01-08: [sonarsource.com/company/press-releases/sonar-data-reveals-critical-verification-gap-in-ai-coding](https://www.sonarsource.com/company/press-releases/sonar-data-reveals-critical-verification-gap-in-ai-coding/)
