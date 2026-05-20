use std::fs;

use sibi_workspace_compiler::{
    build_adapter, compile_workspace_intent, parse_workspace_intent, CompileError,
    LlmAdapterConfig, LlmAdapterKind, WorkspaceIntent,
};
use tempfile::tempdir;

fn fixture_intent() -> String {
    let intent = serde_json::json!({
        "user_intent": "Derivar el flujo de entrada del runtime en una sesión de workspace.",
        "source_bundle": {
            "paths": ["src/runtime.ts"],
            "evidence": [
                {
                    "id": "e-runtime",
                    "path": "src/runtime.ts",
                    "line_range": { "line_start": 1, "line_end": 3 },
                    "excerpt": "export function handleRequest"
                }
            ]
        }
    });
    intent.to_string()
}

fn pedagogo_intent_with_root_path() -> String {
    let intent = serde_json::json!({
        "schema": "WorkspaceIntent",
        "intent_id": "ws-intent-001",
        "workspace_title": "Runtime Session",
        "trying_to_build_or_understand": "Entender el flujo de arranque del runtime.",
        "user_ambition": "Comprender la entrada y coordinación de sesiones.",
        "source_bundle": {
            "paths": ["src/runtime.ts"],
            "root_path": "/tmp/project-root",
            "evidence": [
                {
                    "id": "e-runtime",
                    "path": "src/runtime.ts",
                    "line_range": { "line_start": 1, "line_end": 3 },
                    "excerpt": "export function handleRequest"
                }
            ]
        }
    });
    intent.to_string()
}

fn write_temp_plan(json: &str) -> (tempfile::TempDir, std::path::PathBuf) {
    let dir = tempdir().expect("temp dir");
    let path = dir.path().join("plan.json");
    fs::write(&path, json).expect("plan fixture");
    (dir, path)
}

fn valid_plan_json(with_questions: bool, source_link: &str, advanced_locked: bool) -> String {
    let questions = if with_questions {
        vec!["¿Qué parte del código define la entrada principal?"]
    } else {
        Vec::<&str>::new()
    };

    let source_link = if source_link.is_empty() {
        vec!["e-runtime"]
    } else {
        vec![source_link]
    };

    serde_json::json!({
        "objective": "Derivar solo la parte crítica de la entrada del runtime.",
        "bounded_objective": true,
        "nodes": [{
            "id": "node-1",
            "title": "Extraer punto de entrada.",
            "prerequisites": ["runtime.ts"],
            "concepts": ["entrypoint", "boundary"],
            "source_links": source_link.iter().map(|id| serde_json::json!({"evidence_id": id})).collect::<Vec<_>>(),
            "artifact_requirement": {
                "id": "artifact-1",
                "path": "src/runtime.ts",
                "requires": "entrypoint-path"
            },
            "is_advanced": false,
            "locked": if advanced_locked { serde_json::json!({"reason":"Requiere evidencia adicional"}) } else { serde_json::Value::Null }
        }],
        "next_actions": [
            {"label": "inspeccionar flujo", "target_node_id": "node-1", "visible": true},
            {"label": "pedir evidencia", "target_node_id": "node-1", "visible": true},
            {"label": "revisar pruebas", "target_node_id": "node-1", "visible": true},
            {"label": "opcion-extra", "target_node_id": "node-1", "visible": false}
        ],
        "artifact_requirements": [{
            "id": "artifact-1",
            "path": "src/runtime.ts",
            "requires": "entrypoint-path"
        }],
        "questions_if_blocked": questions,
        "ui_projection": {
            "title": "Workspace plan",
            "summary": "Vista compacta del plan.",
            "badges": ["entrypoint", "runtime"]
        }
    }).to_string()
}

#[test]
fn fixture_happy_path_is_accepted() {
    let (dir, plan_path) = write_temp_plan(&valid_plan_json(false, "", true));
    let intent: WorkspaceIntent = parse_workspace_intent(&fixture_intent()).unwrap();
    let adapter = build_adapter(LlmAdapterConfig {
        kind: LlmAdapterKind::Fixture,
        fixture_path: Some(plan_path),
        schema_path: None,
        codex_binary: None,
    })
    .unwrap();

    let plan = compile_workspace_intent(&intent, adapter.as_ref()).unwrap();
    assert_eq!(plan.nodes.len(), 1);
    assert_eq!(plan.next_actions.len(), 4);
    assert_eq!(plan.ui_projection.as_ref().unwrap().title, "Workspace plan");
    drop(dir);
}

