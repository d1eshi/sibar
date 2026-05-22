import * as React from "react";

import {
  requestEarlyAccessLead,
  type EarlyAccessLeadInput,
  type EarlyAccessResult,
} from "./client.ts";

export interface EarlyAccessModalCopy {
  eyebrow?: string;
  title?: string;
  description?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  xHandleLabel?: string;
  xHandleOptionalLabel?: string;
  xHandlePlaceholder?: string;
  submitLabel?: string;
  submittingLabel?: string;
  successMessage?: string;
  closeLabel?: string;
}

export interface EarlyAccessModalProps {
  open: boolean;
  onClose: () => void;
  copy?: EarlyAccessModalCopy;
  requestAccess?: (input: EarlyAccessLeadInput) => Promise<EarlyAccessResult>;
}

type SubmissionState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

const defaultCopy = {
  eyebrow: "Early access",
  title: "Leave your email. I will open the workbench next.",
  description:
    "Sibar is opening with builders who want reproducible ownership over real changes. Leave an email and an optional X handle.",
  emailLabel: "Email",
  emailPlaceholder: "you@example.com",
  xHandleLabel: "X handle",
  xHandleOptionalLabel: "optional",
  xHandlePlaceholder: "@d1eshi",
  submitLabel: "Join early access",
  submittingLabel: "Joining...",
  successMessage: "You're on the list. I will reach out with the next opening.",
  closeLabel: "Close early access",
} satisfies Required<EarlyAccessModalCopy>;

const earlyAccessModalStyles = `
.sibarEarlyAccessOverlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: clamp(18px, 4vw, 48px);
  background: rgba(7, 14, 27, 0.42);
  backdrop-filter: blur(12px);
}

.sibarEarlyAccessModal {
  position: relative;
  width: min(100%, clamp(22rem, 42vw, 34rem));
  border: 1px solid rgba(101, 81, 214, 0.18);
  border-radius: 22px;
  padding: clamp(24px, 4vw, 38px);
  background:
    radial-gradient(circle at 88% 8%, rgba(101, 81, 214, 0.13), transparent 32%),
    #ffffff;
  box-shadow: 0 28px 90px rgba(17, 18, 35, 0.28);
  color: #071827;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.sibarEarlyAccessClose {
  position: absolute;
  right: 16px;
  top: 16px;
  width: 34px;
  height: 34px;
  border: 1px solid #e1def6;
  border-radius: 999px;
  color: #4b338f;
  background: #ffffff;
  font-size: 18px;
  font-weight: 850;
  line-height: 1;
  cursor: pointer;
}

.sibarEarlyAccessEyebrow {
  width: fit-content;
  margin: 0;
  padding: 8px 11px;
  border-radius: 999px;
  color: #4b338f;
  background: #f1efff;
  font-size: 12px;
  font-weight: 850;
  text-transform: uppercase;
}

.sibarEarlyAccessModal h2 {
  max-width: 14ch;
  margin: 24px 0 0;
  color: #071827;
  font-size: clamp(30px, 5vw, 42px);
  line-height: 1;
  letter-spacing: 0;
}

.sibarEarlyAccessCopy {
  margin: 18px 0 0;
  color: #526372;
  font-size: clamp(16px, 2vw, 18px);
  line-height: 1.45;
}

.sibarEarlyAccessForm {
  display: grid;
  gap: 10px;
  margin-top: 28px;
}

.sibarEarlyAccessForm label {
  color: #101b25;
  font-size: 14px;
  font-weight: 780;
}

.sibarEarlyAccessForm label span {
  color: #718091;
  font-weight: 650;
}

.sibarEarlyAccessForm input {
  min-width: 0;
  min-height: 48px;
  border: 1px solid #d8dfe8;
  border-radius: 10px;
  padding: 0 14px;
  color: #172635;
  background: #fbfcfd;
  outline: 0;
  font: inherit;
}

.sibarEarlyAccessForm input:focus {
  border-color: #6551d6;
  box-shadow: 0 0 0 3px rgba(101, 81, 214, 0.12);
}

.sibarEarlyAccessSubmit {
  min-height: 52px;
  margin-top: 8px;
  border: 0;
  border-radius: 10px;
  color: #ffffff;
  background: linear-gradient(135deg, #7259e4, #5d45c4 56%, #422c83);
  box-shadow: 0 14px 28px rgba(76, 51, 143, 0.22);
  font-size: 16px;
  font-weight: 850;
  cursor: pointer;
}

.sibarEarlyAccessSubmit:disabled {
  cursor: wait;
  opacity: 0.72;
}

.sibarEarlyAccessStatus {
  min-height: 20px;
  margin: 2px 0 0;
  color: #5b6876;
  font-size: 13px;
  line-height: 1.35;
}

.sibarEarlyAccessStatus.success {
  color: #4b338f;
  font-weight: 760;
}

.sibarEarlyAccessStatus.error {
  color: #a64040;
  font-weight: 760;
}
`;

