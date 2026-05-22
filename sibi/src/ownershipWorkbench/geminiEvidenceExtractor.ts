import type { EvidenceConfidence, EvidenceRef } from "./types";

export type GeminiEvidenceProviderId = "gemini" | "gemini-first";

export const GEMINI_EVIDENCE_REPORT_SCHEMA = "sibi-gemini-evidence-report.v1";
export const GEMINI_PROVIDER_IDS = ["gemini", "gemini-first"] as const;

export type GeminiEvidenceDisposition = "verified" | "downgraded" | "rejected" | "proposed_questions";

type GeminiClaimDisposition = "verified" | "downgraded" | "rejected";

export interface EvidenceProviderAdapter {
  id: GeminiEvidenceProviderId;
  label: string;
  schema: string;
  executionEnabledByDefault: boolean;
}

export interface GeminiEvidenceCitation {
  file_path: string;
  start_line: number;
  end_line: number;
  symbol?: string;
}

export interface GeminiEvidenceReportClaim {
  claim_id: string;
  kind: string;
  confidence: EvidenceConfidence;
  statement: string;
  citations?: GeminiEvidenceCitation[];
}

export interface GeminiEvidenceProviderReport {
  schema: string;
  provider_id: GeminiEvidenceProviderId;
  generated_at: string;
  run_id?: string;
  claims: GeminiEvidenceReportClaim[];
  proposed_questions?: string[];
}

export interface ValidatedEvidenceClaim {
  claimId: string;
  statement: string;
  kind: string;
  confidence: EvidenceConfidence;
  disposition: GeminiClaimDisposition;
  reasons: string[];
  evidenceRefs: EvidenceRef[];
  canUpdateOwnershipFacts: boolean;
}

export interface GeminiEvidenceExtractionResult {
  providerId: GeminiEvidenceProviderId;
  providerLabel: string;
  schema: string;
  reportGeneratedAt: string;
  overallDisposition: GeminiEvidenceDisposition;
  isTentative: boolean;
  verifiedClaims: ValidatedEvidenceClaim[];
  downgradedClaims: ValidatedEvidenceClaim[];
  rejectedClaims: ValidatedEvidenceClaim[];
  proposedQuestions: string[];
  schemaValidationErrors: string[];
}

export interface DemoGeminiEvidenceOptions {
  selectedFile?: string;
}

const VALID_CLAIM_KINDS = ["ownership_fact", "observation", "question", "readiness"] as const;
const VALID_CONFIDENCE: EvidenceConfidence[] = ["observed", "inferred", "unverified", "conflict"];

const ADAPTERS: Record<GeminiEvidenceProviderId, EvidenceProviderAdapter> = {
  gemini: {
    id: "gemini",
    label: "Gemini",
    schema: GEMINI_EVIDENCE_REPORT_SCHEMA,
    executionEnabledByDefault: false,
  },
  "gemini-first": {
    id: "gemini-first",
    label: "Gemini-first",
    schema: GEMINI_EVIDENCE_REPORT_SCHEMA,
    executionEnabledByDefault: false,
  },
};

function hash32(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function makeDeterministicTimestamp(seed: string): string {
  const baseMs = 1_700_000_000_000;
  const offsetMs = hash32(seed) % 1_000;
  return new Date(baseMs + offsetMs).toISOString();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}

function nonEmptyString(value: unknown, label: string, errors: string[]): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`Expected non-empty string for ${label}.`);
    return null;
  }
  return value.trim();
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isEvidenceConfidence(value: unknown): value is EvidenceConfidence {
  return typeof value === "string" && VALID_CONFIDENCE.includes(value as EvidenceConfidence);
}

function parseClaimKind(value: unknown, label: string, errors: string[]): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`Expected non-empty string for ${label}.`);
    return null;
  }

  return value.trim();
}

