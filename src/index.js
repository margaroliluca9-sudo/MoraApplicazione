import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./theme.css";
import "./dark.css";
import "./appearance.css";
// grafica già pronta (prima veniva costruita dal telefono mentre usavi l'app: rallentava)
import "./tailwind.css";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { installErrorLog } from "./errorLog";
import { applyTheme, getThemeMode } from "./theme";
import { applyAppearance, getCachedLayout } from "./appearance";

// tema e opzioni grafiche applicati subito, prima del primo disegno
applyTheme(getThemeMode());
applyAppearance(getCachedLayout());

// copia dell'app sul telefono: così si apre anche senza rete (vedi public/sw.js)
if (
  typeof navigator !== "undefined" &&
  "serviceWorker" in navigator &&
  (window.location.protocol === "https:" || window.location.hostname === "localhost")
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// errori sui telefoni → Area admin → System (vedi errorLog.js)
installErrorLog();

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
