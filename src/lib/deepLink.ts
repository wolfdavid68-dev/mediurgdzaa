import { DRUGS } from "../data/drugs";
import { PREP_KITS } from "../data/prepKits";
import { filterDrugs } from "./drugSearch";
import type { Drug } from "../types/data";

// Résolution des liens profonds (query params) au lancement de l'app.
// Utilisés par les raccourcis manifest (long-press icône Android), les
// raccourcis Siri / routines Assistant-Gemini et tout lien externe.
// Paramètres supportés :
//   ?mode=acr                — ouvre la modale URGENCE ACR (accès complet requis)
//   ?page=medicaments|protocoles|echelles — page cible (protocoles/echelles :
//                              accès complet requis)
//   ?tab=PISU|incompatibilites|ecg|kits    — sous-onglet Protocoles (idem)
//   ?kit=<id>                — ouvre Protocoles → Kits avec le kit déployé
//                              (ex: ?kit=ktc ; accès complet requis)
//   ?med=<id ou nom>         — préremplit la recherche Médicaments ; si le
//                              résultat est sans ambiguïté (id exact ou
//                              résultat unique), la fiche s'ouvre déployée
//   ?poids=<kg>              — prérègle le poids patient (virgule ou point,
//                              borné à ]0 ; 300] kg)
// Chaque paramètre appliqué est retiré de l'URL (cleanedSearch) pour qu'un
// refresh ne rejoue pas le raccourci ; un paramètre en attente d'accès
// complet reste en place et sera rejoué quand l'accès sera accordé.

type ProtoTab = "PISU" | "incompatibilites" | "ecg" | "kits";

export type DeepLinkResult = {
  showAcr?: boolean;
  page?: "medicaments" | "protocoles" | "echelles";
  protoCategory?: ProtoTab;
  search?: string;
  autoOpenDrugId?: number;
  autoOpenKitId?: string;
  patientWeight?: string;
  /** Query string restante après consommation (sans "?", "" si tout consommé). */
  cleanedSearch: string;
  /** Au moins un paramètre a été appliqué (→ replaceState nécessaire). */
  dirty: boolean;
};

const PROTO_TABS: ProtoTab[] = ["PISU", "incompatibilites", "ecg", "kits"];

const findDrugForParam = (raw: string): { search: string; drug?: Drug; unique: boolean } => {
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) {
    const byId = DRUGS.find((d) => d.id === Number(trimmed));
    if (byId) return { search: byId.nom, drug: byId, unique: true };
    return { search: trimmed, unique: false };
  }
  const matches = filterDrugs({
    search: trimmed,
    cat: "Tout",
    svc: "Tout",
    showFavoritesOnly: false,
    favorites: new Set<number>(),
  });
  return { search: trimmed, drug: matches[0], unique: matches.length === 1 };
};

export const resolveDeepLink = (
  searchString: string,
  hasFullAppAccess: boolean
): DeepLinkResult => {
  const params = new URLSearchParams(searchString);
  const result: DeepLinkResult = { cleanedSearch: "", dirty: false };
  const consume = (key: string) => {
    params.delete(key);
    result.dirty = true;
  };

  // Poids patient — disponible même en accès restreint (le bandeau poids
  // fait partie de la page Médicaments, accessible à tous les profils).
  const poids = params.get("poids");
  if (poids !== null) {
    const normalized = poids.trim().replace(",", ".");
    const kg = Number(normalized);
    if (Number.isFinite(kg) && kg > 0 && kg <= 300) result.patientWeight = normalized;
    consume("poids");
  }

  // Recherche / ouverture d'une fiche médicament — accessible à tous.
  const med = params.get("med");
  if (med !== null) {
    const trimmed = med.trim();
    if (trimmed) {
      const { search, drug, unique } = findDrugForParam(trimmed);
      result.search = search;
      result.page = "medicaments";
      if (unique && drug) result.autoOpenDrugId = drug.id;
    }
    consume("med");
  }

  const pageParam = params.get("page");
  if (pageParam === "medicaments") {
    result.page = "medicaments";
    consume("page");
  } else if (hasFullAppAccess && (pageParam === "protocoles" || pageParam === "echelles")) {
    result.page = pageParam;
    consume("page");
  }

  const tab = params.get("tab");
  if (hasFullAppAccess && tab && PROTO_TABS.includes(tab as ProtoTab)) {
    result.protoCategory = tab as ProtoTab;
    consume("tab");
  }

  // Kit de préparation (ex: ?kit=ktc) — implique Protocoles → onglet Kits.
  const kitParam = params.get("kit");
  if (hasFullAppAccess && kitParam !== null) {
    const kit = PREP_KITS.find((k) => k.id === kitParam.trim().toLowerCase());
    if (kit) {
      result.page = "protocoles";
      result.protoCategory = "kits";
      result.autoOpenKitId = kit.id;
    }
    consume("kit");
  }

  const mode = params.get("mode");
  if (hasFullAppAccess && mode === "acr") {
    result.showAcr = true;
    consume("mode");
  }

  result.cleanedSearch = params.toString();
  return result;
};
