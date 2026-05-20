use std::collections::HashMap;

use thiserror::Error;

use crate::types::{CandidatePlan, SourceBundle, WorkspaceIntent, WorkspaceNode};

const MAX_OBJECTIVE_CHARS: usize = 280;
const MIN_NEXT_ACTIONS: usize = 2;
const MAX_NEXT_ACTIONS: usize = 3;
const MAX_VISIBLE_NEXT_ACTIONS: usize = 3;

#[derive(Debug)]
pub struct ValidationIssue {
    pub code: &'static str,
    pub detail: String,
}

#[derive(Debug, Error)]
#[error("Validation error: {0}")]
pub struct ValidationError(String, pub Vec<ValidationIssue>);

impl ValidationError {
    pub fn from_issues(issues: Vec<ValidationIssue>) -> Self {
        let summary = issues
            .iter()
            .map(|issue| format!("{}: {}", issue.code, issue.detail))
            .collect::<Vec<_>>()
            .join(", ");
        Self(summary, issues)
    }
}

fn evidence_index(bundle: &SourceBundle) -> HashMap<String, String> {
    bundle
        .evidence
        .iter()
        .map(|entry| (entry.id.clone(), entry.path.clone()))
        .collect()
}

pub fn validate_candidate_plan(
    intent: &WorkspaceIntent,
    plan: &CandidatePlan,
) -> Result<(), ValidationError> {
    let mut issues = Vec::<ValidationIssue>::new();

    validate_objective(intent, plan, &mut issues);
    validate_plan_structure(plan, &mut issues);
    validate_visibility(plan, &mut issues);
    validate_nodes(intent, plan, &mut issues);
    validate_context_rules(intent, plan, &mut issues);

    if issues.is_empty() {
        Ok(())
    } else {
        Err(ValidationError::from_issues(issues))
    }
}

fn validate_objective(
    intent: &WorkspaceIntent,
    plan: &CandidatePlan,
    issues: &mut Vec<ValidationIssue>,
) {
    let objective = plan.objective.trim();
    if objective.is_empty() {
        issues.push(ValidationIssue {
            code: "objective_missing",
            detail: "El plan debe incluir un objetivo acotado y no vacío.".to_string(),
        });
        return;
    }

    if !plan.bounded_objective {
        issues.push(ValidationIssue {
            code: "objective_not_marked_bounded",
            detail:
                "El objetivo debe declararse explícitamente acotado (`bounded_objective: true`)."
                    .to_string(),
        });
    }

    if objective.chars().count() > MAX_OBJECTIVE_CHARS {
        issues.push(ValidationIssue {
            code: "objective_too_long",
            detail: format!(
                "El objetivo supera el límite de {MAX_OBJECTIVE_CHARS} caracteres; use un objetivo más acotado.",
            ),
        });
    }

    if intent.source_bundle.paths.is_empty() && plan.nodes.is_empty() {
        issues.push(ValidationIssue {
            code: "objective_unusable_without_context",
            detail: "Sin rutas en el bundle, no puede producirse un plan utilizable sin preguntar primero."
                .to_string(),
        });
    }
}

fn validate_plan_structure(plan: &CandidatePlan, issues: &mut Vec<ValidationIssue>) {
    if !plan.nodes.is_empty() && !plan.artifact_requirements.is_empty() {
        // Keep as is: no extra structural constraints beyond presence checks in nodes.
    } else if plan.nodes.is_empty() {
        issues.push(ValidationIssue {
            code: "nodes_empty",
            detail: "Debe existir al menos un nodo en el WorkspacePlan.".to_string(),
        });
    } else if plan.artifact_requirements.is_empty() {
        issues.push(ValidationIssue {
            code: "artifact_requirements_missing",
            detail: "Faltan requisitos de artefacto de sesión.".to_string(),
        });
    }
}

