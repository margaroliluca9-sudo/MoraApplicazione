import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./theme.css";
import "./dark.css";
import "./appearance.css";
import { applyTheme, getThemeMode } from "./theme";
import { applyAppearance, getCachedLayout } from "./appearance";

// tema e opzioni grafiche applicati subito, prima del primo disegno
applyTheme(getThemeMode());
applyAppearance(getCachedLayout());

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
