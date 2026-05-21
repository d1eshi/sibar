# Wedge de Ownership (Slice final Sibi → ownership-core)

## Regla central del slice

Sibi no construye un `AST` propio ni un `parser` por lenguaje desde cero.
No construimos un detector manual grande por lenguaje.

Este slice separa claramente:

- **LLM:** interpreta el cambio, detecta significado, intención, conceptos,
  riesgos y posibles gaps.
- **Runtime (ownership-core):** valida claims del LLM con evidencia, alcance,
  formato, readiness y requisitos pedagógicos antes de exponerlos en UI.

Resultado esperado: el runtime controla la trazabilidad y gobernanza de claims,
no se reemplaza la lectura del LLM.

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
