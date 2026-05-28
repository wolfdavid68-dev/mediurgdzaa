import { PROTOCOLS } from "../data/protocols";
import { normalize } from "./normalize";

// Index inverse "drug → protocols" : pour une drogue donnée, retourne la liste
// des protocoles qui la mentionnent dans une de leurs sections.
//
// Cas d'usage : sur la fiche Adrénaline, on affiche « Utilisée dans : ACR
// Adulte, Anaphylaxie, Choc anaphylactique » avec un clic pour basculer
// directement sur la page Protocoles.
//
// Match : recherche normalisée (insensible aux accents, casse, espaces) du nom
// de la drogue dans chaque item.text et item.sub des sections. Mémoïsation par
// nom de drogue — le scan complet ne se fait qu'une fois par drug.

// icon = emoji unicode (ex : "🫁", "👶") ou absent. Cf. src/data/protocols.js.
export type ProtocolRef = {
  id: number;
  code: string;
  titre: string;
  icon?: string;
};

const cache = new Map<string, ProtocolRef[]>();

type ProtocolSubText = string | { text?: string };
type ProtocolItemText = string | { text?: string; sub?: ProtocolSubText[] };

const flattenSubText = (sub: ProtocolSubText): string => {
  if (typeof sub === "string") return sub;
  if (sub && typeof sub === "object" && typeof sub.text === "string") return sub.text;
  return "";
};

export const findProtocolsForDrug = (drugNom: string | null | undefined): ProtocolRef[] => {
  if (!drugNom) return [];
  if (cache.has(drugNom)) return cache.get(drugNom)!;

  const target = normalize(drugNom);
  if (!target) {
    cache.set(drugNom, []);
    return [];
  }

  const result: ProtocolRef[] = [];
  for (const p of PROTOCOLS) {
    let found = false;
    for (const sec of p.sections || []) {
      for (const item of (sec.items || []) as ProtocolItemText[]) {
        const itemText = typeof item === "string" ? item : item.text || "";
        if (normalize(itemText).includes(target)) {
          found = true;
          break;
        }
        const subs = typeof item === "string" ? [] : item.sub || [];
        for (const sub of subs) {
          if (normalize(flattenSubText(sub)).includes(target)) {
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (found) break;
    }
    if (found) result.push({ id: p.id, code: p.code, titre: p.titre, icon: p.icon });
  }

  cache.set(drugNom, result);
  return result;
};
