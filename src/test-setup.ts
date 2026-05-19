// Setup du projet "dom" (cf. vite.config.ts → projects.dom.setupFiles).
//
// `@testing-library/jest-dom/vitest` : étend `expect` avec les matchers
// jest-dom (toBeInTheDocument, toHaveAttribute…) ET fournit
// l'augmentation de types TS (sans cet import, tsc échoue sur
// `.toHaveAttribute`). Le flaky « Invalid Chai property » n'était PAS
// causé par cet import en soi mais par la concurrence des setups entre
// workers — réglé côté config (projet dom sérialisé, cf. vite.config).
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Démontage du DOM après chaque test (défense en profondeur en plus de
// l'auto-cleanup RTL) — évite toute « Found multiple elements » même
// si l'isolation venait à régresser.
afterEach(() => {
  cleanup();
});
