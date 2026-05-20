use std::{
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use sibi_workspace_compiler::{
    build_adapter, compile_workspace_intent as compile_rust_workspace_intent, CandidatePlan,
    EvidenceRef, LineRange, LlmAdapterConfig, LlmAdapterKind, SourceBundle, WorkspaceIntent,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CompileWorkspaceIntentPayload {
    input: WorkspaceIntentInput,
    #[serde(default)]
    adapter: Option<String>,
    #[serde(default)]
    run_codex: bool,
    #[serde(default)]
    fixture_path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceIntentInput {
    #[serde(default)]
    user_ambition: String,
    #[serde(default)]
    trying_to_build_or_understand: String,
    #[serde(default)]
    source_input: String,
    #[serde(default)]
    why_it_matters: String,
    #[serde(default)]
    already_know: String,
    #[serde(default)]
    not_know_yet: String,
    #[serde(default)]
    desired_output: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
struct CompileWorkspaceIntentResult {
    job: NativeCompilerJob,
    runner: NativeCompilerRunner,
    rust_intent: WorkspaceIntent,
    rust_workspace_plan: Option<CandidatePlan>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
struct NativeCompilerJob {
    id: String,
    request_id: String,
    status: String,
    status_history: Vec<String>,
    reason_code: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
struct NativeCompilerRunner {
    status: String,
    adapter: String,
    command: String,
    args: Vec<String>,
    blocked_reason: Option<String>,
}

#[tauri::command]
fn compile_workspace_intent(
    payload: CompileWorkspaceIntentPayload,
) -> CompileWorkspaceIntentResult {
    let adapter = payload.adapter.unwrap_or_else(|| "codex-exec".to_string());
    let request_id = format!("workspace-intent-{}", timestamp_millis());
    let mut status_history = vec!["queued".to_string(), "running".to_string()];
    let rust_intent = build_rust_intent(&payload.input);

    if adapter == "codex-exec" && !payload.run_codex {
        status_history.push("blocked".to_string());
        return CompileWorkspaceIntentResult {
            job: build_job(
                &request_id,
                "blocked",
                status_history,
                Some("runner_disabled"),
            ),
            runner: NativeCompilerRunner {
                status: "blocked".to_string(),
                adapter,
                command: "sibi-workspace-compiler".to_string(),
                args: vec!["--adapter".to_string(), "codex-exec".to_string()],
                blocked_reason: Some(
                    "codex-exec execution is disabled for this native request.".to_string(),
                ),
            },
            rust_intent,
            rust_workspace_plan: None,
        };
    }

    let adapter_config = match adapter.as_str() {
        "fixture" => LlmAdapterConfig {
            kind: LlmAdapterKind::Fixture,
            fixture_path: payload.fixture_path.map(PathBuf::from),
            schema_path: None,
            codex_binary: None,
        },
        "codex-exec" => LlmAdapterConfig {
            kind: LlmAdapterKind::CodexExec,
            fixture_path: None,
            schema_path: None,
            codex_binary: None,
        },
        _ => {
            status_history.push("failed".to_string());
            return CompileWorkspaceIntentResult {
                job: build_job(
                    &request_id,
                    "failed",
                    status_history,
                    Some("unsupported_adapter"),
                ),
                runner: NativeCompilerRunner {
                    status: "failed".to_string(),
                    adapter,
                    command: "sibi-workspace-compiler".to_string(),
                    args: vec![],
                    blocked_reason: Some("Unsupported workspace compiler adapter.".to_string()),
                },
                rust_intent,
                rust_workspace_plan: None,
            };
        }
    };

    let runner = match build_adapter(adapter_config) {
        Ok(runner) => runner,
        Err(error) => {
            status_history.push("failed".to_string());
            return CompileWorkspaceIntentResult {
                job: build_job(
                    &request_id,
                    "failed",
                    status_history,
                    Some("adapter_config"),
                ),
                runner: NativeCompilerRunner {
                    status: "failed".to_string(),
                    adapter,
                    command: "sibi-workspace-compiler".to_string(),
                    args: vec![],
                    blocked_reason: Some(error.to_string()),
                },
                rust_intent,
                rust_workspace_plan: None,
            };
        }
    };

    status_history.push("validating".to_string());
    match compile_rust_workspace_intent(&rust_intent, runner.as_ref()) {
        Ok(plan) => {
            status_history.push("completed".to_string());
            CompileWorkspaceIntentResult {
                job: build_job(&request_id, "completed", status_history, None),
                runner: NativeCompilerRunner {
                    status: "completed".to_string(),
                    adapter,
                    command: "sibi-workspace-compiler".to_string(),
                    args: vec![],
                    blocked_reason: None,
                },
                rust_intent,
                rust_workspace_plan: Some(plan),
            }
        }
        Err(error) => {
            status_history.push("failed".to_string());
            CompileWorkspaceIntentResult {
                job: build_job(
                    &request_id,
                    "failed",
                    status_history,
                    Some("compile_failed"),
                ),
                runner: NativeCompilerRunner {
                    status: "failed".to_string(),
                    adapter,
                    command: "sibi-workspace-compiler".to_string(),
                    args: vec![],
                    blocked_reason: Some(error.to_string()),
                },
                rust_intent,
                rust_workspace_plan: None,
            }
        }
    }
}

fn build_job(
    request_id: &str,
    status: &str,
    status_history: Vec<String>,
    reason_code: Option<&str>,
) -> NativeCompilerJob {
    NativeCompilerJob {
        id: format!("job-{request_id}"),
        request_id: request_id.to_string(),
        status: status.to_string(),
        status_history,
        reason_code: reason_code.map(str::to_string),
    }
}

fn build_rust_intent(input: &WorkspaceIntentInput) -> WorkspaceIntent {
    let raw_intent_candidates = [
        input.trying_to_build_or_understand.as_str(),
        input.user_ambition.as_str(),
        "Workspace plan generation.",
    ];
    let raw_intent = first_non_empty(&raw_intent_candidates);
    let source_text_candidates = [input.source_input.as_str(), raw_intent];
    let source_text = first_non_empty(&source_text_candidates);

    WorkspaceIntent {
        user_intent: raw_intent.to_string(),
        schema: Some("WorkspaceIntent".to_string()),
        intent_id: Some(format!("intent-{}", slug(raw_intent))),
        workspace_title: None,
        trying_to_build_or_understand: Some(raw_intent.to_string()),
        user_ambition: Some(
            first_non_empty(&[
                input.user_ambition.as_str(),
                "Convertirme en AI researcher-builder",
            ])
            .to_string(),
        ),
        source_bundle: SourceBundle {
            paths: vec!["inline://workspace-intent-source".to_string()],
            evidence: vec![EvidenceRef {
                id: "evidence-workspace-intent-source".to_string(),
                path: "inline://workspace-intent-source".to_string(),
                line_range: LineRange {
                    line_start: 1,
                    line_end: 1,
                },
                excerpt: source_text.to_string(),
                content_hash: None,
            }],
            content_hash: None,
            root_path: std::env::current_dir().ok(),
        },
        existing_state: Some(serde_json::json!({
            "why_it_matters": input.why_it_matters,
            "already_know": input.already_know,
            "not_know_yet": input.not_know_yet,
            "desired_output": input.desired_output,
        })),
    }
}

fn first_non_empty<'a>(values: &'a [&str]) -> &'a str {
    values
        .iter()
        .map(|value| value.trim())
        .find(|value| !value.is_empty())
        .unwrap_or_default()
}

fn slug(value: &str) -> String {
    let mut slug = String::new();
    let mut last_was_dash = false;
    for character in value.to_lowercase().chars() {
        if character.is_ascii_alphanumeric() {
            slug.push(character);
            last_was_dash = false;
        } else if !last_was_dash && !slug.is_empty() {
            slug.push('-');
            last_was_dash = true;
        }
    }
    slug.trim_matches('-').chars().take(48).collect()
}

fn timestamp_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![compile_workspace_intent])
        .run(tauri::generate_context!())
        .expect("failed to run tauri app");
}
