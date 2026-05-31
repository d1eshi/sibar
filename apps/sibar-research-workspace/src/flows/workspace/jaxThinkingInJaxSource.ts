export const jaxThinkingInJaxSourceUrl =
  "https://docs.jax.dev/en/latest/notebooks/thinking_in_jax.html";

export const jaxThinkingInJaxScrapedAt = "2026-05-31";

export type JaxThinkingInJaxSection = {
  id: string;
  title: string;
  sourceRef: string;
};

export const jaxThinkingInJaxSections: readonly JaxThinkingInJaxSection[] = [
  {
    id: "quickstart-how-to-think-in-jax",
    title: "Quickstart: How to think in JAX",
    sourceRef: "thinking-in-jax#quickstart",
  },
  {
    id: "installation",
    title: "Installation",
    sourceRef: "thinking-in-jax#installation",
  },
  {
    id: "jax-vs-numpy",
    title: "JAX vs. NumPy",
    sourceRef: "thinking-in-jax#jax-vs-numpy",
  },
  {
    id: "jax-arrays-jax-array",
    title: "JAX arrays",
    sourceRef: "thinking-in-jax#jax-arrays",
  },
];

export const jaxThinkingInJaxHtml = String.raw`
<section class="tex2jax_ignore mathjax_ignore" id="quickstart-how-to-think-in-jax">
  <h1 data-source-ref="thinking-in-jax#title">Quickstart: How to think in JAX<a class="headerlink" href="#quickstart-how-to-think-in-jax" title="Link to this heading">#</a></h1>
  <p class="launch-links" data-source-ref="thinking-in-jax#launch-links">
    <a class="reference external" href="https://colab.research.google.com/github/jax-ml/jax/blob/main/docs/notebooks/thinking_in_jax.ipynb" target="_blank" rel="noreferrer">
      <img alt="Open in Colab" src="https://colab.research.google.com/assets/colab-badge.svg" />
    </a>
    <a class="reference external" href="https://kaggle.com/kernels/welcome?src=https://github.com/jax-ml/jax/blob/main/docs/notebooks/thinking_in_jax.ipynb" target="_blank" rel="noreferrer">
      <img alt="Open in Kaggle" src="https://kaggle.com/static/images/open-in-kaggle.svg" />
    </a>
  </p>
  <p data-source-ref="thinking-in-jax#intro-definition"><strong>JAX is a library for array-oriented numerical computation (<em>à la</em> <a class="reference external" href="https://numpy.org/" target="_blank" rel="noreferrer">NumPy</a>), with automatic differentiation and JIT compilation to enable high-performance machine learning research</strong>.</p>
  <p data-source-ref="thinking-in-jax#intro-overview">This document provides a quick overview of essential JAX features, so you can get started with JAX:</p>
  <ul class="simple" data-source-ref="thinking-in-jax#intro-list">
    <li><p>JAX provides a unified NumPy-like interface to computations that run on CPU, GPU, or TPU, in local or distributed settings.</p></li>
    <li><p>JAX features built-in Just-In-Time (JIT) compilation via <a class="reference external" href="https://github.com/openxla" target="_blank" rel="noreferrer">Open XLA</a>, an open-source machine learning compiler ecosystem.</p></li>
    <li><p>JAX functions support efficient evaluation of gradients via its automatic differentiation transformations.</p></li>
    <li><p>JAX functions can be automatically vectorized to efficiently map them over arrays representing batches of inputs.</p></li>
  </ul>

  <section id="installation">
    <h2 data-source-ref="thinking-in-jax#installation-title">Installation<a class="headerlink" href="#installation" title="Link to this heading">#</a></h2>
    <p data-source-ref="thinking-in-jax#installation-pypi">JAX can be installed for CPU on Linux, Windows, and macOS directly from the <a class="reference external" href="https://pypi.org/project/jax/" target="_blank" rel="noreferrer">Python Package Index</a>:</p>
    <div class="highlight-default notranslate" data-source-ref="thinking-in-jax#installation-cpu"><div class="highlight"><pre><code>pip install jax</code></pre></div></div>
    <p data-source-ref="thinking-in-jax#installation-gpu-intro">or, for NVIDIA GPU:</p>
    <div class="highlight-default notranslate" data-source-ref="thinking-in-jax#installation-gpu"><div class="highlight"><pre><code>pip install -U "jax[cuda13]"</code></pre></div></div>
    <p data-source-ref="thinking-in-jax#installation-link">For more detailed platform-specific installation information, check out <a class="reference external" href="https://docs.jax.dev/en/latest/installation.html" target="_blank" rel="noreferrer">Installation</a>.</p>
  </section>

  <section id="jax-vs-numpy">
    <h2 data-source-ref="thinking-in-jax#jax-vs-numpy-title">JAX vs. NumPy<a class="headerlink" href="#jax-vs-numpy" title="Link to this heading">#</a></h2>
    <p data-source-ref="thinking-in-jax#jax-vs-numpy-key-concepts"><strong>Key concepts:</strong></p>
    <ul class="simple" data-source-ref="thinking-in-jax#jax-vs-numpy-list">
      <li><p>JAX provides a NumPy-inspired interface for convenience.</p></li>
      <li><p>Through <a class="reference external" href="https://en.wikipedia.org/wiki/Duck_typing" target="_blank" rel="noreferrer">duck-typing</a>, JAX arrays can often be used as drop-in replacements of NumPy arrays.</p></li>
      <li><p>Unlike NumPy arrays, JAX arrays are always immutable.</p></li>
    </ul>
    <p data-source-ref="thinking-in-jax#jax-numpy-import">NumPy provides a well-known, powerful API for working with numerical data. For convenience, JAX provides <a class="reference external" href="https://docs.jax.dev/en/latest/jax.numpy.html" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.numpy</span></code></a> which closely mirrors the NumPy API and provides easy entry into JAX. Almost anything that can be done with <code class="docutils literal notranslate"><span class="pre">numpy</span></code> can be done with <code class="docutils literal notranslate"><span class="pre">jax.numpy</span></code>, which is typically imported under the <code class="docutils literal notranslate"><span class="pre">jnp</span></code> alias:</p>
    <div class="cell docutils container" data-source-ref="thinking-in-jax#jax-numpy-code">
      <div class="cell_input docutils container"><div class="highlight-ipython3 notranslate"><div class="highlight"><pre><code>import jax.numpy as jnp</code></pre></div></div></div>
    </div>
    <p data-source-ref="thinking-in-jax#numpy-style">With this import, you can immediately use JAX in a similar manner to typical NumPy programs, including using NumPy-style array creation functions, Python functions and operators, and array attributes and methods:</p>
    <div class="cell docutils container" data-source-ref="thinking-in-jax#plot-code">
      <div class="cell_input docutils container"><div class="highlight-ipython3 notranslate"><div class="highlight"><pre><code>import matplotlib.pyplot as plt

x_jnp = jnp.linspace(0, 10, 1000)
y_jnp = 2 * jnp.sin(x_jnp) * jnp.cos(x_jnp)
plt.plot(x_jnp, y_jnp);</code></pre></div></div></div>
      <div class="cell_output docutils container">
        <img alt="../_images/6444b12bde3d97af72e7d0ba8dc5562b0aceff09777821749bc4b6e563966ef8.png" src="https://docs.jax.dev/en/latest/_images/6444b12bde3d97af72e7d0ba8dc5562b0aceff09777821749bc4b6e563966ef8.png" />
      </div>
    </div>
    <p data-source-ref="thinking-in-jax#same-results">The code blocks are identical to what you would expect with NumPy, aside from replacing <code class="docutils literal notranslate"><span class="pre">np</span></code> with <code class="docutils literal notranslate"><span class="pre">jnp</span></code>, and the results are the same. As we can see, JAX arrays can often be used directly in place of NumPy arrays for things like plotting.</p>
    <p data-source-ref="thinking-in-jax#array-types">The arrays themselves are implemented as different Python types:</p>
    <div class="cell docutils container" data-source-ref="thinking-in-jax#array-type-code">
      <div class="cell_input docutils container"><div class="highlight-ipython3 notranslate"><div class="highlight"><pre><code>import numpy as np
import jax.numpy as jnp

x_np = np.linspace(0, 10, 1000)
x_jnp = jnp.linspace(0, 10, 1000)</code></pre></div></div></div>
    </div>
    <div class="cell docutils container" data-source-ref="thinking-in-jax#numpy-type-code">
      <div class="cell_input docutils container"><div class="highlight-ipython3 notranslate"><div class="highlight"><pre><code>type(x_np)</code></pre></div></div></div>
      <div class="cell_output docutils container"><div class="output text_plain highlight-myst-ansi notranslate"><div class="highlight"><pre><code>numpy.ndarray</code></pre></div></div></div>
    </div>
    <div class="cell docutils container" data-source-ref="thinking-in-jax#jax-type-code">
      <div class="cell_input docutils container"><div class="highlight-ipython3 notranslate"><div class="highlight"><pre><code>type(x_jnp)</code></pre></div></div></div>
      <div class="cell_output docutils container"><div class="output text_plain highlight-myst-ansi notranslate"><div class="highlight"><pre><code>jaxlib._jax.ArrayImpl</code></pre></div></div></div>
    </div>
    <p data-source-ref="thinking-in-jax#immutability">Python's duck-typing allows JAX arrays and NumPy arrays to be used interchangeably in many places. However, there is one important difference between JAX and NumPy arrays: JAX arrays are immutable, meaning that once created their contents cannot be changed.</p>
    <p data-source-ref="thinking-in-jax#numpy-mutation-intro">Here is an example of mutating an array in NumPy:</p>
    <div class="cell docutils container" data-source-ref="thinking-in-jax#numpy-mutation-code">
      <div class="cell_input docutils container"><div class="highlight-ipython3 notranslate"><div class="highlight"><pre><code># NumPy: mutable arrays
x = np.arange(10)
x[0] = 10
print(x)</code></pre></div></div></div>
      <div class="cell_output docutils container"><div class="output stream highlight-myst-ansi notranslate"><div class="highlight"><pre><code>[10  1  2  3  4  5  6  7  8  9]</code></pre></div></div></div>
    </div>
    <p data-source-ref="thinking-in-jax#jax-mutation-intro">The equivalent in JAX results in an error, as JAX arrays are immutable:</p>
    <div class="cell docutils container" data-source-ref="thinking-in-jax#xmode-code">
      <div class="cell_input docutils container"><div class="highlight-ipython3 notranslate"><div class="highlight"><pre><code>%xmode minimal</code></pre></div></div></div>
      <div class="cell_output docutils container"><div class="output stream highlight-myst-ansi notranslate"><div class="highlight"><pre><code>Exception reporting mode: Minimal</code></pre></div></div></div>
    </div>
    <div class="cell tag_raises-exception docutils container" data-source-ref="thinking-in-jax#jax-mutation-error">
      <div class="cell_input docutils container"><div class="highlight-ipython3 notranslate"><div class="highlight"><pre><code># JAX: immutable arrays
x = jnp.arange(10)
x[0] = 10</code></pre></div></div></div>
      <div class="cell_output docutils container"><div class="output traceback highlight-ipythontb notranslate"><div class="highlight"><pre><code>TypeError: JAX arrays are immutable and do not support in-place item assignment. Instead of x[idx] = y, use x = x.at[idx].set(y) or another .at[] method: https://docs.jax.dev/en/latest/_autosummary/jax.numpy.ndarray.at.html</code></pre></div></div></div>
    </div>
    <p data-source-ref="thinking-in-jax#indexed-update">For updating individual elements, JAX provides an <a class="reference external" href="https://docs.jax.dev/en/latest/_autosummary/jax.numpy.ndarray.at.html#jax-numpy-ndarray-at" target="_blank" rel="noreferrer">indexed update syntax</a> that returns an updated copy:</p>
    <div class="cell docutils container" data-source-ref="thinking-in-jax#indexed-update-code">
      <div class="cell_input docutils container"><div class="highlight-ipython3 notranslate"><div class="highlight"><pre><code>y = x.at[0].set(10)
print(x)
print(y)</code></pre></div></div></div>
      <div class="cell_output docutils container"><div class="output stream highlight-myst-ansi notranslate"><div class="highlight"><pre><code>[0 1 2 3 4 5 6 7 8 9]
[10  1  2  3  4  5  6  7  8  9]</code></pre></div></div></div>
    </div>
    <p data-source-ref="thinking-in-jax#see-also">You'll find a few differences between JAX arrays and NumPy arrays once you begin digging in. See also:</p>
    <ul class="simple" data-source-ref="thinking-in-jax#see-also-list">
      <li><p><a class="reference external" href="https://docs.jax.dev/en/latest/key-concepts.html#jax-arrays-jax-array" target="_blank" rel="noreferrer">Key concepts</a> for an introduction to the key concepts of JAX, such as transformations, tracing, jaxprs and pytrees.</p></li>
      <li><p><a class="reference external" href="https://docs.jax.dev/en/latest/notebooks/Common_Gotchas_in_JAX.html" target="_blank" rel="noreferrer">🔪 JAX - The Sharp Bits 🔪</a> for common gotchas when using JAX.</p></li>
    </ul>
  </section>

  <section id="jax-arrays-jax-array">
    <h2 data-source-ref="thinking-in-jax#jax-arrays-title">JAX arrays (<code class="docutils literal notranslate"><span class="pre">jax.Array</span></code>)<a class="headerlink" href="#jax-arrays-jax-array" title="Link to this heading">#</a></h2>
    <p data-source-ref="thinking-in-jax#jax-arrays-key-concepts"><strong>Key concepts:</strong></p>
    <ul class="simple" data-source-ref="thinking-in-jax#jax-arrays-list">
      <li><p>Create arrays using JAX API functions.</p></li>
      <li><p>JAX array objects have a <code class="docutils literal notranslate"><span class="pre">devices</span></code> attribute that indicates where the array is stored.</p></li>
      <li><p>JAX arrays can be <em>sharded</em> across multiple devices for parallel computation.</p></li>
    </ul>
    <p data-source-ref="thinking-in-jax#jax-array-definition">The default array implementation in JAX is <a class="reference external" href="https://docs.jax.dev/en/latest/_autosummary/jax.Array.html#jax.Array" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">jax.Array</span></code></a>. In many ways it is similar to the <a class="reference external" href="https://numpy.org/doc/stable/reference/generated/numpy.ndarray.html#numpy.ndarray" target="_blank" rel="noreferrer"><code class="docutils literal notranslate"><span class="pre">numpy.ndarray</span></code></a> type that you may be familiar with from the NumPy package, but it has some important differences.</p>
  </section>
</section>
`;
