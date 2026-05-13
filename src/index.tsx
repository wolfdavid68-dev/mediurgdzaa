import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./style.css";
import App from "./App";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Signale au splash HTML (index.html) que l'app est montée pour qu'il puisse
// se retirer. Le splash attend aussi un délai minimum de 900 ms (cf. inline JS).
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event("mediurg:ready"));
  });
});
