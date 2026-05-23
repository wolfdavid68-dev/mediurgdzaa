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