function parseReport(input: unknown): { report: GeminiEvidenceProviderReport | null; errors: string[] } {
  const errors: string[] = [];

  if (!isObject(input)) {
    return {
      report: null,
      errors: ["Expected report object."],
    };
  }

  const schema = nonEmptyString(input.schema, "schema", errors);
  const providerId = nonEmptyString(input.provider_id, "provider_id", errors);
  const generatedAt = nonEmptyString(input.generated_at, "generated_at", errors);

  if (schema != null && schema !== GEMINI_EVIDENCE_REPORT_SCHEMA) {
    errors.push(`Unsupported schema '${schema}', expected '${GEMINI_EVIDENCE_REPORT_SCHEMA}'.`);
  }

  if (providerId != null && !GEMINI_PROVIDER_IDS.includes(providerId as GeminiEvidenceProviderId)) {
    errors.push(`Unsupported provider_id '${providerId}'.`);
  }

  if (generatedAt != null && Number.isNaN(Date.parse(generatedAt))) {
    errors.push("generated_at must be an ISO-8601 timestamp.");
  }

  if (!Array.isArray(input.claims)) {
    errors.push("Expected claims array.");
    return {
      report: null,
      errors,
    };
  }

  const claims: GeminiEvidenceProviderReport["claims"] = [];

  for (const [index, rawClaim] of input.claims.entries()) {
    if (!isObject(rawClaim)) {
      errors.push(`claims[${index}] must be an object.`);
      continue;
    }

    const claimId = nonEmptyString(rawClaim.claim_id, `claims[${index}].claim_id`, errors);
    const kind = parseClaimKind(rawClaim.kind, `claims[${index}].kind`, errors);
    const statement = nonEmptyString(rawClaim.statement, `claims[${index}].statement`, errors);
    const confidence = rawClaim.confidence;
    if (!isEvidenceConfidence(confidence)) {
      errors.push(`claims[${index}].confidence must be one of: ${VALID_CONFIDENCE.join(", ")}.`);
      continue;
    }

    const citationSource = rawClaim.citations;
    let citations: GeminiEvidenceCitation[] | undefined;
    if (citationSource != null) {
      if (!Array.isArray(citationSource)) {
        errors.push(`claims[${index}].citations must be an array when present.`);
      } else {
        citations = citationSource
          .map((rawCitation, citationIndex) => {
            if (!isObject(rawCitation)) {
              errors.push(
                `claims[${index}].citations[${citationIndex}] must be an object.`,
              );
              return null;
            }

            const filePath = nonEmptyString(rawCitation.file_path, `claims[${index}].citations[${citationIndex}].file_path`, errors);
            const startLine = rawCitation.start_line;
            const endLine = rawCitation.end_line;
            if (!isPositiveInteger(startLine) || !isPositiveInteger(endLine) || startLine > endLine) {
              errors.push(
                `claims[${index}].citations[${citationIndex}] must include positive integer start_line/end_line with start <= end.`,
              );
              return null;
            }

            const symbolValue = nonEmptyString(rawCitation.symbol, `claims[${index}].citations[${citationIndex}].symbol`, []);
            return {
              file_path: filePath ?? "",
              start_line: startLine,
              end_line: endLine,
              symbol: symbolValue ?? undefined,
            };
          })
          .filter((entry): entry is GeminiEvidenceCitation => entry != null);
      }
    }

    if (claimId == null || kind == null || statement == null) {
      continue;
    }

    claims.push({
      claim_id: claimId,
      kind,
      confidence,
      statement,
      citations,
    });
  }

  const proposedQuestions: string[] = [];
  if (input.proposed_questions != null) {
    if (!Array.isArray(input.proposed_questions)) {
      errors.push("proposed_questions must be an array of strings.");
    } else {
      for (const [index, question] of input.proposed_questions.entries()) {
        const value = nonEmptyString(question, `proposed_questions[${index}]`, errors);
        if (value != null) {
          proposedQuestions.push(value);
        }
      }
    }
  }

  if (schema == null || providerId == null || generatedAt == null) {
    return {
      report: null,
      errors,
    };
  }

  return {
    report: {
      schema,
      provider_id: providerId as GeminiEvidenceProviderId,
      generated_at: generatedAt,
      claims,
      run_id: nonEmptyString(input.run_id, "run_id", []),
      proposed_questions: proposedQuestions,
    },
    errors,
  };
}

function buildEvidenceRef(
  claimId: string,
  citation: GeminiEvidenceCitation,
  confidence: EvidenceConfidence,
): EvidenceRef {
  return {
    id: `${claimId}:${citation.file_path}:${citation.start_line}-${citation.end_line}`,
    title: `Evidence citation for ${claimId}`,
    detail: `symbol verification: ${citation.symbol ?? "no-symbol"}`,
    location: `${citation.file_path}:${citation.start_line}-${citation.end_line}`,
    confidence,
  };
}

function verifyCitation(citation: GeminiEvidenceCitation, fileContents: Record<string, string>): string[] {
  const reasons: string[] = [];

  const source = fileContents[citation.file_path];
  if (source == null) {
    reasons.push(`Invented file '${citation.file_path}' cannot be verified.`);
    return reasons;
  }

  const lines = source.split("\n");
  if (citation.start_line > lines.length || citation.end_line > lines.length) {
    reasons.push(`Line range ${citation.start_line}-${citation.end_line} out of bounds for '${citation.file_path}'.`);
    return reasons;
  }

  if (citation.end_line > 0 && citation.start_line > citation.end_line) {
    reasons.push(`Invalid line order for ${citation.file_path}: start_line > end_line.`);
    return reasons;
  }

  if (citation.symbol != null && citation.symbol.length > 0) {
    const excerpt = lines.slice(citation.start_line - 1, citation.end_line).join("\n");
    const escaped = citation.symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const expression = new RegExp(`\\b${escaped}\\b`);
    if (!expression.test(excerpt)) {
      reasons.push(`symbol '${citation.symbol}' not present in ${citation.file_path}:${citation.start_line}-${citation.end_line}.`);
    }
  }

  return reasons;
}

