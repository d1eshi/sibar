import type { WorkspaceSource } from "../../state/workspaceProjection";

export const jaxThinkingInJaxSourceUrl =
  "https://docs.jax.dev/en/latest/notebooks/thinking_in_jax.html";

export const jaxThinkingInJaxScrapedAt = "2026-05-31";

export const jaxThinkingInJaxSources: readonly WorkspaceSource[] = [
  {
    id: "thinking-in-jax-overview",
    title: "Quickstart overview",
    type: "paper",
    metadata: `Scraped HTML section from ${jaxThinkingInJaxSourceUrl}`,
    snippet: "JAX quickstart, array computation, autodiff, JIT, vectorization.",
    body: [
      "JAX is presented as a library for array-oriented numerical computation with automatic differentiation and JIT compilation for high-performance machine learning research.",
      "The quickstart frames JAX as a NumPy-like interface for computations that can run on CPU, GPU, or TPU in local or distributed settings.",
      "The source names four early capabilities to understand first: JIT compilation, gradients, automatic vectorization, and explicit pseudo-random keys.",
    ],
  },
  {
    id: "thinking-in-jax-installation",
    title: "Installation",
    type: "code",
    metadata: `Scraped HTML section from ${jaxThinkingInJaxSourceUrl}#installation`,
    snippet: "CPU and NVIDIA GPU installation commands.",
    body: [
      "JAX can be installed for CPU on Linux, Windows, and macOS from Python Package Index.",
      "pip install jax",
      "For NVIDIA GPU installs, the source shows the CUDA extra.",
      'pip install -U "jax[cuda13]"',
    ],
  },
  {
    id: "thinking-in-jax-numpy",
    title: "JAX vs. NumPy",
    type: "paper",
    metadata: `Scraped HTML section from ${jaxThinkingInJaxSourceUrl}#jax-vs-numpy`,
    snippet: "NumPy-like API, duck typing, immutable JAX arrays.",
    body: [
      "JAX provides a NumPy-inspired interface through jax.numpy, which is commonly imported as jnp.",
      "JAX arrays can often be used as drop-in replacements for NumPy arrays through Python duck typing.",
      "The important early difference is mutability: JAX arrays are immutable and updates return a changed copy through indexed update syntax.",
      "The source uses x.at[0].set(10) as the replacement for in-place assignment.",
    ],
  },
  {
    id: "thinking-in-jax-array",
    title: "JAX arrays",
    type: "paper",
    metadata: `Scraped HTML section from ${jaxThinkingInJaxSourceUrl}#jax-arrays-jax-array`,
    snippet: "Array creation, devices, and sharding.",
    body: [
      "The default array implementation in JAX is jax.Array.",
      "Users typically create arrays with API functions such as jax.numpy.zeros, jax.numpy.linspace, and jax.numpy.arange rather than calling the constructor directly.",
      "JAX array objects expose device placement, and arrays can be sharded across multiple devices for parallel computation.",
    ],
  },
  {
    id: "thinking-in-jax-jit",
    title: "Just-in-time compilation",
    type: "code",
    metadata: `Scraped HTML section from ${jaxThinkingInJaxSourceUrl}#just-in-time-compilation-with-jax-jit`,
    snippet: "jax.jit compiles operation sequences through XLA.",
    body: [
      "By default, JAX executes operations one at a time in sequence.",
      "The jax.jit transformation can compile a sequence of operations together so the compiler can optimize and run them as one staged computation.",
      "The source's first example normalizes the rows of a 2D matrix and then creates a compiled version with jit(norm).",
      "JIT has limits: array shapes generally need to be static and known at compile time.",
    ],
  },
  {
    id: "thinking-in-jax-grad-vmap",
    title: "grad and vmap",
    type: "code",
    metadata: `Scraped HTML sections from ${jaxThinkingInJaxSourceUrl}#taking-derivatives-with-jax-grad`,
    snippet: "Automatic differentiation and automatic vectorization.",
    body: [
      "JAX provides automatic differentiation through the jax.grad transformation.",
      "The source shows that grad and jit compose, so transformed functions can be mixed rather than treated as separate modes.",
      "JAX also provides automatic vectorization through jax.vmap.",
      "The vmap section explains that mapping a function along array axes can be transformed into a batch-aware version without writing an explicit Python loop.",
    ],
  },
  {
    id: "thinking-in-jax-random-debug",
    title: "Random keys and debugging",
    type: "note",
    metadata: `Scraped HTML sections from ${jaxThinkingInJaxSourceUrl}#pseudorandom-numbers`,
    snippet: "Explicit random keys, key splitting, runtime debug prints.",
    body: [
      "JAX uses explicit random keys instead of NumPy-style global random state.",
      "Random functions consume a key without mutating it; reusing the same key intentionally produces the same sample.",
      "The source's rule of thumb is to split keys before generating independent random samples.",
      "For debugging transformed code, Python print runs at trace time, while jax.debug.print can show runtime values inside JIT-compiled functions.",
    ],
  },
];
