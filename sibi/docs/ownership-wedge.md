# Wedge de Ownership (Slice final Sibi → ownership-core)

## Regla central del slice

Sibi no construye un `AST` propio ni un `parser` por lenguaje desde cero.
No construimos un detector manual grande por lenguaje.

Sibi tampoco empieza explicando el código. La interacción principal no es
`Explain this file with LLM`. Es:

```text
Prove ownership
```

El usuario tiene que intentar demostrar comprensión antes de recibir una
reparación. La explicación del sistema es una respuesta a un gap observado, no
el primer movimiento.

Este slice separa claramente:

- **LLM:** interpreta el cambio, detecta significado, intención, conceptos,
  riesgos y posibles gaps.
- **Runtime (ownership-core):** valida claims del LLM con evidencia, alcance,
  formato, readiness y requisitos pedagógicos antes de exponerlos en UI.

Resultado esperado: el runtime controla la trazabilidad y gobernanza de claims,
no se reemplaza la lectura del LLM.

## Manifiesto operativo

La AI permite producir software más rápido de lo que el equipo puede absorber.
Eso crea deuda cognitiva: código que existe, compila o pasa tests, pero que la
persona responsable no puede explicar, modificar o defender con claridad.

Sibi existe para cerrar esa brecha:

```text
cognitive debt = accepted AI work - demonstrated human ownership
```

La fórmula no es una métrica científica del MVP. Es una regla de producto: cada
diff debe evaluarse como una mutación sobre ownership, no solo como cambios de
código.

Preguntas obligatorias:

1. ¿Qué cambió en el sistema?
2. ¿Qué cambió en el modelo mental del usuario?
3. ¿La distancia entre ambos creció o bajó?

Tests verdes no implican ownership. El sistema puede estar listo y el humano no.

## 1) Qué cubre este slice final

- `sibi` delega la revisión a `src/ownership-core/diff-review.ts`.
- `sibi/src/ownershipReview.ts` permanece como shim de re-export para mantener
  la misma superficie pública.
- La salida de `reviewOwnership(...)` y sus tipos permanece estable entre Sibi y
  `ownership-core`.
- No existe conexión real a workspace desde UI; el botón `Open Sibar session` sigue sin conectar.

## 2) Claim verifier (pipeline de runtime)

El runtime del wedge aplica esta secuencia:

1. **Schema validation** del input del claim.
2. **Evidence validation** sobre `EvidenceRef` y trazabilidad mínima.
3. **Scope validation** para evitar claims fuera del alcance del cambio.
4. **Pedagogy validation** para producir salida legible y accionable para el
   equipo.
5. **UI projection** al estado final: `blocked | limited | ready`, `gaps`,
   `questions`, `readPath`.

## 2.1) Ownership harness

El loop de producto esperado es:

```text
Usuario selecciona diff / archivo / directorio
  -> Sibi construye contexto determinístico
  -> Sibi detecta boundaries tocadas
  -> Sibi muestra una cola priorizada de revisión
  -> Sibi pregunta un ownership claim
  -> el usuario intenta explicar
  -> Sibi diagnostica gaps
  -> Sibi propone la reparación mínima
  -> el usuario reintenta
  -> el estado de ownership cambia
```

La unidad principal no debe ser siempre el archivo. La unidad correcta es una
`ownership boundary`: una responsabilidad técnica que el usuario debe poder
explicar, modificar y defender con evidencia.

### First-run review sequence

El primer contacto no debe abrir directamente en el lab interno ni en el prompt.
Sibi debe empezar como una ceremonia de revisión guiada:

```text
Sibi dice qué va a revisar
  -> muestra el current step de la cola priorizada
  -> explica por qué empieza ahí y cuál es la siguiente acción
  -> revisa la superficie tocada antes de inferir callers
  -> recién entonces pide probar ownership
```

La cola de revisión existe para anclar el ownership prompt en evidencia. Debe
existir completa en el lab local, pero la UI default debe resumirla como una
guía compacta y secuencial: foco actual, razón para empezar ahí y siguiente
acción. La cola completa debe mostrar, como mínimo:

- archivo o boundary;
- si fue tocado por el diff;
- prioridad;
- razón de orden;
- siguiente paso.

El prompt de ownership es una etapa de la secuencia, no el primer concepto de la
UI. El lab de derivación local no forma parte de la UI default del usuario. Debe
abrirse explícitamente como vista local/debug con `?view=lab` o `?lab=1`, para
revisar la cola completa, traces, derivación de estado o reportes de usuario sin
sobrecargar el flujo normal.