fn validate_visibility(plan: &CandidatePlan, issues: &mut Vec<ValidationIssue>) {
    let action_count = plan.next_actions.len();
    if !(MIN_NEXT_ACTIONS..=MAX_NEXT_ACTIONS).contains(&action_count) {
        issues.push(ValidationIssue {
            code: "next_actions_count_out_of_range",
            detail: format!(
                "El WorkspacePlan debe incluir entre {MIN_NEXT_ACTIONS} y {MAX_NEXT_ACTIONS} next_actions. Encontradas {action_count}."
            ),
        });
    }

    let visible_count = plan
        .next_actions
        .iter()
        .filter(|action| action.visible)
        .count();

    if visible_count > MAX_VISIBLE_NEXT_ACTIONS {
        issues.push(ValidationIssue {
            code: "next_actions_too_many",
            detail: format!(
                "Máximo {MAX_VISIBLE_NEXT_ACTIONS} next_actions visibles permitidas. Encontradas {visible_count}."
            ),
        });
    }
}

fn validate_nodes(
    intent: &WorkspaceIntent,
    plan: &CandidatePlan,
    issues: &mut Vec<ValidationIssue>,
) {
    let evidence_paths = evidence_index(&intent.source_bundle);
    for node in &plan.nodes {
        validate_node_fields(node, &evidence_paths, issues);
    }
}

fn validate_node_fields(
    node: &WorkspaceNode,
    evidence_paths: &HashMap<String, String>,
    issues: &mut Vec<ValidationIssue>,
) {
    if node.id.trim().is_empty() {
        issues.push(ValidationIssue {
            code: "node_missing_id",
            detail: "Cada nodo debe incluir id.".to_string(),
        });
    }

    if node.prerequisites.is_empty() {
        issues.push(ValidationIssue {
            code: "node_missing_prerequisites",
            detail: format!("El nodo {} debe incluir prerequisites.", node.id),
        });
    }

    if node.concepts.is_empty() {
        issues.push(ValidationIssue {
            code: "node_missing_concepts",
            detail: format!("El nodo {} debe incluir conceptos relacionados.", node.id),
        });
    }

    if node.source_links.is_empty() {
        issues.push(ValidationIssue {
            code: "node_missing_source_links",
            detail: format!(
                "El nodo {} debe declarar al menos una source_link.",
                node.id
            ),
        });
    }

    if node.artifact_requirement.path.trim().is_empty() {
        issues.push(ValidationIssue {
            code: "node_missing_artifact_requirement_path",
            detail: format!(
                "El nodo {} debe incluir artifact_requirement.path.",
                node.id
            ),
        });
    }

    validate_source_links(node, evidence_paths, issues);
    validate_advanced_locking(node, issues);
}

fn validate_source_links(
    node: &WorkspaceNode,
    evidence_paths: &HashMap<String, String>,
    issues: &mut Vec<ValidationIssue>,
) {
    for source_link in &node.source_links {
        let evidence_ref_exists = evidence_paths.contains_key(&source_link.evidence_id);
        if !evidence_ref_exists {
            issues.push(ValidationIssue {
                code: "node_source_link_not_found",
                detail: format!(
                    "node:{} referencia evidence_id '{}' que no existe en source_bundle.evidence.",
                    node.id, source_link.evidence_id
                ),
            });
        }
    }
}

fn validate_advanced_locking(node: &WorkspaceNode, issues: &mut Vec<ValidationIssue>) {
    if !node.is_advanced {
        return;
    }

    match &node.locked {
        Some(reason) if !reason.reason.trim().is_empty() => {}
        Some(_) => {
            issues.push(ValidationIssue {
                code: "advanced_node_locked_without_reason",
                detail: format!(
                    "node:{} marcado como avanzado pero sin razón de bloqueo.",
                    node.id
                ),
            });
        }
        None => {
            issues.push(ValidationIssue {
                code: "advanced_node_unlocked",
                detail: format!(
                    "node:{} está avanzado pero no está locked con reason.",
                    node.id
                ),
            });
        }
    }
}

fn validate_context_rules(
    intent: &WorkspaceIntent,
    plan: &CandidatePlan,
    issues: &mut Vec<ValidationIssue>,
) {
    let missing_context =
        intent.source_bundle.paths.is_empty() && intent.source_bundle.evidence.is_empty();
    let has_citation_gaps = plan.nodes.iter().any(|node| node.source_links.is_empty());

    if (missing_context || has_citation_gaps) && plan.questions_if_blocked.is_empty() {
        issues.push(ValidationIssue {
            code: "missing_context_questions",
            detail:
                "Si no hay suficiente contexto o hay nodos sin evidencias citables, debe exigir questions_if_blocked.".to_string(),
        });
    }
}