function isFatalCitationError(error: string): boolean {
  return error.startsWith("Invented file") || error.includes("out of bounds");
}

function buildValidatedClaim(
  input: {
    claim: GeminiEvidenceReportClaim;
    reasons: string[];
    evidenceRefs: EvidenceRef[];
    canUpdateOwnershipFacts: boolean;
    disposition: GeminiClaimDisposition;
  },
): ValidatedEvidenceClaim {
  return {
    claimId: input.claim.claim_id,
    statement: input.claim.statement,
    kind: input.claim.kind,
    confidence: input.claim.confidence,
    disposition: input.disposition,
    reasons: input.reasons,
    evidenceRefs: input.evidenceRefs,
    canUpdateOwnershipFacts: input.canUpdateOwnershipFacts,
  };
}

export function getGeminiEvidenceProviderAdapter(providerId: string): EvidenceProviderAdapter | null {
  return (providerId === "gemini" || providerId === "gemini-first") ? ADAPTERS[providerId] : null;
}

export function buildGeminiEvidenceLabReport(options: DemoGeminiEvidenceOptions = {}): GeminiEvidenceProviderReport {
  const selectedFile = options.selectedFile ?? "src/api/session.ts";
  const reportSeed = `slice12-lab-${selectedFile}`;

  return {
    schema: GEMINI_EVIDENCE_REPORT_SCHEMA,
    provider_id: "gemini-first",
    generated_at: makeDeterministicTimestamp(reportSeed),
    run_id: `slice12-lab-${hash32(selectedFile)}`,
    claims: [
      {
        claim_id: "claim-verified-fact",
        kind: "ownership_fact",
        confidence: "observed",
        statement: "createSession may return null for 204 and callers must handle the null contract explicitly.",
        citations: [
          {
            file_path: selectedFile,
            start_line: 1,
            end_line: 14,
            symbol: "createSession",
          },
        ],
      },
      {
        claim_id: "claim-inferred-fact",
        kind: "ownership_fact",
        confidence: "inferred",
        statement: "The same pattern can be inferred in other session factories through this shape.",
        citations: [
          {
            file_path: selectedFile,
            start_line: 3,
            end_line: 3,
            symbol: "createSession",
          },
        ],
      },
      {
        claim_id: "claim-question-1",
        kind: "question",
        confidence: "unverified",
        statement: "Do all callers block privileged work after null?",
      },
    ],
    proposed_questions: [
      "Can we prove `if (!session)` is always checked before privileged code in all callers?",
    ],
  };
}