#[test]
fn parses_pedagogoai_intent_style_with_source_bundle() {
    let intent: WorkspaceIntent =
        parse_workspace_intent(&pedagogo_intent_with_root_path()).unwrap();
    assert_eq!(
        intent.normalized_user_intent(),
        "Entender el flujo de arranque del runtime."
    );
    assert_eq!(
        intent.source_bundle.root_path,
        Some(std::path::PathBuf::from("/tmp/project-root"))
    );
}

#[test]
fn rejects_more_than_three_visible_next_actions() {
    let mut plan =
        serde_json::from_str::<serde_json::Value>(&valid_plan_json(false, "", true)).unwrap();
    if let Some(actions) = plan
        .get_mut("next_actions")
        .and_then(|node| node.as_array_mut())
    {
        actions.push(serde_json::json!({"label":"cuarta visible", "target_node_id":"node-1", "visible": true}));
        actions.push(serde_json::json!({"label":"quinta visible", "target_node_id":"node-1", "visible": true}));
    }
    let (dir, plan_path) = write_temp_plan(&serde_json::to_string_pretty(&plan).unwrap());
    let intent: WorkspaceIntent = parse_workspace_intent(&fixture_intent()).unwrap();
    let adapter = build_adapter(LlmAdapterConfig {
        kind: LlmAdapterKind::Fixture,
        fixture_path: Some(plan_path),
        schema_path: None,
        codex_binary: None,
    })
    .unwrap();

    let result = compile_workspace_intent(&intent, adapter.as_ref());
    match result {
        Err(CompileError::Validation(err)) => {
            assert!(err
                .1
                .iter()
                .any(|issue| issue.code == "next_actions_too_many"));
        }
        _ => panic!("expected validation error"),
    }
    drop(dir);
}

#[test]
fn rejects_uncited_source_links() {
    let (dir, plan_path) = write_temp_plan(&valid_plan_json(false, "missing-evidence", true));
    let intent: WorkspaceIntent = parse_workspace_intent(&fixture_intent()).unwrap();
    let adapter = build_adapter(LlmAdapterConfig {
        kind: LlmAdapterKind::Fixture,
        fixture_path: Some(plan_path),
        schema_path: None,
        codex_binary: None,
    })
    .unwrap();

    let result = compile_workspace_intent(&intent, adapter.as_ref());
    match result {
        Err(CompileError::Validation(err)) => {
            assert!(err
                .1
                .iter()
                .any(|issue| issue.code == "node_source_link_not_found"));
        }
        _ => panic!("expected validation error"),
    }
    drop(dir);
}

#[test]
fn rejects_advanced_unlocked() {
    let mut plan =
        serde_json::from_str::<serde_json::Value>(&valid_plan_json(true, "", false)).unwrap();
    if let Some(nodes) = plan.get_mut("nodes").and_then(|node| node.as_array_mut()) {
        nodes[0]["is_advanced"] = serde_json::json!(true);
        nodes[0]["locked"] = serde_json::Value::Null;
    }
    let (dir, plan_path) = write_temp_plan(&serde_json::to_string_pretty(&plan).unwrap());
    let intent: WorkspaceIntent = parse_workspace_intent(&fixture_intent()).unwrap();
    let adapter = build_adapter(LlmAdapterConfig {
        kind: LlmAdapterKind::Fixture,
        fixture_path: Some(plan_path),
        schema_path: None,
        codex_binary: None,
    })
    .unwrap();

    let result = compile_workspace_intent(&intent, adapter.as_ref());
    match result {
        Err(CompileError::Validation(err)) => {
            assert!(err
                .1
                .iter()
                .any(|issue| issue.code == "advanced_node_unlocked"));
        }
        _ => panic!("expected validation error"),
    }
    drop(dir);
}
