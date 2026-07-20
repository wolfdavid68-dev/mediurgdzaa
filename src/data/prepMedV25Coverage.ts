/**
 * Couverture fonctionnelle de Prep Med V2.5.
 *
 * Ce manifeste ne contient aucune posologie : il indique uniquement quels
 * chemins de rendu/calcul doivent être exercés pour chaque médicament à
 * partir des structures déjà présentes dans DRUGS et PSE.
 */

type PrepMedV25Strategy =
  | "reference_only"
  | "steps"
  | "dose_kg"
  | "phase_doses"
  | "ped_table"
  | "prep_table"
  | "phases"
  | "dose_threshold"
  | "fixed_dilution"
  | "weight_bands"
  | "dose_based_dilution"
  | "dose_input"
  | "effective_input"
  | "pse"
  | "pse_mlh_input"
  | "pse_reference_tables"
  | "pse_extra_unit"
  | "adrenaline_table"
  | "dobutamine_table"
  | "isuprel_table"
  | "sufenta_table"
  | "norad_table"
  | "sufenta_intranasal"
  | "kcl_ivl"
  | "kcl_pediatric"
  | "clottafact_pediatric"
  | "amiklin_adult"
  | "amoxicilline_meningee_pump"
  | "claforan_meningee_pump"
  | "octaplex_inr"
  | "use_table_row"
  | "pediatric_adrenaline_modes"
  | "pediatric_age_band"
  | "pediatric_not_established";

type PrepMedV25CoverageItem = {
  id: number;
  nom: string;
  strategies: readonly PrepMedV25Strategy[];
};

