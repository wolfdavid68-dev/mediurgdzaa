// Shim de types minimal pour jest-axe.
//
// On évite @types/jest-axe officiel : il référence @types/jest qui redéfinit
// JestMatchers et entre en conflit avec @testing-library/jest-dom/vitest.
// On déclare ici juste l'API qu'on utilise (`axe`, `configureAxe`,
// `toHaveNoViolations`), sans tirer la dépendance fautive.
//
// Fichier ambient (pas d'import/export top-level) : `declare module "jest-axe"`
// crée le module pour le résolveur.

declare module "jest-axe" {
  type AxeResults = import("axe-core").AxeResults;
  type RunOptions = import("axe-core").RunOptions;
  type Spec = import("axe-core").Spec;

  export type JestAxe = (html: Element | string, options?: RunOptions) => Promise<AxeResults>;

  export const axe: JestAxe;

  export interface ConfigureAxeOptions extends RunOptions {
    globalOptions?: Spec;
  }

  export function configureAxe(options?: ConfigureAxeOptions): JestAxe;

  export const toHaveNoViolations: {
    toHaveNoViolations: (results: AxeResults) => {
      pass: boolean;
      actual: unknown;
      message: () => string;
    };
  };
}
