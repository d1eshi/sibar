use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    time::{SystemTime, UNIX_EPOCH},
};

use clap::ValueEnum;
use serde_json;
use thiserror::Error;

use crate::types::{CandidatePlan, WorkspaceIntent};

const DEFAULT_CODEX_MODEL: &str = "gpt-5.4";
const DEFAULT_CODEX_REASONING_EFFORT: &str = "medium";

#[derive(Debug, Clone, ValueEnum)]
pub enum CliAdapterKind {
    Fixture,
    #[value(name = "codex-exec")]
    CodexExec,
    #[value(name = "openai-api")]
    OpenAiApi,
    #[value(name = "opencode")]
    Opencode,
    #[value(name = "local-model")]
    LocalModel,
}

#[derive(Debug, Clone)]
pub enum LlmAdapterKind {
    Fixture,
    CodexExec,
    OpenAiApi,
    Opencode,
    LocalModel,
}

#[derive(Debug, Clone)]
pub struct LlmAdapterConfig {
    pub kind: LlmAdapterKind,
    pub fixture_path: Option<PathBuf>,
    pub schema_path: Option<PathBuf>,
    pub codex_binary: Option<String>,
}

#[derive(Debug)]
pub struct FixtureRunner {
    pub fixture_path: PathBuf,
}

#[derive(Debug)]
pub struct CodexExecRunner {
    pub schema_path: PathBuf,
    pub codex_binary: String,
}

pub trait LlmAdapter {
    fn name(&self) -> &'static str;
    fn run(&self, intent: &WorkspaceIntent) -> Result<CandidatePlan, LlmAdapterError>;
}

#[derive(Debug, Error)]
pub enum LlmAdapterError {
    #[error("Runner no soportado: {0}")]
    Unsupported(&'static str),
    #[error("No se pudo leer archivo fixture: {0}")]
    FixtureIo(#[from] std::io::Error),
    #[error("No se pudo serializar/parsear JSON de runner: {0}")]
    ParseJson(String),
    #[error("Error ejecutando codex: {0}")]
    CommandFailure(String),
}

pub fn build_adapter(config: LlmAdapterConfig) -> Result<Box<dyn LlmAdapter>, LlmAdapterError> {
    match config.kind {
        LlmAdapterKind::Fixture => {
            let fixture_path = config.fixture_path.ok_or(LlmAdapterError::Unsupported(
                "fixture adapter requires --fixture path",
            ))?;
            Ok(Box::new(FixtureRunner { fixture_path }))
        }
        LlmAdapterKind::CodexExec => {
            let schema_path = config.schema_path.unwrap_or_else(default_schema_path);
            let codex_binary = config.codex_binary.unwrap_or_else(|| "codex".to_string());
            Ok(Box::new(CodexExecRunner {
                schema_path,
                codex_binary,
            }))
        }
        LlmAdapterKind::OpenAiApi => Err(LlmAdapterError::Unsupported(
            "openai-api adapter is reserved for future adapters",
        )),
        LlmAdapterKind::Opencode => Err(LlmAdapterError::Unsupported(
            "opencode adapter is reserved for future adapters",
        )),
        LlmAdapterKind::LocalModel => Err(LlmAdapterError::Unsupported(
            "local-model adapter is reserved for future adapters",
        )),
    }
}

impl LlmAdapter for FixtureRunner {
    fn name(&self) -> &'static str {
        "fixture"
    }

    fn run(&self, _intent: &WorkspaceIntent) -> Result<CandidatePlan, LlmAdapterError> {
        let raw_output = fs::read_to_string(&self.fixture_path)?;
        crate::parse_runner_output(&raw_output)
            .map_err(|err| LlmAdapterError::ParseJson(err.to_string()))
    }
}

impl LlmAdapter for CodexExecRunner {
    fn name(&self) -> &'static str {
        "codex-exec"
    }

