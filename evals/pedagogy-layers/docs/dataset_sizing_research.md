# Dataset Sizing Research

## question

What pilot and scale dataset sizes should Sibi use for pedagogy and boundary
evals before claiming benchmark-quality results?

## sources_or_prior_art

- Anthropic, "Define success criteria and build evaluations":
  https://platform.claude.com/docs/en/test-and-evaluate/develop-tests
  - Relevant guidance: evals should be task-specific, cover edge cases, be
    automatable when possible, and use the fastest reliable grading method.
- Anthropic, "Demystifying evals for AI agents":
  https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
  - Relevant guidance: an eval task has defined inputs and success criteria;
    model outputs vary, so multiple trials improve consistency; early agent
    eval datasets can start with 20-50 simple tasks; balanced problem sets
    should include both behavior-triggering and behavior-rejecting cases.
- Anthropic, "A statistical approach to model evaluations":
  https://www.anthropic.com/research/statistical-approach-to-model-evals
  - Relevant guidance: report standard errors and confidence intervals, cluster
    related questions when cases share a source artifact, use paired differences
    for model comparisons, and use power analysis to size evals for the effect
    size worth detecting.
- NIST/SEMATECH e-Handbook, "Sample sizes required":
  https://www.itl.nist.gov/div898/handbook/prc/section2/prc242.htm
  - Relevant guidance: sample size for proportion testing depends on the
    detectable change, significance, and power; the normal approximation is a
    planning tool for binomial outcomes.
- NIST/SEMATECH e-Handbook, "Confidence intervals":
  https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm
  - Relevant guidance: Wilson-style proportion intervals are better behaved
    than the simplest symmetric approximation, and exact binomial methods matter
    for small samples or rare failures.
- NIST AI RMF Core, "Measure":
  https://airc.nist.gov/airmf-resources/airmf/5-sec-core/
  - Relevant guidance: rigorous AI measurement should include uncertainty,
    benchmark comparisons, and formal reporting.
- Hugging Face Evaluate, "Using the evaluator":
  https://huggingface.co/docs/evaluate/base_evaluator
  - Relevant guidance: evaluators can report bootstrap confidence intervals and
    standard errors; example QA evaluation uses a 1,000-row slice for interval
    reporting.

## benchmark_quality_goal

For Sibi v0.1, benchmark quality means the dataset can support regression and
model-comparison claims about:

- pedagogy layer classification across L1-L5;
- correct, partial, uncertain, wrong, and under-evidenced answers;
- gap, misconception, challenge, memory, and readiness expectations;
- boundary rejection for excluded and outside-root evidence;
- rejection of overconfident model candidate signals;
- paired comparison of Codex `gpt-5.2 medium` and Codex `gpt-5.5 low` on the
  same cases without letting either model decide truth.

The initial E01 pilot is a contract smoke set. It proves case shape and coverage,
but it is not benchmark quality.

E03 uses the same 7-case contract seed for fixture-based LLM+runtime trace
comparison only. Its report may compare accepted/rejected candidate signals for
Codex `gpt-5.2 medium` and Codex `gpt-5.5 low`, but that comparison is a
development trace check, not a benchmark-quality model ranking.

## pilot_dataset_size

Use a 35-case pilot before E02 is considered mature:

- 5 pedagogy layers x 7 required case classes = 35 cases.
- Each case should remain manually inspectable and deterministic.
- The current E01 dataset seeds 7 cases, one per required case class, and covers
  all L1-L5 layers at least once. That is enough for contract validation only.
- The next pilot expansion should add four more layer-balanced passes so each
  required class appears at each layer once.

This aligns with the external 20-50 task starting range for early agent evals
while preserving Sibi-specific stratification.

## scale_dataset_size

Use a 210-case scale dataset before making benchmark-quality quality claims:

- 5 layers x 7 required case classes x 3 artifact families x 2 scenario
  variants = 210 cases.
- Artifact families should include runtime command flow, pedagogy memory flow,
  and readiness/boundary flow.
- Scenario variants should include a straightforward case and an adversarial or
  ambiguous-near-boundary case.
- For LLM trace evals, run both required model configurations on the exact same
  210 cases. For nondeterministic live traces, sample at least 3 trials on the
  highest-risk 70-case subset before interpreting model differences.

This scale is a pragmatic v0.1 target. It is large enough to estimate aggregate
binary pass rates with useful uncertainty bands and to inspect failures by
stratum, but small enough for local deterministic runs and reviewable trace
artifacts.

Treat the 210-case recommendation as the first target for reporting uncertainty
bands and detecting meaningful regression-sized changes, not as proof of public
benchmark quality by itself. The 7-case seed remains a path/schema/class
contract check only.

## stratification_plan

Stratify by:

- layer: L1, L2, L3, L4, L5;
- case class: correct, partial, declared uncertainty, wrong misconception,
  missing evidence, boundary violation, overconfident LLM output;
- artifact family: runtime boundary/persistence, pedagogy gap/practice/memory,
  readiness/evidence index;
- expected outcome: accepted, repaired, rejected;
- evidence condition: required citation present, required citation missing,
  excluded citation, outside-root citation;
- model behavior for E03: useful cited candidate, uncited claim, forbidden
  citation, overconfident readiness claim, schema drift.

Avoid one-sided datasets. Every behavior Sibi should trigger needs paired cases
where it should refuse, defer, or downgrade.

## confidence_or_variance_rationale

Most Sibi E02 deterministic outcomes are binary assertions: pass or fail a
schema, boundary, evidence, gap, challenge, memory, or readiness expectation.
For aggregate proportions, uncertainty should be reported with Wilson or exact
binomial intervals rather than only point estimates, especially in small pilots.

A 35-case pilot can catch obvious contract and regression failures, but its
intervals are too wide for benchmark claims. A 210-case scale set gives a more
useful aggregate signal and enough per-stratum examples to identify systematic
failures. Because many cases share the same mini artifact, variance estimates
should cluster by artifact family when reporting benchmark results.

For E03 model comparison, use paired analysis because both model configurations
run on the same case ids. Report paired differences, standard errors,
confidence intervals, and qualitative failure modes. If live model outputs vary,
repeat selected high-risk cases and average per-case outcomes before aggregate
comparison.

## cost_runtime_tradeoff

- 7 cases: fastest contract smoke; suitable for validating schema/index only;
  no quality claim.
- 35 cases: suitable local pilot; catches missing strata and obvious regressions;
  still weak for aggregate benchmark claims.
- 210 cases: suitable first benchmarkable v0.1 dataset; deterministic runs should
  remain cheap, while LLM trace runs become intentional batch jobs.
- 210 cases x 2 models x 1 trial is the minimum model comparison pass. Adding 3
  trials for a 70-case high-risk subset costs another 420 model attempts, so this
  should be scheduled only after deterministic E02 validation is stable.

The dataset should grow by adding strata and artifacts, not by duplicating
near-identical cases over one source file.

## recommendation

Accept the E01 7-case dataset only as the canonical contract seed for
VAL-EVAL-001. Before E02 claims mature deterministic eval coverage, expand to a
35-case layer-by-class pilot. Before Sibi claims benchmark-quality model or
pedagogy results, expand to the 210-case stratified dataset, report uncertainty
intervals, cluster by artifact family, and use paired analysis for model
comparisons.
