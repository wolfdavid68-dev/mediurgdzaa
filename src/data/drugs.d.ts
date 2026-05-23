// Type shim pour drugs.js : la barrel-import depuis ./drugs reçoit
// désormais `DRUGS` typé `Drug[]` (auto-complétion + détection des accès
// invalides côté consommateurs). Le runtime reste piloté par drugs.js qui
// agrège src/data/drugs/<categorie>.js — voir CLAUDE.md.
import type { Drug } from "../types/data";

export const DRUGS: Drug[];
