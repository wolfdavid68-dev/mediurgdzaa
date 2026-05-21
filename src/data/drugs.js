// ============================================================
// MediURG — Base de données médicaments d'urgence
// Source : Livret pharmacologique Déchocage + références cliniques
//
// Barrel — agrège les fichiers par catégorie de src/data/drugs/.
// L'API publique (export DRUGS) est inchangée. Pour ajouter un
// médicament, éditer le fichier de sa catégorie (ou en créer un
// nouveau ici et dans le tableau ci-dessous).
// ============================================================

import { DRUGS_HYPNOTIQUES } from "./drugs/hypnotiques.js";
import { DRUGS_ANALGESIE } from "./drugs/analgesie.js";
import { DRUGS_ANTIDOTES } from "./drugs/antidotes.js";
import { DRUGS_CURARES } from "./drugs/curares.js";
import { DRUGS_CATECHOLAMINES } from "./drugs/catecholamines.js";
import { DRUGS_CARDIOLOGIE } from "./drugs/cardiologie.js";
import { DRUGS_NEUROLOGIE } from "./drugs/neurologie.js";
import { DRUGS_DIURETIQUES } from "./drugs/diuretiques.js";
import { DRUGS_ELECTROLYTES } from "./drugs/electrolytes.js";
import { DRUGS_ANTICOAGULANTS } from "./drugs/anticoagulants.js";
import { DRUGS_PNEUMOLOGIE } from "./drugs/pneumologie.js";
import { DRUGS_METABOLIQUE } from "./drugs/metabolique.js";
import { DRUGS_ANTIBIOTIQUES } from "./drugs/antibiotiques.js";
import { DRUGS_SOLUTES } from "./drugs/solutes.js";
import { DRUGS_PRODUITS_SANGUINS } from "./drugs/produits-sanguins.js";

export const DRUGS = [
  ...DRUGS_HYPNOTIQUES,
  ...DRUGS_ANALGESIE,
  ...DRUGS_ANTIDOTES,
  ...DRUGS_CURARES,
  ...DRUGS_CATECHOLAMINES,
  ...DRUGS_CARDIOLOGIE,
  ...DRUGS_NEUROLOGIE,
  ...DRUGS_DIURETIQUES,
  ...DRUGS_ELECTROLYTES,
  ...DRUGS_ANTICOAGULANTS,
  ...DRUGS_PNEUMOLOGIE,
  ...DRUGS_METABOLIQUE,
  ...DRUGS_ANTIBIOTIQUES,
  ...DRUGS_SOLUTES,
  ...DRUGS_PRODUITS_SANGUINS,
];