export const PREP_MED_V25_COVERAGE = {
  1: { id: 1, nom: "DIPRIVAN", strategies: ["steps", "dose_kg", "phase_doses", "pse"] },
  2: { id: 2, nom: "HYPNOMIDATE", strategies: ["steps", "dose_kg", "phase_doses"] },
  3: {
    id: 3,
    nom: "HYPNOVEL",
    strategies: ["steps", "fixed_dilution", "phase_doses", "pse"],
  },
  4: { id: 4, nom: "KÉTAMINE", strategies: ["steps", "pse"] },
  5: {
    id: 5,
    nom: "SUFENTANIL",
    strategies: ["steps", "sufenta_table", "sufenta_intranasal", "pse"],
  },
  6: { id: 6, nom: "MORPHINE", strategies: ["steps", "ped_table", "pse"] },
  7: { id: 7, nom: "ACUPAN", strategies: ["steps"] },
  8: { id: 8, nom: "NARCAN", strategies: ["steps", "effective_input", "pse"] },
  9: {
    id: 9,
    nom: "CÉLOCURINE",
    strategies: ["steps", "dose_kg", "phase_doses"],
  },
  10: { id: 10, nom: "ESMERON", strategies: ["steps", "dose_kg", "phase_doses"] },
  11: { id: 11, nom: "NIMBEX", strategies: ["steps", "dose_kg", "phase_doses"] },
  12: { id: 12, nom: "BRIDION", strategies: ["steps", "dose_kg", "phase_doses"] },
  13: {
    id: 13,
    nom: "ADRÉNALINE",
    strategies: [
      "steps",
      "ped_table",
      "fixed_dilution",
      "phase_doses",
      "pse",
      "pse_reference_tables",
      "pediatric_adrenaline_modes",
    ],
  },
  14: { id: 14, nom: "ÉPHÉDRINE", strategies: ["steps", "dose_kg"] },
  15: {
    id: 15,
    nom: "DOBUTAMINE",
    strategies: ["steps", "fixed_dilution", "dobutamine_table", "pse"],
  },
  16: {
    id: 16,
    nom: "ISOPRÉNALINE",
    strategies: ["steps", "fixed_dilution", "isuprel_table", "pse"],
  },
  17: {
    id: 17,
    nom: "NORADRÉNALINE",
    strategies: ["steps", "pse"],
  },
  19: { id: 19, nom: "ATROPINE", strategies: ["steps", "dose_kg", "phase_doses"] },
  20: { id: 20, nom: "BREVIBLOC", strategies: ["steps", "dose_kg", "phase_doses"] },
  21: {
    id: 21,
    nom: "CORDARONE",
    strategies: ["steps", "dose_kg", "ped_table", "phase_doses"],
  },
  22: { id: 22, nom: "DIGOXINE NATIVELLE", strategies: ["steps"] },
  23: { id: 23, nom: "STRIADYNE", strategies: ["steps", "phase_doses"] },
  24: { id: 24, nom: "ACTILYSE", strategies: ["steps", "phase_doses"] },
  25: { id: 25, nom: "METALYSE", strategies: ["steps", "weight_bands"] },
  26: { id: 26, nom: "LOXEN", strategies: ["steps", "phase_doses", "pse"] },
  27: { id: 27, nom: "EUPRESSYL", strategies: ["steps"] },
  28: { id: 28, nom: "RISORDAN", strategies: ["steps", "pse"] },
  29: {
    id: 29,
    nom: "ANEXATE",
    strategies: ["steps", "dose_threshold", "pse", "pse_mlh_input"],
  },
  30: { id: 30, nom: "GLUCAGEN", strategies: ["steps", "dose_input"] },
  31: { id: 31, nom: "POLARAMINE", strategies: ["steps"] },
  32: { id: 32, nom: "VALIUM", strategies: ["steps", "phase_doses"] },
  33: { id: 33, nom: "RIVOTRIL", strategies: ["steps", "phase_doses"] },
  34: {
    id: 34,
    nom: "KEPPRA",
    strategies: ["steps", "dose_kg", "phase_doses", "dose_based_dilution"],
  },
  35: {
    id: 35,
    nom: "PRODILANTIN",
    strategies: ["steps", "prep_table", "use_table_row"],
  },
  36: { id: 36, nom: "LASILIX", strategies: ["steps", "phase_doses", "pse"] },
  37: { id: 37, nom: "CHLORURE DE CALCIUM", strategies: ["steps", "dose_kg"] },
  38: { id: 38, nom: "GLUCONATE DE CALCIUM", strategies: ["steps", "phase_doses"] },
  39: {
    id: 39,
    nom: "KCL",
    strategies: ["steps", "dose_input", "kcl_ivl", "kcl_pediatric"],
  },
  40: { id: 40, nom: "SULFATE DE MAGNÉSIUM", strategies: ["steps", "phase_doses"] },
  41: { id: 41, nom: "EXACYL", strategies: ["steps", "phase_doses"] },
  42: {
    id: 42,
    nom: "HÉPARINE SODIQUE",
    strategies: ["steps", "phase_doses", "pse", "pse_extra_unit"],
  },
  43: { id: 43, nom: "CLOTTAFACT", strategies: ["steps", "clottafact_pediatric"] },
  44: { id: 44, nom: "VENTOLINE", strategies: ["steps", "phase_doses", "pse"] },
  45: {
    id: 45,
    nom: "SOLUMEDROL",
    strategies: ["steps", "dose_kg", "dose_based_dilution", "dose_input"],
  },
  46: { id: 46, nom: "GLUCOSE 30%", strategies: ["steps"] },
  47: { id: 47, nom: "OMÉPRAZOLE", strategies: ["steps", "phase_doses"] },
  48: { id: 48, nom: "PRIMPERAN", strategies: ["steps"] },
  49: { id: 49, nom: "ZOPHREN", strategies: ["steps", "dose_kg", "phase_doses"] },
  50: { id: 50, nom: "SANDOSTATINE", strategies: ["steps", "pse"] },
  51: {
    id: 51,
    nom: "NIMOTOP",
    strategies: ["steps", "pse", "pediatric_not_established"],
  },
  52: {
    id: 52,
    nom: "AMIKLIN",
    strategies: ["steps", "dose_kg", "phase_doses", "dose_based_dilution", "amiklin_adult"],
  },
  53: { id: 53, nom: "AUGMENTIN", strategies: ["steps"] },
  54: {
    id: 54,
    nom: "AMOXICILLINE",
    strategies: ["steps", "dose_kg", "dose_input", "amoxicilline_meningee_pump"],
  },
  55: {
    id: 55,
    nom: "ZOVIRAX",
    strategies: ["steps", "dose_kg", "phase_doses", "dose_based_dilution"],
  },
  56: {
    id: 56,
    nom: "CLAFORAN",
    strategies: ["steps", "dose_kg", "phase_doses", "dose_input", "claforan_meningee_pump"],
  },
  57: { id: 57, nom: "ROCÉPHINE", strategies: ["steps", "dose_kg", "phase_doses"] },
  58: {
    id: 58,
    nom: "GENTAMICINE",
    strategies: ["steps", "dose_kg", "phase_doses", "dose_based_dilution"],
  },
  59: { id: 59, nom: "LÉVOFLOXACINE", strategies: ["steps"] },
  60: { id: 60, nom: "FLAGYL", strategies: ["steps"] },
  61: { id: 61, nom: "TAZOCILLINE", strategies: ["steps"] },
  62: { id: 62, nom: "ROVAMYCINE", strategies: ["steps"] },
  63: { id: 63, nom: "VANCOMYCINE", strategies: ["steps", "dose_kg"] },
  64: { id: 64, nom: "NaCl 0,9%", strategies: ["reference_only"] },
  65: { id: 65, nom: "G5%", strategies: ["reference_only"] },
  66: { id: 66, nom: "ISOFUNDINE", strategies: ["reference_only"] },
  67: { id: 67, nom: "RINGER LACTATE", strategies: ["reference_only"] },
  68: { id: 68, nom: "MANNITOL 20%", strategies: ["steps", "dose_kg", "phase_doses"] },
  69: { id: 69, nom: "CGR", strategies: ["reference_only"] },
  70: { id: 70, nom: "PFC", strategies: ["reference_only"] },
  71: { id: 71, nom: "CP", strategies: ["reference_only"] },
  72: {
    id: 72,
    nom: "VIALEBEX / ALBUMINE HUMAINE",
    strategies: ["steps", "phase_doses"],
  },
  73: {
    id: 73,
    nom: "OCTAPLEX",
    strategies: ["steps", "dose_input", "octaplex_inr", "pse"],
  },
  74: { id: 74, nom: "BRICANYL", strategies: ["steps", "pediatric_age_band"] },
  75: { id: 75, nom: "ATROVENT", strategies: ["steps", "pediatric_age_band"] },
  77: { id: 77, nom: "PERFALGAN", strategies: ["reference_only"] },
  78: { id: 78, nom: "CYANOKIT", strategies: ["steps", "dose_kg", "phase_doses"] },
  79: { id: 79, nom: "HIDONAC", strategies: ["steps", "phases"] },
  80: {
    id: 80,
    nom: "NALBUPHINE",
    strategies: ["steps", "dose_kg", "ped_table", "phase_doses"],
  },
  81: { id: 81, nom: "ISOPTINE", strategies: ["steps", "dose_kg", "phase_doses"] },
  82: { id: 82, nom: "TILDIEM", strategies: ["steps", "phase_doses"] },
  83: { id: 83, nom: "CÉLESTÈNE", strategies: ["steps", "phase_doses"] },
} satisfies Record<number, PrepMedV25CoverageItem>;
