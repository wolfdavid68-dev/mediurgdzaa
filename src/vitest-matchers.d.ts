// Module augmentation pour vitest : ajoute le matcher `toHaveNoViolations`
// (jest-axe) sans toucher aux matchers de @testing-library/jest-dom/vitest
// déjà étendus dans test-setup.ts.
//
// Le fichier DOIT être un module (top-level `export {}`) pour que TS traite
// `declare module "vitest"` comme une augmentation et non une redéclaration.

export {};

declare module "vitest" {
  interface Assertion<T = unknown> {
    toHaveNoViolations(): T;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): unknown;
  }
}
