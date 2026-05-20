//! Experimental Rust workspace intent compiler for first-pass workspace planning.

mod adapter;
mod schema;
mod types;
mod validation;

pub use adapter::{
    build_adapter, CliAdapterKind, LlmAdapter, LlmAdapterConfig, LlmAdapterError, LlmAdapterKind,
};
pub use schema::{build_workspace_plan_schema, output_schema_path};
pub use types::{
    CandidatePlan, EvidenceRef, LineRange, NextAction, SourceBundle, SourceLink, SourceLinkReason,
    UIProjection, WorkspaceArtifactRequirement, WorkspaceIntent, WorkspaceNode, WorkspacePlan,
};
pub use validation::{validate_candidate_plan, ValidationError};

use serde_json::Value;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CompileError {
    #[error("No se pudo parsear la intención: {0}")]
    ParseIntent(String),
    #[error("No se pudo parsear la salida del runner: {0}")]
    ParseRunnerOutput(String),
    #[error("Error del runner: {0}")]
    Runner(String),
    #[error("La salida no cumple validaciones pedagógicas: {0}")]
    Validation(#[from] ValidationError),
}

/// Parsea la intención del workspace desde un input JSON.
pub fn parse_workspace_intent(input: &str) -> Result<WorkspaceIntent, CompileError> {
    serde_json::from_str::<WorkspaceIntent>(input)
        .map_err(|error| CompileError::ParseIntent(error.to_string()))
}

/// Compila una intención invocando el adaptador de runner y validando el
/// contrato resultante.
pub fn compile_workspace_intent(
    intent: &WorkspaceIntent,
    adapter: &dyn LlmAdapter,
) -> Result<CandidatePlan, CompileError> {
    let plan = adapter
        .run(intent)
        .map_err(|error| CompileError::Runner(error.to_string()))?;
    validate_candidate_plan(intent, &plan)?;
    Ok(plan)
}

/// Parse helper para una salida de runner recibida desde string.
pub fn parse_runner_output(raw: &str) -> Result<CandidatePlan, CompileError> {
    let value: Value = serde_json::from_str(raw)
        .map_err(|error| CompileError::ParseRunnerOutput(error.to_string()))?;

    match serde_json::from_value::<CandidatePlan>(value.clone()) {
        Ok(plan) => Ok(plan),
        Err(_) => {
            let envelope: FixtureEnvelope = serde_json::from_value(value)
                .map_err(|error| CompileError::ParseRunnerOutput(error.to_string()))?;
            envelope.candidate_plan.ok_or_else(|| {
                CompileError::ParseRunnerOutput("missing candidate_plan".to_string())
            })
        }
    }
}

#[derive(serde::Deserialize)]
struct FixtureEnvelope {
    candidate_plan: Option<CandidatePlan>,
}
