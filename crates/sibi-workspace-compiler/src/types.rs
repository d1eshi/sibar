use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Intención inicial que recibe el compilador.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub struct WorkspaceIntent {
    #[serde(default)]
    pub user_intent: String,
    #[serde(default)]
    pub schema: Option<String>,
    #[serde(default)]
    pub intent_id: Option<String>,
    #[serde(default)]
    pub workspace_title: Option<String>,
    #[serde(default)]
    pub trying_to_build_or_understand: Option<String>,
    #[serde(default)]
    pub user_ambition: Option<String>,
    #[serde(default)]
    pub source_bundle: SourceBundle,
    #[serde(default)]
    pub existing_state: Option<serde_json::Value>,
}

impl WorkspaceIntent {
    pub fn normalized_user_intent(&self) -> String {
        if !self.user_intent.trim().is_empty() {
            return self.user_intent.trim().to_string();
        }

        if let Some(value) = self.trying_to_build_or_understand.as_deref() {
            let normalized = value.trim();
            if !normalized.is_empty() {
                return normalized.to_string();
            }
        }

        if let Some(value) = self.user_ambition.as_deref() {
            let normalized = value.trim();
            if !normalized.is_empty() {
                return normalized.to_string();
            }
        }

        String::new()
    }
}

/// Bundle de evidencias y rutas disponibles para citar.
#[derive(Debug, Default, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub struct SourceBundle {
    #[serde(default)]
    pub paths: Vec<String>,
    /// Evidencias mínimas para trazabilidad.
    #[serde(default)]
    pub evidence: Vec<EvidenceRef>,
    /// Hash de contexto completo, opcional.
    #[serde(default)]
    pub content_hash: Option<String>,
    #[serde(default)]
    pub root_path: Option<PathBuf>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub struct EvidenceRef {
    pub id: String,
    pub path: String,
    pub line_range: LineRange,
    pub excerpt: String,
    #[serde(default)]
    pub content_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub struct LineRange {
    pub line_start: u32,
    pub line_end: u32,
}

/// Plan candidato emitido por el runner.
pub type CandidatePlan = WorkspacePlan;

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub struct WorkspacePlan {
    pub objective: String,
    /// Marca explícita para indicar que el objetivo está acotado.
    pub bounded_objective: bool,
    #[serde(default)]
    pub nodes: Vec<WorkspaceNode>,
    #[serde(default)]
    pub next_actions: Vec<NextAction>,
    #[serde(default)]
    pub artifact_requirements: Vec<WorkspaceArtifactRequirement>,
    #[serde(default)]
    pub questions_if_blocked: Vec<String>,
    #[serde(default)]
    pub ui_projection: Option<UIProjection>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub struct WorkspaceNode {
    pub id: String,
    #[serde(default)]
    pub title: Option<String>,
    pub prerequisites: Vec<String>,
    pub concepts: Vec<String>,
    pub source_links: Vec<SourceLink>,
    pub artifact_requirement: WorkspaceArtifactRequirement,
    pub is_advanced: bool,
    #[serde(default)]
    pub locked: Option<SourceLinkReason>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub struct SourceLink {
    pub evidence_id: String,
    #[serde(default)]
    pub rationale: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub struct SourceLinkReason {
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub struct WorkspaceArtifactRequirement {
    pub id: String,
    pub path: String,
    pub requires: String,
    #[serde(default)]
    pub optional: bool,
    #[serde(default)]
    pub confidence: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub struct NextAction {
    pub label: String,
    pub target_node_id: Option<String>,
    /// Solo cuenta para UI, como máximo 3 visibles.
    pub visible: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub struct UIProjection {
    pub title: String,
    pub summary: String,
    #[serde(default)]
    pub badges: Vec<String>,
}
