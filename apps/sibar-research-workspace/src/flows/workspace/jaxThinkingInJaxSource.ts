export const jaxThinkingInJaxSourceUrl =
  "https://docs.jax.dev/en/latest/notebooks/thinking_in_jax.html";

export const jaxThinkingInJaxScrapedAt = "2026-05-31";
export const jaxThinkingInJaxScrapeSelector = "article.bd-article";

export type JaxThinkingInJaxSection = {
  id: string;
  title: string;
  level: 1 | 2 | 3;
  sourceRef: string;
};

export const jaxThinkingInJaxSections: readonly JaxThinkingInJaxSection[] = [
  {
    id: "quickstart-how-to-think-in-jax",
    title: "Quickstart: How to think in JAX",
    level: 1,
    sourceRef: "thinking-in-jax#quickstart-how-to-think-in-jax",
  },
  {
    id: "installation",
    title: "Installation",
    level: 2,
    sourceRef: "thinking-in-jax#installation",
  },
  {
    id: "jax-vs-numpy",
    title: "JAX vs. NumPy",
    level: 2,
    sourceRef: "thinking-in-jax#jax-vs-numpy",
  },
  {
    id: "jax-arrays-jax-array",
    title: "JAX arrays ( jax.Array )",
    level: 2,
    sourceRef: "thinking-in-jax#jax-arrays-jax-array",
  },
  {
    id: "array-creation",
    title: "Array creation",
    level: 3,
    sourceRef: "thinking-in-jax#array-creation",
  },
  {
    id: "array-devices-and-sharding",
    title: "Array devices and sharding",
    level: 3,
    sourceRef: "thinking-in-jax#array-devices-and-sharding",
  },
  {
    id: "just-in-time-compilation-with-jax-jit",
    title: "Just-in-time compilation with jax.jit",
    level: 2,
    sourceRef: "thinking-in-jax#just-in-time-compilation-with-jax-jit",
  },
  {
    id: "taking-derivatives-with-jax-grad",
    title: "Taking derivatives with jax.grad",
    level: 2,
    sourceRef: "thinking-in-jax#taking-derivatives-with-jax-grad",
  },
  {
    id: "auto-vectorization-with-jax-vmap",
    title: "Auto-vectorization with jax.vmap",
    level: 2,
    sourceRef: "thinking-in-jax#auto-vectorization-with-jax-vmap",
  },
  {
    id: "pseudorandom-numbers",
    title: "Pseudorandom numbers",
    level: 2,
    sourceRef: "thinking-in-jax#pseudorandom-numbers",
  },
  {
    id: "debugging",
    title: "Debugging",
    level: 2,
    sourceRef: "thinking-in-jax#debugging",
  },
  {
    id: "jax-debug-print",
    title: "jax.debug.print",
    level: 3,
    sourceRef: "thinking-in-jax#jax-debug-print",
  },
  {
    id: "debugging-flags",
    title: "Debugging flags",
    level: 3,
    sourceRef: "thinking-in-jax#debugging-flags",
  }
];