export function EarlyAccessModal({
  open,
  onClose,
  copy,
  requestAccess = requestEarlyAccessLead,
}: EarlyAccessModalProps): React.ReactElement | null {
  const [email, setEmail] = React.useState("");
  const [xHandle, setXHandle] = React.useState("");
  const [submissionState, setSubmissionState] = React.useState<SubmissionState>({ kind: "idle" });
  const emailInputRef = React.useRef<HTMLInputElement | null>(null);
  const modalCopy = { ...defaultCopy, ...copy };

  React.useEffect(() => {
    if (!open) return;

    setSubmissionState({ kind: "idle" });
    window.setTimeout(() => emailInputRef.current?.focus(), 0);
  }, [open]);

  if (!open) return null;

  async function submitEarlyAccess(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmissionState({ kind: "submitting" });

    try {
      await requestAccess({ email, xHandle });
      setSubmissionState({ kind: "success" });
    } catch (error) {
      setSubmissionState({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not join early access.",
      });
    }
  }

  const statusMessage =
    submissionState.kind === "success"
      ? modalCopy.successMessage
      : submissionState.kind === "error"
        ? submissionState.message
        : "";

  return (
    <div className="sibarEarlyAccessOverlay" role="presentation" onMouseDown={onClose}>
      <style>{earlyAccessModalStyles}</style>
      <section
        className="sibarEarlyAccessModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sibarEarlyAccessTitle"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="sibarEarlyAccessClose" type="button" aria-label={modalCopy.closeLabel} onClick={onClose}>
          x
        </button>
        <p className="sibarEarlyAccessEyebrow">{modalCopy.eyebrow}</p>
        <h2 id="sibarEarlyAccessTitle">{modalCopy.title}</h2>
        <p className="sibarEarlyAccessCopy">{modalCopy.description}</p>

        <form className="sibarEarlyAccessForm" onSubmit={submitEarlyAccess}>
          <label htmlFor="sibarEarlyAccessEmail">{modalCopy.emailLabel}</label>
          <input
            ref={emailInputRef}
            id="sibarEarlyAccessEmail"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={modalCopy.emailPlaceholder}
            autoComplete="email"
            required
          />

          <label htmlFor="sibarEarlyAccessXHandle">
            {modalCopy.xHandleLabel} <span>{modalCopy.xHandleOptionalLabel}</span>
          </label>
          <input
            id="sibarEarlyAccessXHandle"
            name="x_handle"
            type="text"
            value={xHandle}
            onChange={(event) => setXHandle(event.target.value)}
            placeholder={modalCopy.xHandlePlaceholder}
            autoComplete="off"
            inputMode="text"
          />

          <button className="sibarEarlyAccessSubmit" type="submit" disabled={submissionState.kind === "submitting"}>
            {submissionState.kind === "submitting" ? modalCopy.submittingLabel : modalCopy.submitLabel}
          </button>
          <p className={`sibarEarlyAccessStatus ${submissionState.kind}`} aria-live="polite">
            {statusMessage}
          </p>
        </form>
      </section>
    </div>
  );
}
