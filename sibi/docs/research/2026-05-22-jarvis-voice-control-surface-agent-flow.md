# Jarvis Voice, Control Surface y Agent-Flow para Sibi

Fecha: 2026-05-22
Consultado en internet: 2026-05-22
Estado: research memo operativo para Slice 10/11 y siguientes

## Objetivo

Explorar una direccion ambiciosa pero gobernable para Sibi:

- sensacion de "Sibi guia la pantalla";
- agent-flow basado en Playwright y manifiesto explicito;
- voz/Jarvis solo como canal experimental posterior a v0.1;
- compatibilidad con el wedge local: `attempt-before-explanation`, `no chat-first`, `no auto-readiness`, `default deny` para canales fuera de banda.

Este memo no propone habilitar voz o autonomia ahora. Propone la arquitectura para que, cuando exista, use los mismos contratos auditables que Slice 10 y Slice 11 en lugar de abrir un canal paralelo y opaco.

## Contexto local minimo usado

- [docs/specs/sibi-ownership-workbench/04_implementation_slices.md](/Users/d1eshi/.codex/worktrees/bcfa/sibar/sibi/docs/specs/sibi-ownership-workbench/04_implementation_slices.md)
- [docs/specs/sibi-ownership-workbench/05_agent_flow_manifest.md](/Users/d1eshi/.codex/worktrees/bcfa/sibar/sibi/docs/specs/sibi-ownership-workbench/05_agent_flow_manifest.md)
- [docs/ownership-wedge.md](/Users/d1eshi/.codex/worktrees/bcfa/sibar/sibi/docs/ownership-wedge.md)
- [/Users/d1eshi/.codex/worktrees/bcfa/sibar/docs/specs/09_project_learning_agent.md](/Users/d1eshi/.codex/worktrees/bcfa/sibar/docs/specs/09_project_learning_agent.md)
- [/Users/d1eshi/.codex/worktrees/bcfa/sibar/docs/specs/10_study_panel_ui.md](/Users/d1eshi/.codex/worktrees/bcfa/sibar/docs/specs/10_study_panel_ui.md)

## Lectura rapida

La direccion correcta no es:

```text
voz -> LLM libre -> DOM libre -> "Jarvis"
```

La direccion correcta es:

```text
Playwright trace + aria/action manifest + control-surface registry
  -> decision explicita del agente
  -> autorizacion por surface
  -> replay verificable
  -> voz como frontend opcional de esos mismos intents
```

Si Sibi quiere sentirse como un copiloto que "mueve" la pantalla, tiene que hacerlo por capas:

1. `v0.1`: manifiesto seguro, read-only + guided control hints.
2. `v0.2`: action replay restringido y auditable.
3. `post-v0.1 experimental`: voz/Jarvis gated, default disabled, reutilizando la misma registry y las mismas pre/postconditions.

## Restricciones locales que no conviene romper

De los specs actuales salen cinco restricciones fuertes:

1. el workbench sigue siendo `no-chat-first` y `no-explain-first`;
2. toda nueva superficie UI debe tener cobertura Playwright y browser-skill/agent-flow para el mismo path;
3. Slice 10 ya pide manifiesto normalizado desde Playwright;
4. Slice 11 ya pide registry explicita y `default deny` para `voice` y `Jarvis`;
5. el panel actual explicitamente deja afuera `voice`, `screen capture`, `OCR` y `ambient observer` en v0.1.

Conclusión: la UX "Jarvis" no debe nacer como asistente global del escritorio. Debe nacer como una extension fuertemente acotada del surface propio de Sibi.

## Research synthesis

### Lo que hoy ya esta claro en las fuentes

