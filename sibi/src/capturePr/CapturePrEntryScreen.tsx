import * as React from "react";

interface CapturePrEntryScreenProps {
  onAnalyze: (sourceRoot: string) => void;
  sourceRootDefault?: string;
  showSourceRootInput?: boolean;
}

const prProviders = {
  github: {
    label: "GitHub",
    host: "github.com",
    placeholder: "https://github.com/org/repo/pull/123",
    sampleUrl: "https://github.com/d1eshi/sibar/pull/18",
  },
  gitlab: {
    label: "GitLab",
    host: "gitlab.com",
    placeholder: "https://gitlab.com/org/repo/-/merge_requests/123",
    sampleUrl: "https://gitlab.com/d1eshi/sibar/-/merge_requests/18",
  },
} as const;

type PrProvider = keyof typeof prProviders;

function detectPrProvider(url: string): PrProvider | null {
  const normalizedUrl = url.trim().toLowerCase();
  const providerMatch = Object.entries(prProviders).find(([, config]) => normalizedUrl.includes(config.host));
  if (providerMatch) return providerMatch[0] as PrProvider;
  return null;
}

export function CapturePrEntryScreen({
  onAnalyze,
  sourceRootDefault = "sibi",
  showSourceRootInput = false,
}: CapturePrEntryScreenProps): React.ReactElement {
  const [selectedProvider, setSelectedProvider] = React.useState<PrProvider>("github");
  const [prUrl, setPrUrl] = React.useState(prProviders.github.sampleUrl);
  const [sourceRoot, setSourceRoot] = React.useState(sourceRootDefault);
  const visibleProvider = detectPrProvider(prUrl) ?? selectedProvider;
  const isSourceRootMode = true;

  function changePrUrl(event: React.ChangeEvent<HTMLInputElement>): void {
    const nextUrl = event.target.value;
    const detectedProvider = detectPrProvider(nextUrl);
    setPrUrl(nextUrl);

    if (detectedProvider !== null && detectedProvider !== selectedProvider) {
      setSelectedProvider(detectedProvider);
    }
  }

  function changeProvider(event: React.ChangeEvent<HTMLSelectElement>): void {
    const nextProvider = event.target.value as PrProvider;
    const currentProvider = detectPrProvider(prUrl);
    setSelectedProvider(nextProvider);

    if (prUrl.trim() === "" || currentProvider !== null) {
      setPrUrl(prProviders[nextProvider].sampleUrl);
    }
  }

  function submitCapture(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onAnalyze(sourceRoot);
  }

  return (
    <main className="captureRoot">
      <form className="capturePanel" aria-label="Live ownership intake" onSubmit={submitCapture}>
        <div className="captureBrand">Sibar</div>
        <section className="captureIntro">
          <h1>Local ownership intake</h1>
          <p>Start a live review from a local source root or demo workspace.</p>
        </section>

        <div className="captureInput">
          <label htmlFor="capturePrUrl">Pull request URL (coming soon)</label>
          <div className="captureInputControl">
            <span
              className={`providerGlyph ${visibleProvider}Glyph`}
              aria-label={`${prProviders[visibleProvider].label} provider`}
              role="img"
            />
            <select
              value={selectedProvider}
              onChange={changeProvider}
              aria-label="Pull request provider"
              className="providerSelect"
              disabled={isSourceRootMode}
            >
              {Object.entries(prProviders).map(([provider, config]) => (
                <option key={provider} value={provider}>
                  {config.label}
                </option>
              ))}
            </select>
            <input
              id="capturePrUrl"
              value={prUrl}
              onChange={changePrUrl}
              placeholder={prProviders[selectedProvider].placeholder}
              disabled={isSourceRootMode}
              aria-label="Pull request URL (coming soon)"
            />
            <span className="captureCheck" aria-hidden="true">!</span>
          </div>
          <p className="captureIntakeNotice">
            <strong>MVP intake scope:</strong> PR URL and paste-diff are not wired yet; use source root to enter a local or demo review.
          </p>
        </div>

        {showSourceRootInput ? (
          <div className="captureInput">
            <label htmlFor="captureSourceRoot">Source root</label>
            <div className="captureInputControl captureInputControlCompact">
              <input
                id="captureSourceRoot"
                value={sourceRoot}
                onChange={(event) => setSourceRoot(event.target.value)}
                placeholder="sibi/demo/react-fastapi-todo"
              />
            </div>
          </div>
        ) : null}

        <p>Future connectors</p>

        <button className="pasteDiffDropzone" type="button" aria-label="Paste diff" disabled>
          <span className="documentGlyph" aria-hidden="true">&lt;/&gt;</span>
          <strong>Paste diff (coming soon)</strong>
          <small>Unified diff intake is available in a future controlled version.</small>
        </button>

        <button className="capturePrimary" type="submit" aria-label="Analyze ownership">
          <span aria-hidden="true">✦</span>
          Analyze ownership
        </button>
      </form>

      <section className="routePreview" aria-label="Ownership route preview">
        <header className="routePreviewHeader">
          <h2>Ownership route</h2>
        </header>

        <div className="routeCanvas">
          <div className="routeSlideDeck" aria-label="Automatic ownership route guide">
            <article className="routeSlide slideOne" aria-label="Step 1 Source root">
              <div className="slideTopline">
                <span className="slideStep">Step 1</span>
                <span className="slideProgressText">Source root</span>
              </div>
              <h3>Point to a local path and start there.</h3>
              <p>Use a source root or demo workspace to keep the review bounded and actionable.</p>
              <div className="slidePreview prMini" aria-hidden="true">
                <span className="prAvatar" />
                <div>
                  <strong>sibi/demo</strong>
                  <small>react-fastapi-todo</small>
                </div>
                <span className="miniToken">12 files</span>
              </div>
              <div className="slideMeter" aria-hidden="true"><span /></div>
            </article>
            <article className="routeSlide slideTwo" aria-label="Step 2 Live evidence">
              <div className="slideTopline">
                <span className="slideStep">Step 2</span>
                <span className="slideProgressText">Live evidence</span>
              </div>
              <h3>Build a bounded evidence rail.</h3>
              <p>Sibar extracts local file context, callers, tests, and missing evidence before asking for a focused claim.</p>
              <div className="slidePreview diffMini" aria-hidden="true">
                <span />
                <span />
                <span />
                <small>{"Evidence -> gap candidates"}</small>
              </div>
              <div className="slideMeter" aria-hidden="true"><span /></div>
            </article>
            <article className="routeSlide slideThree" aria-label="Step 3 You prove the boundary">
              <div className="slideTopline">
                <span className="slideStep">Step 3</span>
                <span className="slideProgressText">Prove boundary</span>
              </div>
              <h3>You answer the smallest ownership question.</h3>
              <p>The workbench asks for one explanation: what changed, why it is safe, and what evidence supports that claim.</p>
              <div className="slidePreview graphMini" aria-hidden="true">
                <span className="node green" />
                <span className="node green lower" />
                <span className="node amber" />
                <span className="node red" />
                <strong>{"claim -> evidence -> gap"}</strong>
              </div>
              <div className="slideMeter" aria-hidden="true"><span /></div>
            </article>
            <article className="routeSlide slideFour" aria-label="Step 4 Report">
              <div className="slideTopline">
                <span className="slideStep">Step 4</span>
                <span className="slideProgressText">Report</span>
              </div>
              <h3>Take away a reviewable ownership report.</h3>
              <p>Your answers become a compact output: what you own, what supports that claim, and what remains open.</p>
              <div className="slidePreview artifactMini" aria-hidden="true">
                <span className="artifactState owned">
                  <i />
                  <strong>Owns</strong>
                  <small>ready to carry forward</small>
                </span>
                <span className="artifactState support">
                  <i />
                  <strong>Supports</strong>
                  <small>evidence, not ownership</small>
                </span>
                <span className="artifactState gap">
                  <i />
                  <strong>Gap</strong>
                  <small>return condition</small>
                </span>
              </div>
              <div className="slideMeter" aria-hidden="true"><span /></div>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
