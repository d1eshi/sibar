import * as React from "react";

interface CapturePrEntryScreenProps {
  onAnalyze: () => void;
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

export function CapturePrEntryScreen({ onAnalyze }: CapturePrEntryScreenProps): React.ReactElement {
  const [selectedProvider, setSelectedProvider] = React.useState<PrProvider>("github");
  const [prUrl, setPrUrl] = React.useState(prProviders.github.sampleUrl);
  const visibleProvider = detectPrProvider(prUrl) ?? selectedProvider;

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
    onAnalyze();
  }

  return (
    <main className="captureRoot">
      <form className="capturePanel" aria-label="Capture PR" onSubmit={submitCapture}>
        <div className="captureBrand">Sibi</div>
        <section className="captureIntro">
          <h1>Capture PR</h1>
          <p>Capture a GitHub pull request and turn it into an ownership artifact.</p>
        </section>

        <div className="captureInput">
          <label htmlFor="capturePrUrl">Pull request URL</label>
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
            />
            <span className="captureCheck" aria-hidden="true">✓</span>
          </div>
        </div>

        <div className="captureDivider">
          <span />
          <p>or</p>
          <span />
        </div>

        <button className="pasteDiffDropzone" type="button" aria-label="Paste diff">
          <span className="documentGlyph" aria-hidden="true">&lt;/&gt;</span>
          <strong>Paste diff</strong>
          <small>Paste a unified diff to analyze ownership</small>
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
            <article className="routeSlide slideOne" aria-label="Step 1 Capture PR">
              <div className="slideTopline">
                <span className="slideStep">Step 1</span>
                <span className="slideProgressText">Capture PR</span>
              </div>
              <h3>Give Sibi one real change to inspect.</h3>
              <p>Paste the PR URL or a unified diff. The first job is narrowing ownership to this review, not the whole repo.</p>
              <div className="slidePreview prMini" aria-hidden="true">
                <span className="prAvatar" />
                <div>
                  <strong>#18</strong>
                  <small>Sibi ownership workbench</small>
                </div>
                <span className="miniToken">8 files</span>
              </div>
              <div className="slideMeter" aria-hidden="true"><span /></div>
            </article>
            <article className="routeSlide slideTwo" aria-label="Step 2 Sibi reads the diff">
              <div className="slideTopline">
                <span className="slideStep">Step 2</span>
                <span className="slideProgressText">Read diff</span>
              </div>
              <h3>The diff becomes a bounded reading path.</h3>
              <p>Sibi extracts touched files, caller hints, tests, and missing evidence before it asks you to claim ownership.</p>
              <div className="slidePreview diffMini" aria-hidden="true">
                <span />
                <span />
                <span />
                <small>{"Touched lines -> evidence anchors"}</small>
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
            <article className="routeSlide slideFour" aria-label="Step 4 Ownership artifact">
              <div className="slideTopline">
                <span className="slideStep">Step 4</span>
                <span className="slideProgressText">Ownership artifact</span>
              </div>
              <h3>Leave with a reviewable ownership artifact.</h3>
              <p>Your answers become a compact route: what you own, what only supports the claim, and what remains unresolved.</p>
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