    fn run(&self, intent: &WorkspaceIntent) -> Result<CandidatePlan, LlmAdapterError> {
        let output_path = build_temp_output_path();
        let schema_path = path_to_string(&self.schema_path, "schema_path")?;
        let output_path_arg = path_to_string(&output_path, "temporary output path")?;
        let root_path = intent
            .source_bundle
            .root_path
            .as_ref()
            .map(|path| path_to_string(path, "source_bundle.root_path"))
            .transpose()?;
        let args = build_codex_exec_args(&schema_path, &output_path_arg, root_path.as_deref());

        let mut command = Command::new(&self.codex_binary);
        eprintln!(
            "[sibi-workspace-compiler] starting codex-exec model={DEFAULT_CODEX_MODEL} effort={DEFAULT_CODEX_REASONING_EFFORT} output={output_path}",
            output_path = output_path.display()
        );
        eprintln!(
            "[sibi-workspace-compiler] command: {} {}",
            self.codex_binary,
            args.join(" ")
        );
        command.args(args);
        command.stdin(Stdio::piped());
        command.stdout(Stdio::inherit());
        command.stderr(Stdio::inherit());

        let mut child = command.spawn().map_err(|error| {
            LlmAdapterError::CommandFailure(format!(
                "No se pudo ejecutar {binary}: {error}",
                binary = self.codex_binary
            ))
        })?;

        {
            let stdin = child.stdin.as_mut().ok_or_else(|| {
                LlmAdapterError::CommandFailure("No se pudo abrir stdin de codex".to_string())
            })?;
            let payload = build_codex_prompt(intent, &schema_path, &output_path_arg)?;
            stdin
                .write_all(payload.as_bytes())
                .map_err(|error| LlmAdapterError::CommandFailure(error.to_string()))?;
        }

        let status = child
            .wait()
            .map_err(|error| LlmAdapterError::CommandFailure(error.to_string()))?;

        eprintln!("[sibi-workspace-compiler] codex-exec finished with {status}");

        let result = if status.success() {
            let raw_output = fs::read_to_string(&output_path)
                .map_err(|error| LlmAdapterError::FixtureIo(error))?;
            let parsed = crate::parse_runner_output(&raw_output)
                .map_err(|error| LlmAdapterError::ParseJson(error.to_string()))?;
            Ok(parsed)
        } else {
            Err(LlmAdapterError::CommandFailure(format!(
                "codex exited with {status}; see terminal logs for stdout/stderr"
            )))
        };

        let _ = fs::remove_file(&output_path);
        result
    }
}

pub fn build_codex_prompt(
    intent: &WorkspaceIntent,
    schema_path: &str,
    output_path: &str,
) -> Result<String, LlmAdapterError> {
    let intent_payload = serde_json::to_string_pretty(intent)
        .map_err(|error| LlmAdapterError::ParseJson(error.to_string()))?;
    let evidence_ids = intent
        .source_bundle
        .evidence
        .iter()
        .map(|entry| format!("  - {}", entry.id))
        .collect::<Vec<_>>()
        .join("\n");
    let source_paths = intent
        .source_bundle
        .paths
        .iter()
        .map(|path| format!("  - {}", path))
        .collect::<Vec<_>>()
        .join("\n");

    Ok(format!(
        concat!(
            "You are the Sibi/Pedagogy Workspace Compiler.\n",
            "Your task: generate a WorkspacePlan candidate from the provided intent.\n",
            "Do not run shell commands, inspect files, call tools, or read the schema file; use only this prompt payload.\n",
            "Return ONLY a single JSON object and nothing else.\n",
            "No markdown fences, no explanations, and no extra text.\n",
            "Output must exactly match the schema at '{schema_path}'.\n",
            "Write to the output path '{output_path}' via codex's -o flag.\n",
            "Use evidence_id values strictly from source_bundle.evidence.\n",
            "Do not invent paths, node ids, source ids, or other fields.\n",
            "bounded_objective MUST be true.\n",
            "Generate exactly 2 or 3 next_actions total, all visible=true unless there is a clear blocked action.\n",
            "Generate 1 to 3 nodes. Do not create a mega-workspace.\n\n",
            "Every node must include at least one prerequisite, one concept, one source_link, and one artifact requirement.\n",
            "If a beginner node has no prior prerequisite, use a concrete prerequisite like 'read evidence-workspace-intent-source first'.\n\n",
            "For onboarding intents, prefer a small beginner path with is_advanced=false.\n",
            "For this first workspace, avoid advanced nodes unless the user supplied enough source context.\n",
            "If any node has is_advanced=true, locked MUST be an object with a clear non-empty reason, and that node must not be the first visible action.\n",
            "If there is enough intent to begin, questions_if_blocked MUST be an empty array.\n\n",
            "WorkspaceIntent (normalized_user_intent):\n",
            "{normalized}\n\n",
            "Source paths:\n",
            "{source_paths}\n\n",
            "Available evidence ids:\n",
            "{evidence_ids}\n\n",
            "Workspace intent payload:\n",
            "{intent_payload}\n"
        ),
        schema_path = schema_path,
        output_path = output_path,
        normalized = intent.normalized_user_intent(),
        source_paths = if source_paths.is_empty() {
            "  - (none)".to_string()
        } else {
            source_paths
        },
        evidence_ids = if evidence_ids.is_empty() {
            "  - (none)".to_string()
        } else {
            evidence_ids
        },
        intent_payload = intent_payload
    ))
}

