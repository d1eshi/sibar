use schemars::schema_for;
use serde_json::{to_string_pretty, Value};

use crate::types::WorkspacePlan;

/// Genera el esquema JSON del `WorkspacePlan` desde los contratos serde/schemars.
pub fn build_workspace_plan_schema() -> Value {
    to_string_pretty(&schema_for!(WorkspacePlan))
        .ok()
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_else(|| serde_json::json!({}))
}

/// Ruta al esquema embebido por defecto en este paquete.
pub fn output_schema_path() -> std::path::PathBuf {
    std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("schemas")
        .join("workspace-plan.schema.json")
}
