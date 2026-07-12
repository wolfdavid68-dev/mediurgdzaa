declare module "virtual:drugs-lite" {
  import type { Drug } from "./types/data";

  export const DRUGS: Drug[];
}

declare module "virtual:drug-details" {
  import type { Drug } from "./types/data";

  export const DRUG_DETAILS: Array<Pick<Drug, "id" | "cond" | "prep">>;
}
