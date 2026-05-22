import * as React from "react";

import { EarlyAccessModal } from "../../apps/early-access/index.ts";

import { CapturePrEntryScreen } from "./capturePr/CapturePrEntryScreen";

export default function PublicSibiEntry(): React.ReactElement {
  const [earlyAccessOpen, setEarlyAccessOpen] = React.useState(false);

  return (
    <>
      <CapturePrEntryScreen onAnalyze={() => setEarlyAccessOpen(true)} />
      <EarlyAccessModal
        open={earlyAccessOpen}
        onClose={() => setEarlyAccessOpen(false)}
        copy={{
          title: "Bring one real PR. I will open the workbench next.",
          description:
            "Sibi is opening with builders who want reproducible ownership over real changes. Leave an email and an optional X handle.",
          successMessage: "You're on the list. I'll reach out with the next Sibi opening.",
        }}
      />
    </>
  );
}
