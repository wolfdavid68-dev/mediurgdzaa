import { DRUGS } from "virtual:drugs-lite";
import { filterDrugs } from "./drugSearch";
import { normalize } from "./normalize";
import type { ClinicalScale, Drug, PrepKit, Protocol } from "../types/data";

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
//   ?onglet=<tab>            — onglet du kit à afficher (avec ?kit uniquement) :
//                              drogues|materiel|checklist|schema|lignes|
//                              sequence|notes, alias « rearmement » → materiel.
//                              Ignoré si l'onglet n'existe pas pour ce kit.
//   ?med=<id ou nom>         — préremplit la recherche Médicaments ; si le
//                              résultat est sans ambiguïté (id exact ou
//                              résultat unique), la fiche s'ouvre déployée
//   ?poids=<kg>              — prérègle le poids patient (virgule ou point,
//                              borné à ]0 ; 300] kg)
//   ?compat=<a>,<b>          — vérification de compatibilité IV entre deux
//                              médicaments : ouvre Incompatibilités en vue
//                              Comparer avec le verdict affiché (ex:
//                              ?compat=noradrenaline,lasilix). Un seul nom →
//                              vue Fiche focalisée. Accès complet requis.
//   ?protocole=<code|texte>  — ouvre le protocole PISU déployé (ex:
//                              ?protocole=pisu5 ou ?protocole=hemorragie) ;
//                              texte ambigu → liste PISU. Accès complet requis.
//   ?echelle=<id|nom>        — ouvre Échelles avec l'échelle déployée (ex:
//                              ?echelle=glasgow). Accès complet requis.
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
  autoOpenKitTab?: string;
  autoOpenProtocolId?: number;
  autoOpenScaleId?: string;
  incompatPair?: [string, string];
  incompatFocus?: string;
  patientWeight?: string;
  /** Query string restante après consommation (sans "?", "" si tout consommé). */
  cleanedSearch: string;
  /** Au moins un paramètre a été appliqué (→ replaceState nécessaire). */
  dirty: boolean;
};

const PROTO_TABS: ProtoTab[] = ["PISU", "incompatibilites", "ecg", "kits"];

// Alias vocaux → clé d'onglet réelle de PrepKitCard (le libellé affiché
// « Réarmement » correspond à l'onglet interne "materiel" des kits cochables).
const KIT_TAB_ALIASES: Record<string, string> = {
  rearmement: "materiel",
  "check-list": "checklist",
};

// Un onglet n'est proposé par PrepKitCard que si le kit a les données
// correspondantes — mêmes conditions que le rendu des <Tab> dans la carte.
const kitTabAvailable = (kit: PrepKit, tab: string): boolean => {
  switch (tab) {
    case "drogues":
    case "materiel":
    case "sequence":
      return true;
    case "checklist":
      return Array.isArray(kit.checklist) && kit.checklist.length > 0;
    case "schema":
      return Boolean(kit.schema);
    case "lignes":
      return kit.id === "ktc";
    case "notes":
      return Boolean(kit.notes && kit.notes.length > 0);
    default:
      return false;
  }
};

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

// « pisu 5 », « PISU5 », « pisu-5 » → même clé compacte que le code officiel.
const compactCode = (value: string) => normalize(value).replace(/[^a-z0-9]+/g, "");

const findProtocolForParam = (raw: string, protocols: Protocol[]): Protocol | undefined => {
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) return protocols.find((p) => p.id === Number(trimmed));
  const compact = compactCode(trimmed);
  if (!compact) return undefined;
  const byCode = protocols.find((p) => compactCode(p.code) === compact);
  if (byCode) return byCode;
  const q = normalize(trimmed);
  const matches = protocols.filter((p) => normalize(`${p.code} ${p.titre}`).includes(q));
  return matches.length === 1 ? matches[0] : undefined;
};

const findScaleForParam = (raw: string, scales: ClinicalScale[]): ClinicalScale | undefined => {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const q = normalize(trimmed);
  const byId = scales.find((s) => normalize(s.id) === q);
  if (byId) return byId;
  const matches = scales.filter((s) => normalize(s.nom).includes(q));
  return matches.length === 1 ? matches[0] : undefined;
};

export const resolveDeepLink = async (
  searchString: string,
  hasFullAppAccess: boolean
): Promise<DeepLinkResult> => {
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
  // ?onglet cible l'onglet interne du kit (ex: ?kit=drain-thoracique&onglet=materiel
  // pour la check-list de réarmement) ; ignoré s'il n'existe pas pour ce kit.
  const kitParam = params.get("kit");
  if (hasFullAppAccess && kitParam !== null) {
    const { PREP_KITS } = await import("../data/prepKits");
    const kit = PREP_KITS.find((k) => k.id === kitParam.trim().toLowerCase());
    if (kit) {
      result.page = "protocoles";
      result.protoCategory = "kits";
      result.autoOpenKitId = kit.id;
      const ongletRaw = params.get("onglet");
      if (ongletRaw !== null) {
        const normalized = ongletRaw.trim().toLowerCase();
        const onglet = KIT_TAB_ALIASES[normalized] ?? normalized;
        if (kitTabAvailable(kit, onglet)) result.autoOpenKitTab = onglet;
      }
    }
    if (params.has("onglet")) consume("onglet");
    consume("kit");
  }

  // Vérification de compatibilité IV (ex: ?compat=noradrenaline,lasilix).
  // Deux noms résolus → vue Comparer avec le verdict ; un seul → vue Fiche ;
  // aucun → on ouvre quand même l'onglet Incompatibilités.
  const compatParam = params.get("compat");
  if (hasFullAppAccess && compatParam !== null) {
    const { resolveIncompatDrugName } = await import("./incompatCatalog");
    const resolved = compatParam
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean)
      .slice(0, 2)
      .map(resolveIncompatDrugName)
      .filter((name): name is string => Boolean(name));
    result.page = "protocoles";
    result.protoCategory = "incompatibilites";
    if (resolved.length === 2 && resolved[0] !== resolved[1]) {
      result.incompatPair = [resolved[0], resolved[1]];
    } else if (resolved.length >= 1) {
      result.incompatFocus = resolved[0];
    }
    consume("compat");
  }

  // Protocole PISU (ex: ?protocole=pisu5 ou ?protocole=hemorragie). Texte
  // ambigu (« detresse respiratoire » = Adulte + Enfant) → liste PISU sans
  // auto-ouverture, jamais un protocole choisi arbitrairement.
  const protocoleParam = params.get("protocole");
  if (hasFullAppAccess && protocoleParam !== null) {
    const { PROTOCOLS } = await import("../data/protocols");
    const protocol = findProtocolForParam(protocoleParam, PROTOCOLS as Protocol[]);
    result.page = "protocoles";
    result.protoCategory = "PISU";
    if (protocol) result.autoOpenProtocolId = protocol.id;
    consume("protocole");
  }

  // Échelle clinique (ex: ?echelle=glasgow, ?echelle=rass).
  const echelleParam = params.get("echelle");
  if (hasFullAppAccess && echelleParam !== null) {
    const { SCALES } = await import("../data/scales");
    const scale = findScaleForParam(echelleParam, SCALES as ClinicalScale[]);
    result.page = "echelles";
    if (scale) result.autoOpenScaleId = scale.id;
    consume("echelle");
  }

  const mode = params.get("mode");
  if (hasFullAppAccess && mode === "acr") {
    result.showAcr = true;
    consume("mode");
  }

  result.cleanedSearch = params.toString();
  return result;
};