pub fn build_codex_exec_args(
    schema_path: &str,
    output_path: &str,
    root_path: Option<&str>,
) -> Vec<String> {
    let mut args = vec!["exec".to_string()];
    if let Some(root_path) = root_path {
        args.push("--cd".to_string());
        args.push(root_path.to_string());
    }
    args.extend([
        "-m".to_string(),
        DEFAULT_CODEX_MODEL.to_string(),
        "-c".to_string(),
        format!("model_reasoning_effort=\"{DEFAULT_CODEX_REASONING_EFFORT}\""),
        "--sandbox".to_string(),
        "read-only".to_string(),
        "--ephemeral".to_string(),
        "--ignore-user-config".to_string(),
        "--ignore-rules".to_string(),
        "--output-schema".to_string(),
        schema_path.to_string(),
        "-o".to_string(),
        output_path.to_string(),
        "-".to_string(),
    ]);
    args
}

fn path_to_string(path: &Path, name: &str) -> Result<String, LlmAdapterError> {
    path.to_str().map(|value| value.to_string()).ok_or_else(|| {
        LlmAdapterError::CommandFailure(format!(
            "La ruta de {name} no es UTF-8 válido: {path}",
            name = name,
            path = path.display()
        ))
    })
}

fn build_temp_output_path() -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_nanos())
        .unwrap_or(0);
    std::env::temp_dir().join(format!("sibi-workspace-plan-{nanos}.json"))
}

fn default_schema_path() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("schemas")
        .join("workspace-plan.schema.json")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{EvidenceRef, LineRange, SourceBundle};

    #[test]
    fn build_codex_prompt_is_strict_json_contract() {
        let intent = WorkspaceIntent {
            user_intent: "Quiero entender este flujo.".to_string(),
            schema: None,
            intent_id: None,
            workspace_title: Some("Demo".to_string()),
            trying_to_build_or_understand: None,
            user_ambition: None,
            source_bundle: SourceBundle {
                paths: vec!["src/lib.rs".to_string()],
                evidence: vec![EvidenceRef {
                    id: "e-1".to_string(),
                    path: "src/lib.rs".to_string(),
                    line_range: LineRange {
                        line_start: 1,
                        line_end: 5,
                    },
                    excerpt: "fn main() {}".to_string(),
                    content_hash: None,
                }],
                content_hash: None,
                root_path: None,
            },
            existing_state: None,
        };

        let prompt = build_codex_prompt(&intent, "/tmp/schema.json", "/tmp/plan.json")
            .expect("prompt build");
        assert!(prompt.contains("ONLY a single JSON object"));
        assert!(prompt.contains("Do not run shell commands"));
        assert!(prompt.contains("schema at '/tmp/schema.json'"));
        assert!(prompt.contains("bounded_objective MUST be true"));
        assert!(prompt.contains("Generate exactly 2 or 3 next_actions"));
        assert!(prompt.contains("e-1"));
    }

    #[test]
    fn build_codex_exec_args_respects_cd_root_path_before_sandbox() {
        let args = build_codex_exec_args("/tmp/schema.json", "/tmp/out.json", Some("/repo/root"));
        let cd_index = args
            .iter()
            .position(|value| value == "--cd")
            .expect("cd flag");
        let sandbox_index = args
            .iter()
            .position(|value| value == "--sandbox")
            .expect("sandbox flag");
        assert!(cd_index < sandbox_index);
        assert_eq!(args[cd_index + 1], "/repo/root");
        assert!(args[1] == "--cd");
        assert!(args.windows(2).any(|entry| entry == ["-m", "gpt-5.4"]));
        assert!(args
            .windows(2)
            .any(|entry| entry == ["-c", "model_reasoning_effort=\"medium\""]));
        assert!(args.iter().any(|entry| entry == "--ignore-user-config"));
    }
}