export const jaxThinkingInJaxHtml = String.raw`
<section id="quickstart-how-to-think-in-jax" class="tex2jax_ignore">
<h1 data-source-ref="thinking-in-jax#html-001">Quickstart: How to think in JAX<a class="headerlink" href="#quickstart-how-to-think-in-jax" title="Link to this heading">#</a></h1>

<p data-source-ref="thinking-in-jax#html-002"><a class="reference external" href="https://colab.research.google.com/github/jax-ml/jax/blob/main/docs/notebooks/thinking_in_jax.ipynb" target="_blank" rel="noreferrer"><img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open in Colab" data-source-ref="thinking-in-jax#html-003"></a> <a class="reference external" href="https://kaggle.com/kernels/welcome?src=https://github.com/jax-ml/jax/blob/main/docs/notebooks/thinking_in_jax.ipynb" target="_blank" rel="noreferrer"><img src="https://kaggle.com/static/images/open-in-kaggle.svg" alt="Open in Kaggle" data-source-ref="thinking-in-jax#html-004"></a></p>
<p data-source-ref="thinking-in-jax#html-005"><strong>JAX is a library for array-oriented numerical computation (<em>à la</em> <a class="reference external" href="https://numpy.org/" target="_blank" rel="noreferrer">NumPy</a>), with automatic differentiation and JIT compilation to enable high-performance machine learning research</strong>.</p>
<p data-source-ref="thinking-in-jax#html-006">This document provides a quick overview of essential JAX features, so you can get started with JAX:</p>
<ul class="simple" data-source-ref="thinking-in-jax#html-007">
<li><p data-source-ref="thinking-in-jax#html-008">JAX provides a unified NumPy-like interface to computations that run on CPU, GPU, or TPU, in local or distributed settings.</p></li>
<li><p data-source-ref="thinking-in-jax#html-009">JAX features built-in Just-In-Time (JIT) compilation via <a class="reference external" href="https://github.com/openxla" target="_blank" rel="noreferrer">Open XLA</a>, an open-source machine learning compiler ecosystem.</p></li>
<li><p data-source-ref="thinking-in-jax#html-010">JAX functions support efficient evaluation of gradients via its automatic differentiation transformations.</p></li>
<li><p data-source-ref="thinking-in-jax#html-011">JAX functions can be automatically vectorized to efficiently map them over arrays representing batches of inputs.</p></li>
</ul>
<section id="installation">
<h2 data-source-ref="thinking-in-jax#html-012">Installation<a class="headerlink" href="#installation" title="Link to this heading">#</a></h2>
<p data-source-ref="thinking-in-jax#html-013">JAX can be installed for CPU on Linux, Windows, and macOS directly from the <a class="reference external" href="https://pypi.org/project/jax/" target="_blank" rel="noreferrer">Python Package Index</a>:</p>
<div class="highlight-default notranslate" data-source-ref="thinking-in-jax#html-014"><div class="highlight" data-source-ref="thinking-in-jax#html-015"><pre data-source-ref="thinking-in-jax#html-016"><span></span><span>pip</span> <span>install</span> <span>jax</span>
</pre></div>
</div>
<p data-source-ref="thinking-in-jax#html-017">or, for NVIDIA GPU:</p>
<div class="highlight-default notranslate" data-source-ref="thinking-in-jax#html-018"><div class="highlight" data-source-ref="thinking-in-jax#html-019"><pre data-source-ref="thinking-in-jax#html-020"><span></span><span>pip</span> <span>install</span> <span>-</span><span>U</span> <span>&quot;jax[cuda13]&quot;</span>
</pre></div>
</div>
<p data-source-ref="thinking-in-jax#html-021">For more detailed platform-specific installation information, check out <a class="reference external" href="https://docs.jax.dev/en/latest/installation.html" target="_blank" rel="noreferrer">Installation</a>.</p>
</section>
<section id="jax-vs-numpy">
<h2 data-source-ref="thinking-in-jax#html-022">JAX vs. NumPy<a class="headerlink" href="#jax-vs-numpy" title="Link to this heading">#</a></h2>
<p data-source-ref="thinking-in-jax#html-023"><strong>Key concepts:</strong></p>
<ul class="simple" data-source-ref="thinking-in-jax#html-024">
<li><p data-source-ref="thinking-in-jax#html-025">JAX provides a NumPy-inspired interface for convenience.</p></li>
<li><p data-source-ref="thinking-in-jax#html-026">Through <a class="reference external" href="https://en.wikipedia.org/wiki/Duck_typing" target="_blank" rel="noreferrer">duck-typing</a>, JAX arrays can often be used as drop-in replacements of NumPy arrays.</p></li>
<li><p data-source-ref="thinking-in-jax#html-027">Unlike NumPy arrays, JAX arrays are always immutable.</p></li>
</ul>
<p data-source-ref="thinking-in-jax#html-028">NumPy provides a well-known, powerful API for working with numerical data. For convenience, JAX provides <a class="reference external" href="https://docs.jax.dev/en/latest/jax.numpy.html" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.numpy</span></code></a> which closely mirrors the NumPy API and provides easy entry into JAX. Almost anything that can be done with <code class="docutils literal notranslate"><span class="pre">numpy</span></code> can be done with <code class="docutils literal notranslate"><span class="pre">jax.numpy</span></code>, which is typically imported under the <code class="docutils literal notranslate"><span class="pre">jnp</span></code> alias:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-029">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-030">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-031"><div class="highlight" data-source-ref="thinking-in-jax#html-032"><pre data-source-ref="thinking-in-jax#html-033"><span></span><span>import</span><span> </span><span>jax.numpy</span><span> </span><span>as</span><span> </span><span>jnp</span>
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-034">With this import, you can immediately use JAX in a similar manner to typical NumPy programs, including using NumPy-style array creation functions, Python functions and operators, and array attributes and methods:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-035">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-036">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-037"><div class="highlight" data-source-ref="thinking-in-jax#html-038"><pre data-source-ref="thinking-in-jax#html-039"><span></span><span>import</span><span> </span><span>matplotlib.pyplot</span><span> </span><span>as</span><span> </span><span>plt</span>

<span>x_jnp</span> <span>=</span> <span>jnp</span><span>.</span><span>linspace</span><span>(</span><span>0</span><span>,</span> <span>10</span><span>,</span> <span>1000</span><span>)</span>
<span>y_jnp</span> <span>=</span> <span>2</span> <span>*</span> <span>jnp</span><span>.</span><span>sin</span><span>(</span><span>x_jnp</span><span>)</span> <span>*</span> <span>jnp</span><span>.</span><span>cos</span><span>(</span><span>x_jnp</span><span>)</span>
<span>plt</span><span>.</span><span>plot</span><span>(</span><span>x_jnp</span><span>,</span> <span>y_jnp</span><span>);</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-040">
<img src="https://docs.jax.dev/en/latest/_images/6444b12bde3d97af72e7d0ba8dc5562b0aceff09777821749bc4b6e563966ef8.png" alt="../_images/6444b12bde3d97af72e7d0ba8dc5562b0aceff09777821749bc4b6e563966ef8.png" data-source-ref="thinking-in-jax#html-041">
</div>
</div>
<p data-source-ref="thinking-in-jax#html-042">The code blocks are identical to what you would expect with NumPy, aside from replacing <code class="docutils literal notranslate"><span class="pre">np</span></code> with <code class="docutils literal notranslate"><span class="pre">jnp</span></code>, and the results are the same. As we can see, JAX arrays can often be used directly in place of NumPy arrays for things like plotting.</p>
<p data-source-ref="thinking-in-jax#html-043">The arrays themselves are implemented as different Python types:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-044">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-045">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-046"><div class="highlight" data-source-ref="thinking-in-jax#html-047"><pre data-source-ref="thinking-in-jax#html-048"><span></span><span>import</span><span> </span><span>numpy</span><span> </span><span>as</span><span> </span><span>np</span>
<span>import</span><span> </span><span>jax.numpy</span><span> </span><span>as</span><span> </span><span>jnp</span>

<span>x_np</span> <span>=</span> <span>np</span><span>.</span><span>linspace</span><span>(</span><span>0</span><span>,</span> <span>10</span><span>,</span> <span>1000</span><span>)</span>
<span>x_jnp</span> <span>=</span> <span>jnp</span><span>.</span><span>linspace</span><span>(</span><span>0</span><span>,</span> <span>10</span><span>,</span> <span>1000</span><span>)</span>
</pre></div>
</div>
</div>
</div>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-049">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-050">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-051"><div class="highlight" data-source-ref="thinking-in-jax#html-052"><pre data-source-ref="thinking-in-jax#html-053"><span></span><span>type</span><span>(</span><span>x_np</span><span>)</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-054">
<div class="output text_plain highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-055"><div class="highlight" data-source-ref="thinking-in-jax#html-056"><pre data-source-ref="thinking-in-jax#html-057"><span></span>numpy.ndarray
</pre></div>
</div>
</div>
</div>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-058">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-059">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-060"><div class="highlight" data-source-ref="thinking-in-jax#html-061"><pre data-source-ref="thinking-in-jax#html-062"><span></span><span>type</span><span>(</span><span>x_jnp</span><span>)</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-063">
<div class="output text_plain highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-064"><div class="highlight" data-source-ref="thinking-in-jax#html-065"><pre data-source-ref="thinking-in-jax#html-066"><span></span>jaxlib._jax.ArrayImpl
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-067">Python’s duck-typing allows JAX arrays and NumPy arrays to be used interchangeably in many places. However, there is one important difference between JAX and NumPy arrays: JAX arrays are immutable, meaning that once created their contents cannot be changed.</p>
<p data-source-ref="thinking-in-jax#html-068">Here is an example of mutating an array in NumPy:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-069">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-070">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-071"><div class="highlight" data-source-ref="thinking-in-jax#html-072"><pre data-source-ref="thinking-in-jax#html-073"><span></span><span># NumPy: mutable arrays</span>
<span>x</span> <span>=</span> <span>np</span><span>.</span><span>arange</span><span>(</span><span>10</span><span>)</span>
<span>x</span><span>[</span><span>0</span><span>]</span> <span>=</span> <span>10</span>
<span>print</span><span>(</span><span>x</span><span>)</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-074">
<div class="output stream highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-075"><div class="highlight" data-source-ref="thinking-in-jax#html-076"><pre data-source-ref="thinking-in-jax#html-077"><span></span>[10  1  2  3  4  5  6  7  8  9]
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-078">The equivalent in JAX results in an error, as JAX arrays are immutable:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-079">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-080">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-081"><div class="highlight" data-source-ref="thinking-in-jax#html-082"><pre data-source-ref="thinking-in-jax#html-083"><span></span><span>%</span><span>xmode</span> minimal
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-084">
<div class="output stream highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-085"><div class="highlight" data-source-ref="thinking-in-jax#html-086"><pre data-source-ref="thinking-in-jax#html-087"><span></span>Exception reporting mode: Minimal
</pre></div>
</div>
</div>
</div>
<div class="cell tag_raises-exception docutils container" data-source-ref="thinking-in-jax#html-088">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-089">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-090"><div class="highlight" data-source-ref="thinking-in-jax#html-091"><pre data-source-ref="thinking-in-jax#html-092"><span></span><span># JAX: immutable arrays</span>
<span>x</span> <span>=</span> <span>jnp</span><span>.</span><span>arange</span><span>(</span><span>10</span><span>)</span>
<span>x</span><span>[</span><span>0</span><span>]</span> <span>=</span> <span>10</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-093">
<div class="output traceback highlight-ipythontb notranslate" data-source-ref="thinking-in-jax#html-094"><div class="highlight" data-source-ref="thinking-in-jax#html-095"><pre data-source-ref="thinking-in-jax#html-096"><span></span><span>TypeError</span>: JAX arrays are immutable and do not support in-place item assignment. Instead of x[idx] = y, use x = x.at[idx].set(y) or another .at[] method: https://docs.jax.dev/en/latest/_autosummary/jax.numpy.ndarray.at.html
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-097">For updating individual elements, JAX provides an <a class="reference external" href="https://docs.jax.dev/en/latest/_autosummary/jax.numpy.ndarray.at.html#jax-numpy-ndarray-at" target="_blank" rel="noreferrer">indexed update syntax</a> that returns an updated copy:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-098">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-099">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-100"><div class="highlight" data-source-ref="thinking-in-jax#html-101"><pre data-source-ref="thinking-in-jax#html-102"><span></span><span>y</span> <span>=</span> <span>x</span><span>.</span><span>at</span><span>[</span><span>0</span><span>]</span><span>.</span><span>set</span><span>(</span><span>10</span><span>)</span>
<span>print</span><span>(</span><span>x</span><span>)</span>
<span>print</span><span>(</span><span>y</span><span>)</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-103">
<div class="output stream highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-104"><div class="highlight" data-source-ref="thinking-in-jax#html-105"><pre data-source-ref="thinking-in-jax#html-106"><span></span>[0 1 2 3 4 5 6 7 8 9]
[10  1  2  3  4  5  6  7  8  9]
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-107">You’ll find a few differences between JAX arrays and NumPy arrays once you begin digging in. See also:</p>
<ul class="simple" data-source-ref="thinking-in-jax#html-108">
<li><p data-source-ref="thinking-in-jax#html-109"><a class="reference external" href="https://docs.jax.dev/en/latest/key-concepts.html#jax-arrays-jax-array" target="_blank" rel="noreferrer">Key concepts</a> for an introduction to the key concepts of JAX, such as transformations, tracing, jaxprs and pytrees.</p></li>
<li><p data-source-ref="thinking-in-jax#html-110"><a class="reference external" href="https://docs.jax.dev/en/latest/notebooks/Common_Gotchas_in_JAX.html" target="_blank" rel="noreferrer">🔪 JAX - The Sharp Bits 🔪</a> for common gotchas when using JAX.</p></li>
</ul>
</section>
<section id="jax-arrays-jax-array">
<h2 data-source-ref="thinking-in-jax#html-111">JAX arrays (<code class="docutils literal notranslate"><span class="pre">jax.Array</span></code>)<a class="headerlink" href="#jax-arrays-jax-array" title="Link to this heading">#</a></h2>
<p data-source-ref="thinking-in-jax#html-112"><strong>Key concepts:</strong></p>
<ul class="simple" data-source-ref="thinking-in-jax#html-113">
<li><p data-source-ref="thinking-in-jax#html-114">Create arrays using JAX API functions.</p></li>
<li><p data-source-ref="thinking-in-jax#html-115">JAX array objects have a <code class="docutils literal notranslate"><span class="pre">devices</span></code> attribute that indicates where the array is stored.</p></li>
<li><p data-source-ref="thinking-in-jax#html-116">JAX arrays can be <em>sharded</em> across multiple devices for parallel computation.</p></li>
</ul>
<p data-source-ref="thinking-in-jax#html-117">The default array implementation in JAX is <a class="reference external" href="https://docs.jax.dev/en/latest/_autosummary/jax.Array.html#jax.Array" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.Array</span></code></a>. In many ways it is similar to
the <a class="reference external" href="https://numpy.org/doc/stable/reference/generated/numpy.ndarray.html#numpy.ndarray" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">numpy.ndarray</span></code></a> type that you may be familiar with from the NumPy package, but it
has some important differences.</p>
<section id="array-creation">
<h3 data-source-ref="thinking-in-jax#html-118">Array creation<a class="headerlink" href="#array-creation" title="Link to this heading">#</a></h3>
<p data-source-ref="thinking-in-jax#html-119">We typically don’t call the <code class="docutils literal notranslate"><span class="pre">jax.Array</span></code> constructor directly, but rather create arrays via JAX API functions.
For example, <a class="reference external" href="https://docs.jax.dev/en/latest/jax.numpy.html#module-jax.numpy" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.numpy</span></code></a> provides familiar NumPy-style array construction functionality
such as <code class="docutils literal notranslate"><span class="pre">jax.numpy.zeros</span></code>, <code class="docutils literal notranslate"><span class="pre">jax.numpy.linspace</span></code>, <code class="docutils literal notranslate"><span class="pre">jax.numpy.arange</span></code>, etc.</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-120">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-121">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-122"><div class="highlight" data-source-ref="thinking-in-jax#html-123"><pre data-source-ref="thinking-in-jax#html-124"><span></span><span>import</span><span> </span><span>jax</span>
<span>import</span><span> </span><span>jax.numpy</span><span> </span><span>as</span><span> </span><span>jnp</span>

<span>x</span> <span>=</span> <span>jnp</span><span>.</span><span>arange</span><span>(</span><span>5</span><span>)</span>
<span>isinstance</span><span>(</span><span>x</span><span>,</span> <span>jax</span><span>.</span><span>Array</span><span>)</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-125">
<div class="output text_plain highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-126"><div class="highlight" data-source-ref="thinking-in-jax#html-127"><pre data-source-ref="thinking-in-jax#html-128"><span></span>True
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-129">If you use Python type annotations in your code, <code class="docutils literal notranslate"><span class="pre">jax.Array</span></code> is the appropriate
annotation for jax array objects (see <a class="reference external" href="https://docs.jax.dev/en/latest/jax.typing.html#module-jax.typing" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.typing</span></code></a> for more discussion).</p>
</section>
<section id="array-devices-and-sharding">
<h3 data-source-ref="thinking-in-jax#html-130">Array devices and sharding<a class="headerlink" href="#array-devices-and-sharding" title="Link to this heading">#</a></h3>
<p data-source-ref="thinking-in-jax#html-131">JAX Array objects have a <code class="docutils literal notranslate"><span class="pre">devices</span></code> method that lets you inspect where the contents of the array are stored. In the simplest cases, this will be a single CPU device:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-132">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-133">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-134"><div class="highlight" data-source-ref="thinking-in-jax#html-135"><pre data-source-ref="thinking-in-jax#html-136"><span></span><span>x</span><span>.</span><span>devices</span><span>()</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-137">
<div class="output text_plain highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-138"><div class="highlight" data-source-ref="thinking-in-jax#html-139"><pre data-source-ref="thinking-in-jax#html-140"><span></span>{CpuDevice(id=0)}
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-141">In general, an array may be <a class="reference external" href="https://docs.jax.dev/en/latest/parallel.html" target="_blank" rel="noreferrer"><em>sharded</em></a> across multiple devices, in a manner that can be inspected via the <code class="docutils literal notranslate"><span class="pre">sharding</span></code> attribute:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-142">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-143">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-144"><div class="highlight" data-source-ref="thinking-in-jax#html-145"><pre data-source-ref="thinking-in-jax#html-146"><span></span><span>x</span><span>.</span><span>sharding</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-147">
<div class="output text_plain highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-148"><div class="highlight" data-source-ref="thinking-in-jax#html-149"><pre data-source-ref="thinking-in-jax#html-150"><span></span>SingleDeviceSharding(device=CpuDevice(id=0), memory_kind=device)
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-151">Here the array is on a single device, but in general a JAX array can be
sharded across multiple devices, or even multiple hosts.
To read more about sharded arrays and parallel computation, refer to <a class="reference external" href="https://docs.jax.dev/en/latest/parallel.html" target="_blank" rel="noreferrer">Introduction to parallel programming</a>.</p>
</section>
</section>
<section id="just-in-time-compilation-with-jax-jit">
<h2 data-source-ref="thinking-in-jax#html-152">Just-in-time compilation with <code class="docutils literal notranslate"><span class="pre">jax.jit</span></code><a class="headerlink" href="#just-in-time-compilation-with-jax-jit" title="Link to this heading">#</a></h2>
<p data-source-ref="thinking-in-jax#html-153"><strong>Key concepts:</strong></p>
<ul class="simple" data-source-ref="thinking-in-jax#html-154">
<li><p data-source-ref="thinking-in-jax#html-155">By default JAX executes operations one at a time, in sequence.</p></li>
<li><p data-source-ref="thinking-in-jax#html-156">Using a just-in-time (JIT) compilation decorator, sequences of operations can be optimized together and run at once.</p></li>
<li><p data-source-ref="thinking-in-jax#html-157">Not all JAX code can be JIT compiled, as it requires array shapes to be static &amp; known at compile time.</p></li>
</ul>
<p data-source-ref="thinking-in-jax#html-158">JAX runs transparently on the GPU or TPU (falling back to CPU if you don’t have one), with all JAX operations being expressed in terms of XLA. If we have a sequence of operations, we can use the <a class="reference external" href="https://docs.jax.dev/en/latest/_autosummary/jax.jit.html" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.jit</span></code></a> function to compile this sequence of operations together using the XLA compiler.</p>
<p data-source-ref="thinking-in-jax#html-159">For example, consider this function that normalizes the rows of a 2D matrix, expressed in terms of <code class="docutils literal notranslate"><span class="pre">jax.numpy</span></code> operations:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-160">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-161">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-162"><div class="highlight" data-source-ref="thinking-in-jax#html-163"><pre data-source-ref="thinking-in-jax#html-164"><span></span><span>import</span><span> </span><span>jax.numpy</span><span> </span><span>as</span><span> </span><span>jnp</span>

<span>def</span><span> </span><span>norm</span><span>(</span><span>X</span><span>):</span>
  <span>X</span> <span>=</span> <span>X</span> <span>-</span> <span>X</span><span>.</span><span>mean</span><span>(</span><span>0</span><span>)</span>
  <span>return</span> <span>X</span> <span>/</span> <span>X</span><span>.</span><span>std</span><span>(</span><span>0</span><span>)</span>
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-165">A just-in-time compiled version of the function can be created using the <code class="docutils literal notranslate"><span class="pre">jax.jit</span></code> transform:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-166">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-167">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-168"><div class="highlight" data-source-ref="thinking-in-jax#html-169"><pre data-source-ref="thinking-in-jax#html-170"><span></span><span>from</span><span> </span><span>jax</span><span> </span><span>import</span> <span>jit</span>
<span>norm_compiled</span> <span>=</span> <span>jit</span><span>(</span><span>norm</span><span>)</span>
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-171">This function returns the same results as the original, up to standard floating-point accuracy:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-172">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-173">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-174"><div class="highlight" data-source-ref="thinking-in-jax#html-175"><pre data-source-ref="thinking-in-jax#html-176"><span></span><span>np</span><span>.</span><span>random</span><span>.</span><span>seed</span><span>(</span><span>1701</span><span>)</span>
<span>X</span> <span>=</span> <span>jnp</span><span>.</span><span>array</span><span>(</span><span>np</span><span>.</span><span>random</span><span>.</span><span>rand</span><span>(</span><span>10000</span><span>,</span> <span>10</span><span>))</span>
<span>np</span><span>.</span><span>allclose</span><span>(</span><span>norm</span><span>(</span><span>X</span><span>),</span> <span>norm_compiled</span><span>(</span><span>X</span><span>),</span> <span>atol</span><span>=</span><span>1E-6</span><span>)</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-177">
<div class="output text_plain highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-178"><div class="highlight" data-source-ref="thinking-in-jax#html-179"><pre data-source-ref="thinking-in-jax#html-180"><span></span>True
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-181">But due to the compilation (which includes fusing of operations, avoidance of allocating temporary arrays, and a host of other tricks), execution times can be orders of magnitude faster in the JIT-compiled case. We can use IPython’s <code class="docutils literal notranslate"><span class="pre">%timeit</span></code> to quickly benchmark our function, using <code class="docutils literal notranslate"><span class="pre">block_until_ready()</span></code> to account for JAX’s <a class="reference external" href="https://docs.jax.dev/en/latest/async_dispatch.html" target="_blank" rel="noreferrer">asynchronous dispatch</a>:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-182">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-183">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-184"><div class="highlight" data-source-ref="thinking-in-jax#html-185"><pre data-source-ref="thinking-in-jax#html-186"><span></span><span>%</span><span>timeit</span> norm(X).block_until_ready()
<span>%</span><span>timeit</span> norm_compiled(X).block_until_ready()
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-187">
<div class="output stream highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-188"><div class="highlight" data-source-ref="thinking-in-jax#html-189"><pre data-source-ref="thinking-in-jax#html-190"><span></span>364 μs ± 5.11 μs per loop (mean ± std. dev. of 7 runs, 1,000 loops each)
327 μs ± 3.52 μs per loop (mean ± std. dev. of 7 runs, 1,000 loops each)
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-191">That said, <code class="docutils literal notranslate"><span class="pre">jax.jit</span></code> does have limitations: in particular, it requires all arrays to have static shapes. That means that some JAX operations are incompatible with JIT compilation.</p>
<p data-source-ref="thinking-in-jax#html-192">For example, this operation can be executed in op-by-op mode:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-193">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-194">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-195"><div class="highlight" data-source-ref="thinking-in-jax#html-196"><pre data-source-ref="thinking-in-jax#html-197"><span></span><span>def</span><span> </span><span>get_negatives</span><span>(</span><span>x</span><span>):</span>
  <span>return</span> <span>x</span><span>[</span><span>x</span> <span>&lt;</span> <span>0</span><span>]</span>

<span>x</span> <span>=</span> <span>jnp</span><span>.</span><span>array</span><span>(</span><span>np</span><span>.</span><span>random</span><span>.</span><span>randn</span><span>(</span><span>10</span><span>))</span>
<span>get_negatives</span><span>(</span><span>x</span><span>)</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-198">
<div class="output text_plain highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-199"><div class="highlight" data-source-ref="thinking-in-jax#html-200"><pre data-source-ref="thinking-in-jax#html-201"><span></span>Array([-0.10570311, -0.59403396, -0.8680282 , -0.23489487], dtype=float32)
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-202">But it returns an error if you attempt to execute it in jit mode:</p>
<div class="cell tag_raises-exception docutils container" data-source-ref="thinking-in-jax#html-203">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-204">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-205"><div class="highlight" data-source-ref="thinking-in-jax#html-206"><pre data-source-ref="thinking-in-jax#html-207"><span></span><span>jit</span><span>(</span><span>get_negatives</span><span>)(</span><span>x</span><span>)</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-208">
<div class="output traceback highlight-ipythontb notranslate" data-source-ref="thinking-in-jax#html-209"><div class="highlight" data-source-ref="thinking-in-jax#html-210"><pre data-source-ref="thinking-in-jax#html-211"><span></span><span>NonConcreteBooleanIndexError</span>: Array boolean indices must be concrete; got bool[10]

<span>See</span> <span>https</span><span>:</span><span>//</span><span>docs</span><span>.</span><span>jax</span><span>.</span><span>dev</span><span>/</span><span>en</span><span>/</span><span>latest</span><span>/</span><span>errors</span><span>.</span><span>html</span><span>#jax.errors.NonConcreteBooleanIndexError</span>
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-212">This is because the function generates an array whose shape is not known at compile time: the size of the output depends on the values of the input array, and so it is not compatible with JIT.</p>
<p data-source-ref="thinking-in-jax#html-213">For more on JIT compilation in JAX, check out <a class="reference external" href="https://docs.jax.dev/en/latest/jit-compilation.html" target="_blank" rel="noreferrer">Just-in-time compilation</a>.</p>
</section>
<section id="taking-derivatives-with-jax-grad">
<h2 data-source-ref="thinking-in-jax#html-214">Taking derivatives with <code class="docutils literal notranslate"><span class="pre">jax.grad</span></code><a class="headerlink" href="#taking-derivatives-with-jax-grad" title="Link to this heading">#</a></h2>
<p data-source-ref="thinking-in-jax#html-215"><strong>Key concepts:</strong></p>
<ul class="simple" data-source-ref="thinking-in-jax#html-216">
<li><p data-source-ref="thinking-in-jax#html-217">JAX provides automatic differentiation via the <code class="docutils literal notranslate"><span class="pre">jax.grad</span></code> transformation.</p></li>
<li><p data-source-ref="thinking-in-jax#html-218">The <code class="docutils literal notranslate"><span class="pre">jax.grad</span></code> and <code class="docutils literal notranslate"><span class="pre">jax.jit</span></code> transformations compose and can be mixed arbitrarily.</p></li>
</ul>
<p data-source-ref="thinking-in-jax#html-219">In addition to transforming functions via JIT compilation, JAX also provides other transformations. One such transformation is <a class="reference external" href="https://docs.jax.dev/en/latest/_autosummary/jax.grad.html" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.grad</span></code></a>, which performs <a class="reference external" href="https://en.wikipedia.org/wiki/Automatic_differentiation" target="_blank" rel="noreferrer">automatic differentiation (autodiff)</a>:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-220">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-221">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-222"><div class="highlight" data-source-ref="thinking-in-jax#html-223"><pre data-source-ref="thinking-in-jax#html-224"><span></span><span>from</span><span> </span><span>jax</span><span> </span><span>import</span> <span>grad</span>

<span>def</span><span> </span><span>sum_logistic</span><span>(</span><span>x</span><span>):</span>
  <span>return</span> <span>jnp</span><span>.</span><span>sum</span><span>(</span><span>1.0</span> <span>/</span> <span>(</span><span>1.0</span> <span>+</span> <span>jnp</span><span>.</span><span>exp</span><span>(</span><span>-</span><span>x</span><span>)))</span>

<span>x_small</span> <span>=</span> <span>jnp</span><span>.</span><span>arange</span><span>(</span><span>3.</span><span>)</span>
<span>derivative_fn</span> <span>=</span> <span>grad</span><span>(</span><span>sum_logistic</span><span>)</span>
<span>print</span><span>(</span><span>derivative_fn</span><span>(</span><span>x_small</span><span>))</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-225">
<div class="output stream highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-226"><div class="highlight" data-source-ref="thinking-in-jax#html-227"><pre data-source-ref="thinking-in-jax#html-228"><span></span>[0.25       0.19661197 0.10499357]
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-229">Let’s verify with finite differences that our result is correct.</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-230">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-231">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-232"><div class="highlight" data-source-ref="thinking-in-jax#html-233"><pre data-source-ref="thinking-in-jax#html-234"><span></span><span>def</span><span> </span><span>first_finite_differences</span><span>(</span><span>f</span><span>,</span> <span>x</span><span>,</span> <span>eps</span><span>=</span><span>1E-3</span><span>):</span>
  <span>return</span> <span>jnp</span><span>.</span><span>array</span><span>([(</span><span>f</span><span>(</span><span>x</span> <span>+</span> <span>eps</span> <span>*</span> <span>v</span><span>)</span> <span>-</span> <span>f</span><span>(</span><span>x</span> <span>-</span> <span>eps</span> <span>*</span> <span>v</span><span>))</span> <span>/</span> <span>(</span><span>2</span> <span>*</span> <span>eps</span><span>)</span>
                   <span>for</span> <span>v</span> <span>in</span> <span>jnp</span><span>.</span><span>eye</span><span>(</span><span>len</span><span>(</span><span>x</span><span>))])</span>

<span>print</span><span>(</span><span>first_finite_differences</span><span>(</span><span>sum_logistic</span><span>,</span> <span>x_small</span><span>))</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-235">
<div class="output stream highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-236"><div class="highlight" data-source-ref="thinking-in-jax#html-237"><pre data-source-ref="thinking-in-jax#html-238"><span></span>[0.24998187 0.1964569  0.10502338]
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-239">The <a class="reference external" href="https://docs.jax.dev/en/latest/_autosummary/jax.grad.html" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.grad</span></code></a> and <a class="reference external" href="https://docs.jax.dev/en/latest/_autosummary/jax.jit.html" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.jit</span></code></a> transformations compose and can be mixed arbitrarily.
For instance, while the <code class="docutils literal notranslate"><span class="pre">sum_logistic</span></code> function was differentiated directly in the previous example, it could also be JIT-compiled, and these operations can be combined. We can go further:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-240">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-241">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-242"><div class="highlight" data-source-ref="thinking-in-jax#html-243"><pre data-source-ref="thinking-in-jax#html-244"><span></span><span>print</span><span>(</span><span>grad</span><span>(</span><span>jit</span><span>(</span><span>grad</span><span>(</span><span>jit</span><span>(</span><span>grad</span><span>(</span><span>sum_logistic</span><span>)))))(</span><span>1.0</span><span>))</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-245">
<div class="output stream highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-246"><div class="highlight" data-source-ref="thinking-in-jax#html-247"><pre data-source-ref="thinking-in-jax#html-248"><span></span>-0.0353256
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-249">Beyond scalar-valued functions, the <a class="reference external" href="https://docs.jax.dev/en/latest/_autosummary/jax.jacobian.html" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.jacobian</span></code></a> transformation can be
used to compute the full Jacobian matrix for vector-valued functions:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-250">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-251">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-252"><div class="highlight" data-source-ref="thinking-in-jax#html-253"><pre data-source-ref="thinking-in-jax#html-254"><span></span><span>from</span><span> </span><span>jax</span><span> </span><span>import</span> <span>jacobian</span>
<span>print</span><span>(</span><span>jacobian</span><span>(</span><span>jnp</span><span>.</span><span>exp</span><span>)(</span><span>x_small</span><span>))</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-255">
<div class="output stream highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-256"><div class="highlight" data-source-ref="thinking-in-jax#html-257"><pre data-source-ref="thinking-in-jax#html-258"><span></span>[[1.        0.        0.       ]
 [0.        2.7182817 0.       ]
 [0.        0.        7.389056 ]]
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-259">For more advanced autodiff operations, you can use <a class="reference external" href="https://docs.jax.dev/en/latest/_autosummary/jax.vjp.html" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.vjp</span></code></a> for reverse-mode vector-Jacobian products,
and <a class="reference external" href="https://docs.jax.dev/en/latest/_autosummary/jax.jvp.html" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.jvp</span></code></a> and <a class="reference external" href="https://docs.jax.dev/en/latest/_autosummary/jax.linearize.html" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.linearize</span></code></a> for forward-mode Jacobian-vector products.
The two can be composed arbitrarily with one another, and with other JAX transformations.
For example, <code class="docutils literal notranslate"><span class="pre">jax.jvp</span></code> and <code class="docutils literal notranslate"><span class="pre">jax.vjp</span></code> are used to define the forward-mode <a class="reference external" href="https://docs.jax.dev/en/latest/_autosummary/jax.jacfwd.html" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.jacfwd</span></code></a> and reverse-mode <a class="reference external" href="https://docs.jax.dev/en/latest/_autosummary/jax.jacrev.html" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.jacrev</span></code></a> for computing Jacobians in forward- and reverse-mode, respectively.
Here’s one way to compose them to make a function that efficiently computes full Hessian matrices:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-260">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-261">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-262"><div class="highlight" data-source-ref="thinking-in-jax#html-263"><pre data-source-ref="thinking-in-jax#html-264"><span></span><span>from</span><span> </span><span>jax</span><span> </span><span>import</span> <span>jacfwd</span><span>,</span> <span>jacrev</span>
<span>def</span><span> </span><span>hessian</span><span>(</span><span>fun</span><span>):</span>
  <span>return</span> <span>jit</span><span>(</span><span>jacfwd</span><span>(</span><span>jacrev</span><span>(</span><span>fun</span><span>)))</span>
<span>print</span><span>(</span><span>hessian</span><span>(</span><span>sum_logistic</span><span>)(</span><span>x_small</span><span>))</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-265">
<div class="output stream highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-266"><div class="highlight" data-source-ref="thinking-in-jax#html-267"><pre data-source-ref="thinking-in-jax#html-268"><span></span>[[-0.         -0.         -0.        ]
 [-0.         -0.09085776 -0.        ]
 [-0.         -0.         -0.07996249]]
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-269">This kind of composition produces efficient code in practice; this is more-or-less how JAX’s built-in <a class="reference external" href="https://docs.jax.dev/en/latest/_autosummary/jax.hessian.html" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.hessian</span></code></a> function is implemented.</p>
<p data-source-ref="thinking-in-jax#html-270">For more on automatic differentiation in JAX, check out <a class="reference external" href="https://docs.jax.dev/en/latest/automatic-differentiation.html" target="_blank" rel="noreferrer">Automatic differentiation</a>.</p>
</section>
<section id="auto-vectorization-with-jax-vmap">
<h2 data-source-ref="thinking-in-jax#html-271">Auto-vectorization with <code class="docutils literal notranslate"><span class="pre">jax.vmap</span></code><a class="headerlink" href="#auto-vectorization-with-jax-vmap" title="Link to this heading">#</a></h2>
<p data-source-ref="thinking-in-jax#html-272"><strong>Key concepts:</strong></p>
<ul class="simple" data-source-ref="thinking-in-jax#html-273">
<li><p data-source-ref="thinking-in-jax#html-274">JAX provides automatic vectorization via the <a class="reference external" href="https://docs.jax.dev/en/latest/_autosummary/jax.vmap.html" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.vmap</span></code></a> transformation.</p></li>
<li><p data-source-ref="thinking-in-jax#html-275"><code class="docutils literal notranslate"><span class="pre">jax.vmap</span></code> can be composed with <code class="docutils literal notranslate"><span class="pre">jax.jit</span></code> to produce efficient vectorized code.</p></li>
</ul>
<p data-source-ref="thinking-in-jax#html-276">Another useful transformation is <a class="reference external" href="https://docs.jax.dev/en/latest/_autosummary/jax.vmap.html" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.vmap</span></code></a>, the vectorizing map.
It has the familiar semantics of mapping a function along array axes, but instead of explicitly looping
over function calls, it transforms the function into a natively vectorized version for better performance.
When composed with <a class="reference external" href="https://docs.jax.dev/en/latest/_autosummary/jax.jit.html" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.jit</span></code></a>, it can be just as performant as manually rewriting your function
to operate over an extra batch dimension.</p>
<p data-source-ref="thinking-in-jax#html-277">We’re going to work with a simple example, and promote matrix-vector products into matrix-matrix products using <a class="reference external" href="https://docs.jax.dev/en/latest/_autosummary/jax.vmap.html" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.vmap</span></code></a>.
Although this is easy to do by hand in this specific case, the same technique can apply to more complicated functions.</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-278">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-279">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-280"><div class="highlight" data-source-ref="thinking-in-jax#html-281"><pre data-source-ref="thinking-in-jax#html-282"><span></span><span>from</span><span> </span><span>jax</span><span> </span><span>import</span> <span>random</span>

<span>key</span> <span>=</span> <span>random</span><span>.</span><span>key</span><span>(</span><span>1701</span><span>)</span>
<span>key1</span><span>,</span> <span>key2</span> <span>=</span> <span>random</span><span>.</span><span>split</span><span>(</span><span>key</span><span>)</span>
<span>mat</span> <span>=</span> <span>random</span><span>.</span><span>normal</span><span>(</span><span>key1</span><span>,</span> <span>(</span><span>150</span><span>,</span> <span>100</span><span>))</span>
<span>batched_x</span> <span>=</span> <span>random</span><span>.</span><span>normal</span><span>(</span><span>key2</span><span>,</span> <span>(</span><span>10</span><span>,</span> <span>100</span><span>))</span>

<span>def</span><span> </span><span>apply_matrix</span><span>(</span><span>x</span><span>):</span>
  <span>return</span> <span>jnp</span><span>.</span><span>dot</span><span>(</span><span>mat</span><span>,</span> <span>x</span><span>)</span>
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-283">The <code class="docutils literal notranslate"><span class="pre">apply_matrix</span></code> function maps a vector to a vector, but we may want to apply it row-wise across a matrix.
We could do this by looping over the batch dimension in Python, but this usually results in poor performance.</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-284">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-285">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-286"><div class="highlight" data-source-ref="thinking-in-jax#html-287"><pre data-source-ref="thinking-in-jax#html-288"><span></span><span>def</span><span> </span><span>naively_batched_apply_matrix</span><span>(</span><span>v_batched</span><span>):</span>
  <span>return</span> <span>jnp</span><span>.</span><span>stack</span><span>([</span><span>apply_matrix</span><span>(</span><span>v</span><span>)</span> <span>for</span> <span>v</span> <span>in</span> <span>v_batched</span><span>])</span>

<span>print</span><span>(</span><span>&#39;Naively batched&#39;</span><span>)</span>
<span>%</span><span>timeit</span> naively_batched_apply_matrix(batched_x).block_until_ready()
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-289">
<div class="output stream highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-290"><div class="highlight" data-source-ref="thinking-in-jax#html-291"><pre data-source-ref="thinking-in-jax#html-292"><span></span>Naively batched
424 μs ± 1.77 μs per loop (mean ± std. dev. of 7 runs, 1,000 loops each)
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-293">A programmer familiar with the <code class="docutils literal notranslate"><span class="pre">jnp.dot</span></code> function might recognize that <code class="docutils literal notranslate"><span class="pre">apply_matrix</span></code> can
be rewritten to avoid explicit looping, using the built-in batching semantics of <code class="docutils literal notranslate"><span class="pre">jnp.dot</span></code>:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-294">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-295">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-296"><div class="highlight" data-source-ref="thinking-in-jax#html-297"><pre data-source-ref="thinking-in-jax#html-298"><span></span><span>import</span><span> </span><span>numpy</span><span> </span><span>as</span><span> </span><span>np</span>

<span>@jit</span>
<span>def</span><span> </span><span>batched_apply_matrix</span><span>(</span><span>batched_x</span><span>):</span>
  <span>return</span> <span>jnp</span><span>.</span><span>dot</span><span>(</span><span>batched_x</span><span>,</span> <span>mat</span><span>.</span><span>T</span><span>)</span>

<span>np</span><span>.</span><span>testing</span><span>.</span><span>assert_allclose</span><span>(</span><span>naively_batched_apply_matrix</span><span>(</span><span>batched_x</span><span>),</span>
                           <span>batched_apply_matrix</span><span>(</span><span>batched_x</span><span>),</span> <span>atol</span><span>=</span><span>1E-4</span><span>,</span> <span>rtol</span><span>=</span><span>1E-4</span><span>)</span>
<span>print</span><span>(</span><span>&#39;Manually batched&#39;</span><span>)</span>
<span>%</span><span>timeit</span> batched_apply_matrix(batched_x).block_until_ready()
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-299">
<div class="output stream highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-300"><div class="highlight" data-source-ref="thinking-in-jax#html-301"><pre data-source-ref="thinking-in-jax#html-302"><span></span>Manually batched
33.4 μs ± 535 ns per loop (mean ± std. dev. of 7 runs, 10,000 loops each)
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-303">However, as functions become more complicated, this kind of manual batching becomes more difficult and error-prone.
The <code class="docutils literal notranslate"><span class="pre">jax.vmap</span></code> transformation is designed to automatically transform a function into a batch-aware version:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-304">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-305">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-306"><div class="highlight" data-source-ref="thinking-in-jax#html-307"><pre data-source-ref="thinking-in-jax#html-308"><span></span><span>from</span><span> </span><span>jax</span><span> </span><span>import</span> <span>vmap</span>

<span>@jit</span>
<span>def</span><span> </span><span>vmap_batched_apply_matrix</span><span>(</span><span>batched_x</span><span>):</span>
  <span>return</span> <span>vmap</span><span>(</span><span>apply_matrix</span><span>)(</span><span>batched_x</span><span>)</span>

<span>np</span><span>.</span><span>testing</span><span>.</span><span>assert_allclose</span><span>(</span><span>naively_batched_apply_matrix</span><span>(</span><span>batched_x</span><span>),</span>
                           <span>vmap_batched_apply_matrix</span><span>(</span><span>batched_x</span><span>),</span> <span>atol</span><span>=</span><span>1E-4</span><span>,</span> <span>rtol</span><span>=</span><span>1E-4</span><span>)</span>
<span>print</span><span>(</span><span>&#39;Auto-vectorized with vmap&#39;</span><span>)</span>
<span>%</span><span>timeit</span> vmap_batched_apply_matrix(batched_x).block_until_ready()
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-309">
<div class="output stream highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-310"><div class="highlight" data-source-ref="thinking-in-jax#html-311"><pre data-source-ref="thinking-in-jax#html-312"><span></span>Auto-vectorized with vmap
43.6 μs ± 279 ns per loop (mean ± std. dev. of 7 runs, 10,000 loops each)
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-313">As you would expect, <code class="docutils literal notranslate"><span class="pre">jax.vmap</span></code> can be arbitrarily composed with <code class="docutils literal notranslate"><span class="pre">jax.jit</span></code>,
<code class="docutils literal notranslate"><span class="pre">jax.grad</span></code>, and any other JAX transformation.</p>
<p data-source-ref="thinking-in-jax#html-314">For more on automatic vectorization in JAX, check out <a class="reference external" href="https://docs.jax.dev/en/latest/automatic-vectorization.html" target="_blank" rel="noreferrer">Automatic vectorization</a>.</p>
</section>
<section id="pseudorandom-numbers">
<span id="key-concepts-prngs"></span><h2 data-source-ref="thinking-in-jax#html-315">Pseudorandom numbers<a class="headerlink" href="#pseudorandom-numbers" title="Link to this heading">#</a></h2>
<p data-source-ref="thinking-in-jax#html-316"><strong>Key concepts:</strong></p>
<ul class="simple" data-source-ref="thinking-in-jax#html-317">
<li><p data-source-ref="thinking-in-jax#html-318">JAX uses a different model for pseudo random number generation than NumPy.</p></li>
<li><p data-source-ref="thinking-in-jax#html-319">JAX random functions consume a random <code class="docutils literal notranslate"><span class="pre">key</span></code> that must be split to generate new independent keys.</p></li>
<li><p data-source-ref="thinking-in-jax#html-320">JAX’s random key model is thread-safe and avoids issues with global state.</p></li>
</ul>
<p data-source-ref="thinking-in-jax#html-321">Generally, JAX strives to be compatible with NumPy, but pseudo random number generation is a notable exception. NumPy supports a method of pseudo random number generation that is based on a global <code class="docutils literal notranslate"><span class="pre">state</span></code>, which can be set using <a class="reference external" href="https://numpy.org/doc/stable/reference/random/generated/numpy.random.seed.html" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">numpy.random.seed</span></code></a>. Global random state interacts poorly with JAX’s compute model and makes it difficult to enforce reproducibility across different threads, processes, and devices. JAX instead tracks state explicitly via a random <code class="docutils literal notranslate"><span class="pre">key</span></code>:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-322">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-323">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-324"><div class="highlight" data-source-ref="thinking-in-jax#html-325"><pre data-source-ref="thinking-in-jax#html-326"><span></span><span>from</span><span> </span><span>jax</span><span> </span><span>import</span> <span>random</span>

<span>key</span> <span>=</span> <span>random</span><span>.</span><span>key</span><span>(</span><span>43</span><span>)</span>
<span>print</span><span>(</span><span>key</span><span>)</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-327">
<div class="output stream highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-328"><div class="highlight" data-source-ref="thinking-in-jax#html-329"><pre data-source-ref="thinking-in-jax#html-330"><span></span>Array((), dtype=key&lt;fry&gt;) overlaying:
[ 0 43]
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-331">The key is effectively a stand-in for NumPy’s hidden state object, but we pass it explicitly to <a class="reference external" href="https://docs.jax.dev/en/latest/jax.random.html" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.random</span></code></a> functions. Importantly, random functions consume the key, but do not modify it: feeding the same key object to a random function will always result in the same sample being generated.</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-332">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-333">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-334"><div class="highlight" data-source-ref="thinking-in-jax#html-335"><pre data-source-ref="thinking-in-jax#html-336"><span></span><span>print</span><span>(</span><span>random</span><span>.</span><span>normal</span><span>(</span><span>key</span><span>))</span>
<span>print</span><span>(</span><span>random</span><span>.</span><span>normal</span><span>(</span><span>key</span><span>))</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-337">
<div class="output stream highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-338"><div class="highlight" data-source-ref="thinking-in-jax#html-339"><pre data-source-ref="thinking-in-jax#html-340"><span></span>0.07520543
0.07520543
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-341"><strong>The rule of thumb is: never reuse keys (unless you want identical outputs).</strong></p>
<p data-source-ref="thinking-in-jax#html-342">In order to generate different and independent samples, you must <a class="reference external" href="https://docs.jax.dev/en/latest/_autosummary/jax.random.split.html" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.random.split</span></code></a> the key explicitly before passing it to a random function:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-343">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-344">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-345"><div class="highlight" data-source-ref="thinking-in-jax#html-346"><pre data-source-ref="thinking-in-jax#html-347"><span></span><span>for</span> <span>i</span> <span>in</span> <span>range</span><span>(</span><span>3</span><span>):</span>
  <span>new_key</span><span>,</span> <span>subkey</span> <span>=</span> <span>random</span><span>.</span><span>split</span><span>(</span><span>key</span><span>)</span>
  <span>del</span> <span>key</span>  <span># The old key is consumed by split() -- we must never use it again.</span>

  <span>val</span> <span>=</span> <span>random</span><span>.</span><span>normal</span><span>(</span><span>subkey</span><span>)</span>
  <span>del</span> <span>subkey</span>  <span># The subkey is consumed by normal().</span>

  <span>print</span><span>(</span><span>f</span><span>&quot;draw </span><span>{</span><span>i</span><span>}</span><span>: </span><span>{</span><span>val</span><span>}</span><span>&quot;</span><span>)</span>
  <span>key</span> <span>=</span> <span>new_key</span>  <span># new_key is safe to use in the next iteration.</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-348">
<div class="output stream highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-349"><div class="highlight" data-source-ref="thinking-in-jax#html-350"><pre data-source-ref="thinking-in-jax#html-351"><span></span>draw 0: -1.9133632183074951
draw 1: -1.4749839305877686
draw 2: -0.36703771352767944
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-352">Note that this code is thread safe, since the local random state eliminates possible race conditions involving global state. <code class="docutils literal notranslate"><span class="pre">jax.random.split</span></code> is a deterministic function that converts one <code class="docutils literal notranslate"><span class="pre">key</span></code> into several independent (in the pseudorandomness sense) keys.</p>
<p data-source-ref="thinking-in-jax#html-353">For more on pseudo random numbers in JAX, see the <a class="reference external" href="https://docs.jax.dev/en/latest/random-numbers.html" target="_blank" rel="noreferrer">Pseudorandom numbers tutorial</a>.</p>
</section>
<section id="debugging">
<h2 data-source-ref="thinking-in-jax#html-354">Debugging<a class="headerlink" href="#debugging" title="Link to this heading">#</a></h2>
<p data-source-ref="thinking-in-jax#html-355">Debugging JAX code can be challenging due to its functional programming model and the fact that JAX code is often transformed via JIT compilation or vectorization. However, JAX provides several tools to help with debugging.</p>
<section id="jax-debug-print">
<h3 data-source-ref="thinking-in-jax#html-356"><code class="docutils literal notranslate"><span class="pre">jax.debug.print</span></code><a class="headerlink" href="#jax-debug-print" title="Link to this heading">#</a></h3>
<p data-source-ref="thinking-in-jax#html-357">For simple inspection, use <a class="reference external" href="https://docs.jax.dev/en/latest/_autosummary/jax.debug.print.html" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.debug.print</span></code></a>.</p>
<p data-source-ref="thinking-in-jax#html-358">Python’s built-in <code class="docutils literal notranslate"><span class="pre">print</span></code> executes at trace-time, before the runtime values exist. Because of this, <code class="docutils literal notranslate"><span class="pre">print</span></code> will only show tracer values within <code class="docutils literal notranslate"><span class="pre">jax.jit</span></code>-decorated code.</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-359">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-360">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-361"><div class="highlight" data-source-ref="thinking-in-jax#html-362"><pre data-source-ref="thinking-in-jax#html-363"><span></span><span>import</span><span> </span><span>jax</span>
<span>import</span><span> </span><span>jax.numpy</span><span> </span><span>as</span><span> </span><span>jnp</span>

<span>@jax</span><span>.</span><span>jit</span>
<span>def</span><span> </span><span>f</span><span>(</span><span>x</span><span>):</span>
  <span>print</span><span>(</span><span>&quot;print(x) -&gt;&quot;</span><span>,</span> <span>x</span><span>)</span>
  <span>y</span> <span>=</span> <span>jnp</span><span>.</span><span>sin</span><span>(</span><span>x</span><span>)</span>
  <span>print</span><span>(</span><span>&quot;print(y) -&gt;&quot;</span><span>,</span> <span>y</span><span>)</span>
  <span>return</span> <span>y</span>

<span>result</span> <span>=</span> <span>f</span><span>(</span><span>2.</span><span>)</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-364">
<div class="output stream highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-365"><div class="highlight" data-source-ref="thinking-in-jax#html-366"><pre data-source-ref="thinking-in-jax#html-367"><span></span>print(x) -&gt; JitTracer(~float32[])
print(y) -&gt; JitTracer(~float32[])
</pre></div>
</div>
</div>
</div>
<p data-source-ref="thinking-in-jax#html-368">If you want to print the actual runtime values, you can use <code class="docutils literal notranslate"><span class="pre">jax.debug.print</span></code>:</p>
<div class="cell docutils container" data-source-ref="thinking-in-jax#html-369">
<div class="cell_input docutils container" data-source-ref="thinking-in-jax#html-370">
<div class="highlight-ipython3 notranslate" data-source-ref="thinking-in-jax#html-371"><div class="highlight" data-source-ref="thinking-in-jax#html-372"><pre data-source-ref="thinking-in-jax#html-373"><span></span><span>@jax</span><span>.</span><span>jit</span>
<span>def</span><span> </span><span>f</span><span>(</span><span>x</span><span>):</span>
  <span>jax</span><span>.</span><span>debug</span><span>.</span><span>print</span><span>(</span><span>&quot;jax.debug.print(x) -&gt; </span><span>{x}</span><span>&quot;</span><span>,</span> <span>x</span><span>=</span><span>x</span><span>)</span>
  <span>y</span> <span>=</span> <span>jnp</span><span>.</span><span>sin</span><span>(</span><span>x</span><span>)</span>
  <span>jax</span><span>.</span><span>debug</span><span>.</span><span>print</span><span>(</span><span>&quot;jax.debug.print(y) -&gt; </span><span>{y}</span><span>&quot;</span><span>,</span> <span>y</span><span>=</span><span>y</span><span>)</span>
  <span>return</span> <span>y</span>

<span>result</span> <span>=</span> <span>f</span><span>(</span><span>2.</span><span>)</span>
</pre></div>
</div>
</div>
<div class="cell_output docutils container" data-source-ref="thinking-in-jax#html-374">
<div class="output stream highlight-myst-ansi notranslate" data-source-ref="thinking-in-jax#html-375"><div class="highlight" data-source-ref="thinking-in-jax#html-376"><pre data-source-ref="thinking-in-jax#html-377"><span></span>jax.debug.print(x) -&gt; 2.0
jax.debug.print(y) -&gt; 0.9092974066734314
</pre></div>
</div>
</div>
</div>
</section>
<section id="debugging-flags">
<h3 data-source-ref="thinking-in-jax#html-378">Debugging flags<a class="headerlink" href="#debugging-flags" title="Link to this heading">#</a></h3>
<p data-source-ref="thinking-in-jax#html-379">JAX offers flags and context managers that enable catching errors more easily. For example, you can enable the <code class="docutils literal notranslate"><span class="pre">jax.debug_nans</span></code> flag to automatically detect when NaNs are produced in <code class="docutils literal notranslate"><span class="pre">jax.jit</span></code>-compiled code. You can also enable the <code class="docutils literal notranslate"><span class="pre">jax_disable_jit</span></code> flag to disable JIT-compilation, enabling use of traditional Python debugging tools like <code class="docutils literal notranslate"><span class="pre">print</span></code> and <code class="docutils literal notranslate"><span class="pre">pdb</span></code>.</p>
<p data-source-ref="thinking-in-jax#html-380">For more details, see <a class="reference external" href="https://docs.jax.dev/en/latest/debugging.html" target="_blank" rel="noreferrer">Introduction to debugging</a>.</p>

<p data-source-ref="thinking-in-jax#html-381">This is just a taste of what JAX can do. We’re really excited to see what you do with it!</p>
</section>
</section>
</section>
`;
