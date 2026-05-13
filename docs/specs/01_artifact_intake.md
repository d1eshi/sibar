# Spec 01: Artifact Intake

## Goal

Let the user bring one real software artifact into Sibi for a Build-to-Learn session.

An artifact can be:

1. a small generated repo
2. a folder in a larger repo
3. a handpicked set of files
4. a single code path with supporting docs

## Contract

An artifact intake produces:

```text
ArtifactSession
  id
  label
  root_path
  source_type: generated_repo | existing_repo | folder | file_set
  declared_learning_goal
  declared_confidence
  included_paths
  excluded_paths
  created_at
```

## Required Behavior

1. The user declares what they want to learn.
2. The user selects the artifact boundary explicitly.
3. Sibi records why this artifact matters.
4. Sibi refuses unbounded "read the whole machine" behavior.
5. Sibi stores enough metadata to resume the session.

## Non-Goals

1. no agent-built project generation inside v0.1
2. no background filesystem watcher
3. no hidden repo scanning
4. no editor plugin
5. no workspace mutation

## Verification

The first test artifact should be small enough that a human can inspect the generated map in one sitting.

Acceptance:

1. one artifact session can be created
2. the boundary is visible
3. excluded paths are respected
4. the learning goal is attached to later questions and reports

