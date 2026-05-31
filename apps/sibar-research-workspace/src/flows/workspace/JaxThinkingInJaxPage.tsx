import styles from "./jaxSourcePage.module.css";

const sourceUrl = "https://docs.jax.dev/en/latest/notebooks/thinking_in_jax.html";

const sourceSections = [
  "Installation",
  "JAX vs. NumPy",
  "JAX arrays (jax.Array)",
  "Just-in-time compilation with jax.jit",
  "Taking derivatives with jax.grad",
  "Auto-vectorization with jax.vmap",
  "Pseudorandom numbers",
  "Debugging",
];

const studySteps = [
  {
    title: "Read the JAX quickstart first",
    body:
      "Use this page to anchor the JAX tutorials part of the first step before adding broader scaling-system material.",
  },
  {
    title: "Capture source-backed takeaways",
    body:
      "Keep takeaways tied to the concrete tutorial sections: arrays, transformations, JIT, gradients, vectorization, random keys, and debugging.",
  },
  {
    title: "Then map to Scaling Book",
    body:
      "After the JAX quickstart is understood, connect the same computation model to the Scaling Book concepts separately.",
  },
];

export function JaxThinkingInJaxPage() {
  return (
    <main className={styles.sourcePage} data-route="jax-thinking-in-jax">
      <aside className={styles.sourceRail} aria-label="Source context">
        <p className={styles.eyebrow}>Concrete route</p>
        <h1>JAX tutorials and Scaling Book first step</h1>
        <p>
          A direct reading page for the official JAX quickstart, separate from
          mission briefs and study-session controls.
        </p>
        <a href={sourceUrl} target="_blank" rel="noreferrer">
          Open official source
        </a>
      </aside>

      <article className={styles.sourceArticle} aria-label="JAX quickstart reader">
        <header className={styles.articleHeader}>
          <p className={styles.eyebrow}>Official JAX docs</p>
          <h2>Quickstart: How to think in JAX</h2>
          <p>
            This source introduces JAX as NumPy-like array computation with
            automatic differentiation, JIT compilation, vectorization, and device
            execution for machine learning research.
          </p>
        </header>

        <section className={styles.sourceMeta} aria-label="Source metadata">
          <div>
            <span>Source URL</span>
            <strong>{sourceUrl}</strong>
          </div>
          <div>
            <span>Route</span>
            <strong>/jax/thinking-in-jax</strong>
          </div>
          <div>
            <span>Alias</span>
            <strong>/jax/tutorials-and-scaling-book-first-step</strong>
          </div>
        </section>

        <section className={styles.contentGrid} aria-label="Reading outline">
          <div className={styles.outlinePanel}>
            <p className={styles.eyebrow}>Page contents</p>
            <ol>
              {sourceSections.map((section) => (
                <li key={section}>{section}</li>
              ))}
            </ol>
          </div>

          <div className={styles.notePanel}>
            <p className={styles.eyebrow}>Why this page</p>
            <h3>Start with the mechanics before the scaling layer.</h3>
            <p>
              The frontier-lab first step mentions JAX tutorials and the Scaling
              Book. This route shows the JAX tutorial source directly so the user
              can inspect the first concrete document instead of landing in the
              generic mission/session UI.
            </p>
          </div>
        </section>

        <section className={styles.steps} aria-label="Study sequence">
          {studySteps.map((step, index) => (
            <article key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </section>

        <section className={styles.codeBlock} aria-label="First command">
          <p className={styles.eyebrow}>First command from the source</p>
          <pre>
            <code>pip install jax</code>
          </pre>
        </section>
      </article>
    </main>
  );
}