Ejemplos:

- `Runtime Boundary`
- `Attempt Evaluation Boundary`
- `Evidence Collection Boundary`
- `Prompt Generation Boundary`
- `File Tree State Boundary`
- `Diff Risk Boundary`
- `Pedagogical Repair Boundary`

El árbol de archivos puede mostrar paths, pero su estado debe ser cognitivo:

- `unvisited`
- `attempted`
- `owned`
- `partial`
- `gap: cannot explain deletion risk`
- `gap: understands function, not boundary`
- `blocked: missing prerequisite boundary`
- `questionable`

Anti-patrones explícitos:

- resumir directorios como salida principal;
- explicar archivos sin intento previo;
- ofrecer chat libre como experiencia central;
- generar documentación como reemplazo de ownership;
- declarar readiness sin respuesta del usuario.

## 3) Flujo operativo actual

1. El usuario pega `diff`/`PR body`/output de agente.
2. (Opcional) agrega `goalContext` para anclar intención.
3. `ownership-core` aplica revisión determinística y emite gaps, preguntas,
   evidencia sugerida, `readPath` y estado.
4. La UI sólo muestra el contrato validado.

## 4) Flujo con LLM (siguiente iteración)

Cuando se agregue un LLM, el modelo puede proponer claims, conceptos, riesgos y
gaps posibles. Esos claims no entran directo a UI ni memoria:

```text
LLM output
  -> schema validation
  -> evidence validation
  -> scope validation
  -> pedagogy validation
  -> UI projection
```

La pregunta del runtime no es si puede entender todo el código automáticamente,
sino si puede obligar al modelo a justificar cada ownership claim con evidencia
verificable y convertirlo en una prueba pedagógica para el humano.

## 4.1) Evidence extraction, no AST propio

La siguiente iteración no debe construir un AST completo ni un parser universal.
Debe construir una capa de extracción de evidencia:

```text
cheap deterministic signals
  + LLM evidence extraction
  + strict contracts
  + verification / confidence scoring
```

Tipos de evidencia:

- `observed`: comprobable barato por runtime, como archivo existente, string de
  import, keyword de export, símbolo textual, test cercano, path o archivo tocado
  por diff;
- `inferred`: interpretación semántica del modelo, como responsabilidad probable,
  boundary probable, naming confuso o mezcla de capas;
- `unverified`: hipótesis que solo puede convertirse en pregunta hasta tener
  evidencia, como dead code, main entrypoint, deletion safety o riesgo sistémico.

Reglas:

- sin source no hay `high confidence`;
- un claim `inferred` no puede convertirse en ownership fact;
- un claim `unverified` solo puede alimentar preguntas;
- hechos `observed` pueden alimentar el evidence graph;
- si el modelo afirma un caller y el runtime no lo encuentra con checks baratos,
  el claim baja confianza o queda bloqueado.

Comandos/checks suficientes para la primera versión:

```text
rg "export function"
rg "export const"
rg "from './"
git diff --name-only
git grep "symbolName"
```

Especializar por lenguaje queda reservado para errores repetidos que afecten el
producto:

- TypeScript: `ts-morph` o TypeScript Compiler API;
- Python: `ast`;
- Rust: `cargo metadata` / rust-analyzer;
- Go: `go/parser`.

## 5) Contratos futuros (definición conceptual, no implementación completa en este slice)

- `EvidenceRef`: `file_path`, `start_line`, `end_line`, `excerpt`, `source_kind`.
- `OwnershipClaim`: `claim`, `evidence_refs`, `confidence`.
- `OwnershipGap`: `gap`, `evidence_refs`, `operation`, `severity`.
- `OwnershipQuestion`: `question`, `operation`, `required_evidence_refs`, `success_criteria`.
- `ArtifactRecommendation`: `kind`, `reason`, `required_evidence_refs`.
- `ReadinessClaim`: `status`, `operation`, `subject`, `supporting_evidence_refs`,
  `user_attempt_ref`, `blocked_by_gap_ids`.

## 6) Entrega del slice

- Los tests ya existentes de ownership deben seguir validando que `ownership-core`
  y `sibi` usan la misma superficie de contrato.
- El ajuste principal de producto es conceptual y de frontera:
  runtime de evidencia/trazabilidad/pedagogía sobre claims del LLM.
- `sibi/README.md` debe apuntar a esta especificación como referencia del wedge.
