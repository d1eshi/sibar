import * as React from "react";
import styles from "./App.module.css";
import { OnboardingFlow } from "./flows/onboarding/OnboardingFlow";

export default function App() {
  return (
    <main className={styles.researchShell} data-component="research-workspace-root">
      <section className={styles.nativeWindow} data-component="today-screen" data-workspace-state="intent">
        <OnboardingFlow />
      </section>
    </main>
  );
}
