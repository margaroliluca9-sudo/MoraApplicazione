import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./theme.css";
import "./dark.css";
import { applyTheme, getThemeMode } from "./theme";

// tema applicato subito, prima del primo disegno (niente lampo bianco)
applyTheme(getThemeMode());

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
