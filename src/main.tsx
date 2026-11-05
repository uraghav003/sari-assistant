import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { purgeLegacySecrets } from "./lib/privacy";
import { startMailAlerts } from "./lib/mail-alerts";

// Old builds stored API keys and tokens in localStorage — remove them.
purgeLegacySecrets();
startMailAlerts();

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter><App /></BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);

// Installable mobile shell. The service worker only caches the static shell —
// never API responses (see public/sw.js).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // The offline shell is a progressive enhancement; failure is non-fatal.
    });
  });
}
