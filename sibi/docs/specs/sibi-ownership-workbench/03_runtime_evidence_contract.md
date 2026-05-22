# Runtime Spec: Evidence Extraction Contract

## Goal

Build useful ownership evidence with explicit uncertainty.

Do not build perfect code intelligence first. Sibi only needs enough verified
context to ask:

```text
Did this change touch a boundary the user cannot explain yet?
```

## Pipeline

```text
Code / Diff / Directory
  -> Cheap Scanner
  -> LLM Evidence Extractor
  -> Schema Validator
  -> Evidence Verifier
  -> Ownership Contract Builder
  -> User Attempt
  -> Pedagogical Diagnosis
```

## Cheap Scanner

The cheap scanner gathers observed facts:

- file exists;
- path and extension;
- line count and byte size;
- diff touched file;
- nearby test/doc paths;
- import strings;
- export strings;
- symbol text occurrences;
- simple caller candidates with `git grep` / `rg`.

Initial commands/checks:

```text
git diff --name-only
rg "export function"
rg "export const"
rg "from './"
git grep "symbolName"
```

## Evidence Kinds

```ts
type EvidenceKind = "observed" | "inferred" | "unverified" | "conflict";
```

- `observed`: runtime can verify it cheaply.
- `inferred`: model interpretation with cited basis.
- `unverified`: hypothesis requiring verification or user questioning.
- `conflict`: model claim disagrees with deterministic evidence.

## Core Types

```ts
type EvidenceRef = {
  file_path: string;
  start_line: number;
  end_line: number;
  excerpt: string;
  source_kind: "diff" | "repo" | "test" | "doc" | "conversation";
};

type EvidenceItem = {
  kind: EvidenceKind;
  claim: string;
  source?: {
    file_path?: string;
    start_line?: number;
    end_line?: number;
    symbol?: string;
  };
  confidence: "low" | "medium" | "high";
  verification_needed?: string;
};

type CodeEvidence = {
  file_path: string;
  language: "ts" | "tsx" | "js" | "jsx" | "py" | "rs" | "go" | "unknown";
  symbols: Array<{
    name: string;
    kind: "function" | "class" | "type" | "constant" | "component" | "unknown";
    exported: boolean;
    responsibility_claim?: string;
  }>;
  imports: Array<{
    source: string;
    imported_names?: string[];
  }>;
  possible_callers?: Array<{
    symbol: string;
    callers: string[];
    confidence: "low" | "medium" | "high";
  }>;
  evidence: EvidenceItem[];
};

type OwnershipBoundary = {
  id: string;
  name: string;
  files: string[];
  responsibility_claim: string;
  evidence: EvidenceItem[];
  open_questions: string[];
  risk: "low" | "medium" | "high";
  confidence: "low" | "medium" | "high";
};
```

## Confidence Rules

1. No source means no `high` confidence.
2. `inferred` evidence cannot become an ownership fact.
3. `unverified` evidence can only create questions.
4. `observed` evidence can update the evidence graph.
5. `conflict` evidence blocks readiness until resolved or scoped out.
6. Whole-repo claims require whole-repo evidence; MVP should avoid them.

## LLM Boundary

The LLM may:

- extract semantic evidence;
- propose boundary names;
- propose open questions;
- interpret a user attempt;
- propose smallest repair.

The LLM may not:

- mark readiness without a user attempt;
- claim ownership broader than evidence;
- declare dead code without verifier support;
- invent files, lines, tests, callers, or specs;
- treat its explanation as demonstrated user ownership.

## Slice 12 Runtime Evidence Report

`GeminiEvidenceProviderReport` expected by
`evaluateGeminiEvidenceReport`:

```ts
type GeminiEvidenceProviderReport = {
  schema: string; // "sibi-gemini-evidence-report.v1"
  provider_id: "gemini" | "gemini-first";
  generated_at: string; // ISO-8601 string
  run_id?: string;
  claims: Array<{
    claim_id: string;
    kind: string; // ownership_fact | observation | question | readiness (readiness rejected)
    confidence: "observed" | "inferred" | "unverified" | "conflict";
    statement: string;
    citations?: Array<{
      file_path: string;
      start_line: number;
      end_line: number;
      symbol?: string;
    }>;
  }>;
  proposed_questions?: string[];
};
```

Evaluation rules for Slice 12:

- Report schema and provider ids are validated before evaluation.
- A report with invented files, out-of-range lines, or invalid symbol references is
  rejected.
- `inferred` ownership facts and `readiness` claims are never auto-accepted as
  ownership mutations; they are downgraded or rejected.
- Unsupported kinds are downgraded when syntax is otherwise valid.
- Evidence dispositions are `verified` / `downgraded` / `rejected`.
- An output is tentative while any claim is pending or downgraded; only fully
  verified evidence can clear tentative status.

## Later Specialization

Introduce language-specific analyzers only after repeated product failures:

- TypeScript: `ts-morph` or TypeScript Compiler API.
- Python: built-in `ast`.
- Rust: `cargo metadata` / rust-analyzer.
- Go: `go/parser`.

Parser adoption must replace a painful weak signal, not precede product proof.