- Playwright ya se presenta como automation stack para testing, scripting y AI agents, y su MCP usa snapshots de accesibilidad estructurados en vez de screenshots como mecanismo principal de control. Eso favorece un flujo deterministico y token-eficiente para agentes, con `refs` por elemento y resnapshot tras cada cambio.
- Playwright Trace Viewer ya conserva, por accion, locator, snapshots DOM antes/durante/despues, filmstrip, logs y source location. Eso sirve como base para un manifiesto de "esto se pudo hacer asi y quedo probado asi".
- Playwright tambien soporta ARIA snapshots para fijar estructura accesible esperada. Eso sirve para declarar preconditions y postconditions de UI sin depender de pixeles.
- OpenAI recomienda para voz en browser usar Realtime + WebRTC, con VAD y eventos de turno. Eso vuelve viable una experiencia de baja latencia, pero no resuelve por si solo autorizacion ni seguridad de acciones.
- Los casos de voz/tutoria mas solidos priorizan memoria recuperada a tiempo, baja latencia y reconstruccion de contexto por turno, no prompts enormes persistentes.
- Web Speech API existe, pero es una base web heterogenea y con restricciones de permisos/politica; no deberia ser el contrato principal de producto si la ambicion es una voz consistente.

### Implicacion para Sibi

La experiencia "Sibi guia la pantalla" debe usar tres representaciones distintas:

1. `trace truth`: que hizo el sistema real en Playwright.
2. `surface truth`: que controles estan declarados, con que payloads y bajo que condiciones.
3. `agent decision truth`: por que el agente cree que ahora puede o debe hacer cierta accion.

Sin esas tres, la UX se siente magica pero no es auditable.

## Arquitectura progresiva recomendada

## v0.1 - Safe Manifest, Guidance First

Objetivo: que el agente pueda leer el estado, proponer la siguiente accion permitida y guiar la pantalla sin mutar por fuera de un surface declarado.

Capacidades:

- cargar `ActionManifest` derivado de runtime + Playwright + grafo de UI;
- mapear cada accion visible a:
  - `action_id`,
  - `control_id`,
  - actor permitido,
  - evidencia requerida,
  - preconditions,
  - expected postconditions,
  - trace/scenario linkage;
- leer snapshot accesible actual y estado runtime;
- producir `next_best_action` con razon y bloqueo explicito;
- resaltar controles, seleccionar paneles, abrir drawers o enfocar codigo solo si esas acciones ya estan declaradas como seguras;
- nunca enviar acciones side-effectful sin confirmacion humana.

Lo importante aca es la sensacion de guia, no autonomia plena. Sibi puede:

- abrir el panel correcto;
- enfocar el archivo correcto;
- llevar al usuario al fragmento de evidencia;
- mostrar "te estoy llevando a este check porque...";
- bloquearse si el manifest no lo respalda.

No debe:

- inventar clicks sobre controles no declarados;
- usar OCR/screen capture para navegar el producto;
- decidir readiness;
- ejecutar un flujo nuevo que no tenga scenario/manifest.

## v0.2 - Agent Action Replay

Objetivo: permitir que un agente ejecute un subset chico de acciones reproduciendo paths que ya tienen respaldo Playwright y registry.

Capacidades extra:

- `agent_action_replay` sobre acciones whitelisted;
- replay contra `scenario_id` y `trace_id` conocidos;
- chequeo de snapshot accesible antes de actuar;
- re-snapshot y verificacion de postconditions despues de actuar;
- budget de acciones por sesion;
- modo `dry_run` y `ask_then_run`;
- registro auditado de:
  - input surface,
  - accion elegida,
  - por que estaba permitida,
  - que postcondition verifico,
  - si hubo rechazo.

El criterio de inclusion no es "el agente podria hacerlo", sino:

```text
esta accion ya existe en la UI propia
  + tiene preconditions declarables
  + tiene postconditions chequeables
  + tiene replay Playwright estable
  + su costo de error es reversible
```

## post-v0.1 experimental - Voice / Jarvis Gated

Objetivo: agregar voz y una sensacion tipo Jarvis sin crear un bypass del policy engine.

Regla central:

```text
voice intent != direct action
```

La voz entra como:

```text
audio -> transcript / semantic turn -> intent candidate
  -> same manifest filter
  -> same control-surface authorization
  -> same confirmation policy
  -> same replay/audit log
```

Canales recomendados:

- Realtime + WebRTC para conversacion browser/native con baja latencia;
- VAD para turn-taking;
- transcript visible y corregible;
- push-to-talk o wake-word solo en modo experimental opt-in;
- degradacion limpia a texto cuando no hay permiso de microfono o cuando la sesion necesita precision.

Canales no recomendados para el primer experimento:

- observador siempre encendido;
- captura de pantalla global;
- control del escritorio completo;
- ejecucion por vision cuando el surface propio ya tiene ids y roles.

## Como un LLM deberia leer Playwright + manifest y decidir acciones permitidas

La decision del agente no deberia salir de un prompt abierto. Deberia salir de un protocolo chico y repetible.

## Inputs minimos

```ts
type AgentDecisionInput = {
  manifest: ActionManifest;
  controls: ControlSurfaceRegistry;
  runtimeState: RuntimeProjection;
  uiSnapshot: AriaSnapshot;
  recentTrace?: PlaywrightTraceSlice;
  actor: "human" | "agent" | "voice_agent";
  userIntent?: string;
};
```

## Algoritmo recomendado

1. cargar `manifestId` y rechazar si esta stale respecto al snapshot runtime;
2. filtrar `allowedActions` por `actor`;
3. descartar acciones cuyos `control_id` no existan en la snapshot actual;
4. validar preconditions contra:
   - estado runtime,
   - aria snapshot,
   - evidencia requerida,
   - restriction set;
5. ordenar candidatos por:
   - menor riesgo,
   - mayor respaldo Playwright,
   - mayor cercania con el `current_step`,
   - menor necesidad de inferencia;
6. emitir una de dos salidas:
   - `allowed_action_decision`;
   - `agent_action_rejected`.

## Salida recomendada

```ts
type AllowedActionDecision = {
  decisionId: string;
  actionId: string;
  controlId: string;
  whyAllowed: string[];
  whyNow: string[];
  evidenceRefs: string[];
  scenarioId: string;
  requiresConfirmation: boolean;
  expectedPostconditions: string[];
};

type AgentActionRejected = {
  decisionId: string;
  reason:
    | "manifest_stale"
    | "missing_precondition"
    | "control_not_visible"
    | "channel_denied"
    | "insufficient_evidence"
    | "unsafe_side_effect";
  suggestedFallback: "ask" | "mark_unknown" | "request_human_review" | "show_target";
};
```

## Regla clave de razonamiento

El LLM no deberia decidir:

```text
"puedo hacer esto porque parece el boton correcto"
```

Deberia decidir:

```text
"puedo hacer esto porque action_id=focus_boundary_evidence
esta permitida para actor=agent,
control_id=evidence-drawer-toggle esta visible,
precondition current_step=ownership_check se cumple,
el scenario pw.boundary.evidence.open ya paso,
y la postcondition drawer=open es verificable"
```

Eso convierte "agent feel" en gobernanza.

## Propuesta de control-surface registry

La shape actual del spec es buena, pero conviene endurecerla para que sirva tanto a UI manual como a agentes y voz.

```ts
type ControlSurfaceRegistry = {
  version: string;
  generatedAt: string;
  entries: ControlSurfaceRecord[];
};

type ControlSurfaceRecord = {
  controlId: string;
  owner: "workbench" | "study-panel" | "graph-canvas" | "voice-gateway";
  surface: "panel" | "drawer" | "editor" | "toolbar" | "modal" | "voice";
  mode: "user" | "agent_readonly" | "agent_act" | "experimental";
  locatorContract: {
    role?: string;
    name?: string;
    testId?: string;
    ariaRefPath?: string;
  };
  allowedPayloads: Array<{
    kind: "click" | "focus" | "open" | "select_range" | "set_text" | "submit_intent";
    schema: string;
  }>;
  preconditions: Array<{
    source: "runtime" | "ui";
    key: string;
    op: "eq" | "in" | "exists";
    value: string | boolean | string[];
  }>;
  postconditions: Array<{
    source: "runtime" | "ui";
    key: string;
    op: "eq" | "contains" | "exists";
    value: string | boolean | string[];
  }>;
  risk: "low" | "medium" | "high";
  confirmation: "none" | "human_before" | "human_after";
  replay: {
    scenarioId: string;
    traceId?: string;
    ariaSnapshotName?: string;
  };
  policyTags: string[];
};
```

## Por que preconditions y postconditions importan tanto

Sin preconditions:

- el agente hace acciones correctas en el momento incorrecto;
- la voz se vuelve impulsiva;
- el replay deja de ser comparable.

Sin postconditions:

- no hay forma de saber si la accion realmente guio al usuario;
- la UI puede "moverse" sin cerrar el loop;
- el agente no aprende a detenerse.

Ejemplos concretos:

1. `open_evidence_drawer`
   - preconditions:
     - `selected_boundary exists`
     - `current_step in ["attempt_review", "repair_review"]`
   - postconditions:
     - `drawer.evidence.open = true`
     - `drawer.evidence.boundary_id = selected_boundary.id`

2. `select_code_range`
   - preconditions:
     - `selected_file exists`
     - `range within bounded file payload`
   - postconditions:
     - `active_code_selection = requested_range`
     - `evidence_ref visible = true`

3. `voice_submit_intent`
   - preconditions:
     - `channel.voice.opt_in = true`
     - `session.experimental = true`
     - `microphone.permission = granted`
   - postconditions:
     - `intent_candidate.created = true`
     - `no ui mutation unless follow-up action allowed`

## UX principles para que se sienta "Sibi guia la pantalla" sin perder seguridad

## 1. Guiar no es chatear

La UI principal no deberia parecer una consola de prompts. La sensacion de guia sale de:

- foco actual visible;
- siguiente accion visible;
- razon visible;
- evidencia visible;
- progreso visible.

Texto corto, accion localizada, y una sola cosa importante a la vez.

## 2. Una sola superficie activa por paso

Sibi debe "tomar la pantalla" de forma parcial, no total:

- resaltar el panel activo;
- atenuar lo secundario;
- mover el foco de codigo/evidencia;
- evitar saltos entre demasiados paneles.

El usuario debe sentir continuidad, no coreografia caotica.

## 3. El agente señala primero, actua despues

Patron recomendado:

```text
show target -> explain why -> ask/confirm if side effect exists -> act -> verify
```

Esto sostiene confianza y evita la sensacion de magia incorrecta.

## 4. Voz y texto comparten el mismo estado

Si el usuario dice:

```text
"mostrame donde esta la evidencia de este boundary"
```

debe aparecer:

- transcript visible;
- intent resuelto visible;
- control objetivo visible;
- mismo resultado que si hubiera hecho click.

No conviene que voz tenga un estado paralelo.

## 5. La narracion tiene que seguir al foco, no al reves

Si Sibi habla mientras la pantalla salta tarde o a otro control, la ilusion de "Jarvis" se rompe. La secuencia correcta es:

1. mover foco o highlight;
2. confirmar visualmente;
3. narrar la razon;
4. esperar barge-in o respuesta.

## 6. Reversibilidad visible

Toda accion automatizada reversible debe poder deshacerse o reintentar el paso. Especialmente:

- apertura/cierre de drawers;
- cambio de panel;
- cambio de seleccion;
- scroll a evidencia;
- foco en editor.

## 7. Side effects con friccion deliberada

Acciones como submit, mutate, delete, approve o readiness-related deben exigir confirmacion humana clara, aun en modo voz.

## 8. Deixis explicita para codigo

Voz sobre codigo trae frases ambiguas: "esta linea", "eso", "ese test". Para que funcione:

- Sibi debe resolver referencias solo contra selecciones visibles;
- si hay ambiguedad, debe pedir desambiguacion corta;
- la UI debe reflejar la referencia resuelta con highlight inmediato.

## Riesgos de voz/autonomia y mitigaciones

## Riesgo 1 - Bypass del manifest por canal de voz

Problema:

- el usuario dice algo amplio;
- el sistema lo interpreta como accion directa;
- voz se transforma en bypass de Slice 10/11.

Mitigacion:

- `voice intent` entra al mismo policy engine;
- `default deny` para cualquier intent sin `action_id`;
- todo intent se traduce a `agent_action_rejected` o `allowed_action_decision`.

## Riesgo 2 - Snapshot stale / UI drift

Problema:

- el agente decide con un snapshot viejo;
- actua sobre otro estado;
- hace click correcto en contexto incorrecto.

Mitigacion:

- resnapshot obligatorio antes de cada accion activa;
- invalidacion de refs tras cada cambio;
- hash de `manifestId + snapshotId + runtimeRevision`.

## Riesgo 3 - Over-automation y falsa sensacion de comprehension

