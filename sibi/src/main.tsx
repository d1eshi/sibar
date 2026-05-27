import * as React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const mount = document.getElementById("root");

if (mount) {
  const root = createRoot(mount);

  if (import.meta.env.VITE_SIBI_PUBLIC_ENTRY === "true") {
    const { default: PublicSibiEntry } = await import("./PublicSibiEntry");
    root.render(
      <StrictMode>
        <PublicSibiEntry />
      </StrictMode>,
    );
  } else {
    const { default: App } = await import("./App");
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  }
}