export function evaluateGeminiEvidenceReport(input: {
  fileContents: Record<string, string>;
  report: unknown;
  providerAdapter: EvidenceProviderAdapter;
}): GeminiEvidenceExtractionResult {
  const parsed = parseReport(input.report);

  if (parsed.report == null || parsed.errors.length > 0) {
    return {
      providerId: input.providerAdapter.id,
      providerLabel: input.providerAdapter.label,
      schema: GEMINI_EVIDENCE_REPORT_SCHEMA,
      reportGeneratedAt: "",
      overallDisposition: "rejected",
      isTentative: true,
      verifiedClaims: [],
      downgradedClaims: [],
      rejectedClaims: [
        {
          claimId: "schema",
          statement: "Provider report failed schema validation.",
          kind: "schema",
          confidence: "conflict",
          disposition: "rejected",
          reasons: parsed.errors,
          evidenceRefs: [],
          canUpdateOwnershipFacts: false,
        },
      ],
      proposedQuestions: [],
      schemaValidationErrors: parsed.errors,
    };
  }

  const report = parsed.report;
  if (report.provider_id !== input.providerAdapter.id) {
    return {
      providerId: input.providerAdapter.id,
      providerLabel: input.providerAdapter.label,
      schema: report.schema,
      reportGeneratedAt: report.generated_at,
      overallDisposition: "rejected",
      isTentative: true,
      verifiedClaims: [],
      downgradedClaims: [],
      rejectedClaims: [
        {
          claimId: "provider_id",
          statement: `Provider id '${report.provider_id}' does not match expected '${input.providerAdapter.id}'.`,
          kind: "schema",
          confidence: "conflict",
          disposition: "rejected",
          reasons: [
            `Provider id mismatch: expected ${input.providerAdapter.id} but got ${report.provider_id}.`,
          ],
          evidenceRefs: [],
          canUpdateOwnershipFacts: false,
        },
      ],
      proposedQuestions: [...(report.proposed_questions ?? [])],
      schemaValidationErrors: [],
    };
  }

  const verified: ValidatedEvidenceClaim[] = [];
  const downgraded: ValidatedEvidenceClaim[] = [];
  const rejected: ValidatedEvidenceClaim[] = [];
  const proposedQuestions = new Set<string>(report.proposed_questions ?? []);

  for (const claim of report.claims) {
    const reasons: string[] = [];
    const evidenceRefs: EvidenceRef[] = [];

    if (claim.kind === "question") {
      if (claim.statement.trim().length > 0) {
        proposedQuestions.add(claim.statement);
      }
      continue;
    }

    if (claim.kind === "readiness") {
      rejected.push(
        buildValidatedClaim({
          claim,
          reasons: ["Provider output cannot propose or update readiness from evidence extraction."],
          evidenceRefs: [],
          canUpdateOwnershipFacts: false,
          disposition: "rejected",
        }),
      );
      continue;
    }

    if (!VALID_CLAIM_KINDS.includes(claim.kind as (typeof VALID_CLAIM_KINDS)[number])) {
      downgraded.push(
        buildValidatedClaim({
          claim,
          reasons: [
            `Unsupported claim kind '${claim.kind}'. Supported kinds are ${VALID_CLAIM_KINDS.join(", ")}.`,
          ],
          evidenceRefs: [],
          canUpdateOwnershipFacts: false,
          disposition: "downgraded",
        }),
      );
      continue;
    }

    if ((claim.citations == null || claim.citations.length === 0) && claim.kind !== "question") {
      downgraded.push(
        buildValidatedClaim({
          claim,
          reasons: ["Evidence claims require at least one citation."],
          evidenceRefs: [],
          canUpdateOwnershipFacts: false,
          disposition: "downgraded",
        }),
      );
      continue;
    }

    const citationErrors: string[] = [];
    for (const citation of claim.citations ?? []) {
      const citationValidationErrors = verifyCitation(citation, input.fileContents);
      citationErrors.push(...citationValidationErrors);

      if (citationValidationErrors.some(isFatalCitationError)) {
        continue;
      }

      if (input.fileContents[citation.file_path] != null) {
        evidenceRefs.push(buildEvidenceRef(claim.claim_id, citation, claim.confidence));
      }
    }

    if (
      citationErrors.some(isFatalCitationError)
    ) {
      rejected.push(
        buildValidatedClaim({
          claim,
          reasons: citationErrors,
          evidenceRefs,
          canUpdateOwnershipFacts: false,
          disposition: "rejected",
        }),
      );
      continue;
    }

    if (citationErrors.length > 0) {
      downgraded.push(
        buildValidatedClaim({
          claim,
          reasons: citationErrors,
          evidenceRefs,
          canUpdateOwnershipFacts: false,
          disposition: "downgraded",
        }),
      );
      continue;
    }

    if (claim.confidence !== "observed") {
      downgraded.push(
        buildValidatedClaim({
          claim,
          reasons: [
            `Inference from '${claim.kind}' claim cannot update ownership facts with confidence '${claim.confidence}'.`,
          ],
          evidenceRefs,
          canUpdateOwnershipFacts: false,
          disposition: "downgraded",
        }),
      );
      continue;
    }

    verified.push(
      buildValidatedClaim({
        claim,
        reasons: [],
        evidenceRefs,
        canUpdateOwnershipFacts: claim.kind === "ownership_fact",
        disposition: "verified",
      }),
    );
  }

  const proposedQuestionsList = [...proposedQuestions];
  const overallDisposition: GeminiEvidenceDisposition =
    rejected.length > 0
      ? "rejected"
      : downgraded.length > 0
        ? "downgraded"
        : verified.length > 0
          ? "verified"
          : proposedQuestionsList.length > 0
            ? "proposed_questions"
            : "rejected";
  const isTentative = overallDisposition !== "verified";

  return {
    providerId: input.providerAdapter.id,
    providerLabel: input.providerAdapter.label,
    schema: report.schema,
    reportGeneratedAt: report.generated_at,
    overallDisposition,
    isTentative,
    verifiedClaims: verified,
    downgradedClaims: downgraded,
    rejectedClaims: rejected,
    proposedQuestions: proposedQuestionsList,
    schemaValidationErrors: [],
  };
}