Problema:

- Sibi hace demasiado;
- el usuario "sigue la demo" pero no demuestra ownership.

Mitigacion:

- limitar autonomia a navegacion, foco y soporte;
- mantener `attempt-before-explanation`;
- bloquear cualquier camino que quite al usuario de responder o justificar.

## Riesgo 4 - Privacidad y confianza de voz

Problema:

- microfono encendido de forma ambigua;
- percepcion de escucha permanente;
- transcript oculto.

Mitigacion:

- opt-in explicito por sesion;
- indicador visible de microfono activo;
- transcript y eventos visibles;
- kill switch rapido;
- sin ambient listener por default.

## Riesgo 5 - Ambiguedad multimodal

Problema:

- "aca", "esto", "esa parte" no resuelven bien en codigo y graph.

Mitigacion:

- resolver solo contra anchors visibles;
- exigir pointing UI explicito cuando haya mas de un target;
- usar codigo/range ids, no coordenadas libres.

## Riesgo 6 - Prompt injection desde contenido renderizado

Problema:

- nombres de archivo, excerpts o docs visibles pueden intentar manipular al agente.

Mitigacion:

- el agente decide solo contra manifest/registry/runtime;
- contenido repo visible es evidencia, no instruction channel;
- separar `user_intent`, `system_policy`, `artifact_text`.

## Riesgo 7 - Voice uncanny / latencia mala

Problema:

- respuesta lenta o interrupciones torpes;
- la experiencia parece rota, no premium.

Mitigacion:

- usar voz solo cuando la latencia sea aceptable;
- push-to-talk primero;
- VAD configurable;
- fallback inmediato a texto y captions;
- dejar que el usuario silencie la voz sin perder guia visual.

## Recomendaciones concretas para Slice 10

Slice 10 hoy pide manifiesto y linkage Playwright. Conviene extenderlo con cuatro piezas:

1. `decision_reason_schema`
   - para que el agente siempre devuelva `whyAllowed`, `whyNow`, `whyBlocked`.

2. `ui_snapshot_contract`
   - declarar que la lectura primaria del agente es snapshot accesible estructurado, no screenshot.

3. `scenario_graph`
   - no solo `scenarioId` puntual, sino:
     - current step,
     - previous safe steps,
     - fallback edges,
     - blocked edges.

4. `staleness_guard`
   - versionado conjunto de runtime state + manifest + control registry.

Recomendacion de acceptance adicional:

```text
cada action manifest debe poder explicar
por que esta permitida ahora
y por que su fallback es el correcto
sin depender de texto libre del prompt
```

## Recomendaciones concretas para Slice 11

Slice 11 hoy pide registry y policy de experimental channels. Conviene agregar:

1. `channel class`
   - `manual`
   - `agent_readonly`
   - `agent_act`
   - `voice_intent`
   - `experimental_vision`

2. `confirmation policy`
   - por control, no global.

3. `replay binding`
   - cada control accionable debe enlazar a scenario/trace/aria snapshot.

4. `risk tier`
   - low/medium/high para decidir confirmacion y si la accion puede existir en voz.

5. `deixis anchors`
   - ids de boundary, file, code range, evidence ref y panel, para que voz y agente apunten a algo estable.

Recomendacion de acceptance adicional:

```text
ningun canal experimental puede ejecutar una accion
que no exista antes en manual o agent_act con replay verificable
```

## Nuevos slices/specs recomendados

## Slice 12a o nuevo spec - Guided Screen Orchestration

Proposito:

- definir la UX de foco, highlight, drawer hops, code selection y narration sincronizada.

Entrega:

- `GuidedStepProjection`;
- active target model;
- visual hint contract;
- reversible navigation contract.

## Slice 13 - Agent Decision Trace

Proposito:

- persistir por que el agente actuo o se bloqueo.

Entrega:

- `AgentDecisionTrace`
  - inputs,
  - filtered candidates,
  - rejection reasons,
  - chosen action,
  - postcondition result.

Esto sirve para debugging, evals y confianza del usuario.

## Slice 14 - Voice Intent Gateway

Proposito:

- agregar voz sin bypass.

Entrega:

- transcript contract;
- intent candidate contract;
- microphone permission state;
- VAD mode config;
- opt-in session flag;
- policy bridge `voice_intent -> action_id`.

Acceptance:

- voz disabled by default;
- nada muta UI sin pasar por manifest + registry;
- transcript visible;
- fallback a texto.

## Slice 15 - Deixis and Code Reference Resolution

Proposito:

- resolver "esta linea", "ese test", "este boundary" sobre UI estructurada.

Entrega:

- visible target anchors;
- ambiguity resolver;
- code-range resolution contract;
- user clarification micro-flow.

Sin esto, la voz sobre codigo va a fallar incluso si el speech stack funciona bien.

## Slice 16 - Experimental Jarvis Mode Eval Harness

Proposito:

- medir si la experiencia realmente ayuda o solo impresiona.

Métricas sugeridas:

- task completion sin clicks errados;
- tiempo hasta evidencia correcta;
- tasa de `agent_action_rejected`;
- tasa de user override;
- tasa de falsa activacion de voz;
- impacto sobre attempt quality y no solo sobre velocidad.

## Recomendacion final

La mejor arquitectura para Sibi no es un "Jarvis" generalista. Es un sistema con:

- manifiesto de acciones;
- registry de controles;
- snapshots accesibles;
- replay Playwright;
- decision trace;
- voz como frontend opcional de los mismos intents.

Eso permite que la experiencia se sienta viva y guiada sin sacrificar trazabilidad.

En otras palabras:

```text
Sibi no deberia "tener poderes" especiales por voz.
Deberia tener los mismos poderes limitados, visibles y auditables
sin importar si la orden entro por click, texto o audio.
```

## Fuentes externas

Consultadas el 2026-05-22 salvo donde se indica fecha de publicacion explicita.

1. Playwright, "Trace viewer". Accedido 2026-05-22.
   [https://playwright.dev/docs/trace-viewer](https://playwright.dev/docs/trace-viewer)
2. Playwright, "Playwright MCP". Accedido 2026-05-22.
   [https://playwright.dev/docs/getting-started-mcp](https://playwright.dev/docs/getting-started-mcp)
3. Playwright, "Snapshots" para MCP. Accedido 2026-05-22.
   [https://playwright.dev/mcp/snapshots](https://playwright.dev/mcp/snapshots)
4. Playwright, "ARIA snapshots". Accedido 2026-05-22.
   [https://playwright.dev/docs/aria-snapshots](https://playwright.dev/docs/aria-snapshots)
5. Playwright, "Accessibility testing". Accedido 2026-05-22.
   [https://playwright.dev/docs/next/accessibility-testing](https://playwright.dev/docs/next/accessibility-testing)
6. OpenAI, "Voice agents". Accedido 2026-05-22.
   [https://developers.openai.com/api/docs/guides/voice-agents](https://developers.openai.com/api/docs/guides/voice-agents)
7. OpenAI, "Realtime API with WebRTC". Accedido 2026-05-22.
   [https://developers.openai.com/api/docs/guides/realtime-webrtc](https://developers.openai.com/api/docs/guides/realtime-webrtc)
8. OpenAI, "Voice activity detection (VAD)". Accedido 2026-05-22.
   [https://developers.openai.com/api/docs/guides/realtime-vad](https://developers.openai.com/api/docs/guides/realtime-vad)
9. MDN, "Web Speech API". Ultima modificacion visible: 2025-09-30. Accedido 2026-05-22.
   [https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
10. MDN, "WebRTC API". Accedido 2026-05-22.
   [https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
11. W3C, "WAI-ARIA Authoring Practices 1.2". Publicado 2021-11-29. Accedido 2026-05-22.
   [https://www.w3.org/TR/2021/NOTE-wai-aria-practices-1.2-20211129/](https://www.w3.org/TR/2021/NOTE-wai-aria-practices-1.2-20211129/)
12. OpenAI, "Inside Praktika's conversational approach to language learning". Publicado 2026-01-22.
   [https://openai.com/index/praktika/](https://openai.com/index/praktika/)
13. OpenAI, "How Tolan builds voice-first AI with GPT-5.1". Publicado 2026-01-07.
   [https://openai.com/index/tolan/](https://openai.com/index/tolan/)
