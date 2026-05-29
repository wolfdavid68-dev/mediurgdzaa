// Types partagés pour les données cliniques (drugs / protocols / kits).
// Aujourd'hui les fichiers data/*.js restent en JS dense (raisons éditoriales
// — voir CLAUDE.md), mais les CONSOMMATEURS TS gagnent à typer ce qu'ils
// reçoivent : auto-complétion + détection de bugs comme un prop oublié dans
// une chaîne (ex. patientWeight non passé à un DrugList — la signature
// `Drug[]` ne suffit pas à le détecter, mais les props du composant si).
//
// Le `prep` est volontairement union large : 4 shapes coexistent (dose_kg
// standard, dose_threshold type Anexate, phases successives type Hidonac,
// fixed_dilution preview). Tous les champs sont optionnels — chaque shape
// pioche ce dont elle a besoin.

type DrugPosology = {
  a?: string[];
  p?: string[];
};

type PedTableBande = {
  kg_min?: number | null;
  kg_max?: number | null;
  mode: "inject" | "dilute";
  preparation: string;
  vol_per_kg: number;
  volume_final?: number;
  solvant?: string;
  admin?: string;
  step?: number;
  round_mode?: "up" | "down" | "round";
};

type PedTable = {
  titre: string;
  description?: string;
  bandes: PedTableBande[];
};

type DrugPrepPhase = {
  label: string;
  duree: string;
  dose_kg: number;
  solvant_vol?: number;
};

type DrugPrepTableRow = {
  poids: number;
  vi: number;
  vf: number;
  vitesse: number;
  debitEp: number;
  temps: number;
};

type DrugPrepTable = {
  titre: string;
  description?: string;
  rows: DrugPrepTableRow[];
};

type DrugPrep = {
  solvant?: string;
  volume_final?: number | null;
  conc_finale?: string;
  conc_produit?: number;
  unite?: string;
  dose_kg?: number;
  dose_max_kg?: number;
  duree?: string;
  stabilite?: string;
  debit?: string;
  etapes?: string[];
  notes?: string[];
  pedTable?: PedTable;
  table?: DrugPrepTable;
  phases?: DrugPrepPhase[];
  // dose_threshold (ex : Anexate) : sélection d'ampoules selon une dose-seuil
  dose_threshold?: number;
  amp_high?: number;
  amp_low?: number;
  vol_high?: number;
  vol_low?: number;
  // sufenta_table : table Vi/Vf pédiatrique par poids
  sufenta_table?: boolean;
  // fixed_dilution (preview) : recette unique non poids-dépendante
  fixed_dilution?: boolean;
  fd_prelever?: string;
  prelever_total?: boolean;
  prelever_label?: string;
  prelever_vol?: number;
  dose_calc?: boolean;
};

export type Drug = {
  id: number;
  nom: string;
  commercial: string;
  dci: string;
  classe: string;
  cat: string;
  svc: string[];
  couleur: string;
  icon: string;
  desc: string;
  indic: string[];
  ci?: string[];
  ei?: string[];
  cond?: string[];
  poso: DrugPosology;
  prep?: DrugPrep | null;
};

// ── Protocole (PISU / SAUV) ───────────────────────────────────
type ProtocolSectionType =
  | "inclusion"
  | "exclusion"
  | "gravite"
  | "actions"
  | "surveillance"
  | "recueil"
  | "rythme_choquable"
  | "rythme_non_choquable"
  | "reprise";

type ProtocolItem = { text: string; sub?: string[] };

type ProtocolSection = {
  titre: string;
  type: ProtocolSectionType;
  items: ProtocolItem[];
};

export type Protocol = {
  id: number;
  code: string;
  version?: string;
  valide?: string;
  titre: string;
  auteurs?: string[];
  ref?: string;
  service?: string;
  couleur: string;
  icon: string;
  sections: ProtocolSection[];
};

// ── Kit de préparation (ISR, ACR, KTC, PA, drain, anaphylaxie…) ─
type PrepKitDrogue = {
  drugId?: number;
  nom: string;
  role: string;
  dose: string;
  prep?: string;
  note?: string;
};

type PrepKitSchemaLegende = { titre: string; items: string[] };

type PrepKitSchema = {
  img: string;
  alt: string;
  source?: string;
  intro?: string;
  legende: PrepKitSchemaLegende[];
};

// ── Check-list interactive (KitChecklist + kit ISR) ───────────
// Trois types d'items : case à cocher, choix exclusifs en chips, saisie
// libre (avec unité optionnelle), et menu déroulant peuplé à partir des
// drogues du kit filtrées par mot-clé sur le rôle.
export type ChecklistItem =
  | { type: "check"; label: string }
  | {
      type: "choice";
      label: string;
      options: string[];
      scale?: "mallampati" | "cormack";
    }
  | { type: "select"; label: string; from?: string; options?: string[] }
  | { type: "text"; label: string; placeholder?: string; unit?: string };

export type ChecklistSection = { titre: string; items: ChecklistItem[] };

export type PrepKit = {
  id: string;
  nom: string;
  cat: string;
  couleur: string;
  icon: string;
  desc: string;
  materiel: string[];
  drogues: PrepKitDrogue[];
  sequence: string[];
  notes?: string[];
  schema?: PrepKitSchema;
  checklist?: ChecklistSection[];
};

// ── Échelles cliniques ────────────────────────────────────────
type ScaleOption = {
  score: number;
  label: string;
  description?: string;
};

type ScaleVariant = {
  id: string;
  label: string;
  options: ScaleOption[];
};

export type ScaleItem = {
  label: string;
  options?: ScaleOption[];
  variants?: ScaleVariant[];
};

type ScaleInterpretation = {
  severity: string;
  color: string;
};

type SumScale = {
  id: string;
  nom: string;
  icon: string;
  description: string;
  type: "sum";
  items: ScaleItem[];
  interpret: (total: number) => ScaleInterpretation;
};

type SinglePickScale = {
  id: string;
  nom: string;
  icon: string;
  description: string;
  type: "single-pick";
  options: ScaleOption[];
  interpret: (total: number) => ScaleInterpretation;
};

export type ClinicalScale = SumScale | SinglePickScale;

// ── Changelog ─────────────────────────────────────────────────
type ChangelogChangeType = "feat" | "fix" | "chore" | "refactor" | "docs";

type ChangelogChange = {
  type: ChangelogChangeType;
  text: string;
};

export type ChangelogEntry = {
  version: string;
  date: string;
  titre?: string;
  changes: ChangelogChange[];
};
