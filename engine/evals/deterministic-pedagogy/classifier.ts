import type { AnswerQuality } from "../../pedagogy/index.ts";
import type { EvalCase } from "./types.ts";

export function qualityFor(testCase: EvalCase): AnswerQuality {
  if (testCase.case_class === "correct_answer") return "verified";
  if (testCase.case_class === "wrong_misconception" || testCase.case_class === "boundary_violation") {
    return "gap_confirmed";
  }
  if (testCase.case_class === "declared_uncertainty") return "uncertainty_declared";
  return "partial";
}

export function classifyLayer(testCase: EvalCase): number {
  if (testCase.llm_fixture_response) {
    return testCase.llm_fixture_response.candidate_signals.some((signal) => /ready to own|ownership|end to end/i.test(signal.claim))
      ? 5
      : 1;
  }

  const answer = testCase.user_answer.text.toLowerCase();
  if (testCase.user_answer.kind === "declared_uncertainty" || /i don't know|not sure|cannot explain/.test(answer)) {
    return 1;
  }
  if (/forbidden|private-notes|excluded|outside/.test(answer)) return 4;
  if (/only lives in the current request|no persisted state|contradict/.test(answer)) return 3;
  if (/cannot point to the files|cannot cite|without citations|lacks evidence/.test(answer)) return 3;
  if (/probably|later/.test(answer) && answer.length < 90) return 2;
  if (/because|boundary|flow|risk|stores|reload|persists|normalizes/.test(answer) && answer.length > 100) return 4;
  return 2;
}
