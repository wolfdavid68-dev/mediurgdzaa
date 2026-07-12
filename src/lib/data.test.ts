// Tests d'intégrité des données — détectent les références cassées
// silencieuses entre drugs.js / pse.js / incompatibilities.js / protocols.js
// et la liste DRUG_PATTERNS de ProtocolCard.tsx.

import { DRUGS } from "../data/drugs";
import { PSE } from "../data/pse";
import { INCOMPATIBILITIES } from "../data/incompatibilities";
import { PROTOCOLS } from "../data/protocols";
import { PREP_KITS } from "../data/prepKits";
import { DRUG_PATTERNS } from "../components/ProtocolCard";
import { normalize } from "./normalize";
import { calcDose, calcDebit, type PrepFormula, type PseFormula } from "./calc";
import type { Drug, PrepKit } from "../types/data";
import idsSnapshot from "../data/drug-ids.snapshot.json";

// Poids de référence pour les tests de plausibilité clinique
const REF_KG = 70;

type DrugForIntegrity = Drug & { prep?: PrepFormula | null };
type PseEntryForIntegrity = PseFormula & {
  min: number;
  max: number;
  steps: number[];
  extra?: {
    unite: string;
    min: number;
    max: number;
  };
};

const hasMissingKeys = <T extends object>(value: T, keys: string[]) =>
  keys.filter((key) => value[key as keyof T] === undefined || value[key as keyof T] === null);

const drugsForIntegrity = DRUGS as DrugForIntegrity[];
const pseForIntegrity = PSE as Record<string, PseEntryForIntegrity>;
const prepKitsForIntegrity = PREP_KITS as PrepKit[];

// ════════════════════════════════════════════════════════════════
// DRUGS — intégrité des IDs
// ════════════════════════════════════════════════════════════════
describe("DRUGS — intégrité", () => {
  test("aucun id dupliqué", () => {
    const ids = DRUGS.map((d) => d.id);
    const dups = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dups).toEqual([]);
  });

  test("tous les ids sont des entiers > 0", () => {
    const bad = DRUGS.filter((d) => !Number.isInteger(d.id) || d.id <= 0);
    expect(bad).toEqual([]);
  });

  test("champs obligatoires présents (id, nom, commercial, dci, cat, svc, poso)", () => {
    const required = ["id", "nom", "commercial", "dci", "cat", "svc", "poso"];
    const broken = DRUGS.map((d) => ({
      id: d.id,
      nom: d.nom,
      missing: hasMissingKeys(d, required),
    })).filter((x) => x.missing.length > 0);
    expect(broken).toEqual([]);
  });

  // ════════════════════════════════════════════════════════════════
  // ANTI-RENUMÉRATION — protège les notes utilisateurs en localStorage
  // (clé `mediurg-note-{id}`). Si quelqu'un renumère un drug existant,
  // les notes pointent silencieusement sur le mauvais médicament en prod.
  // Le snapshot src/data/drug-ids.snapshot.json fige le mapping id → nom ;
  // toute modification doit être consciente (ajouter au snapshot quand on
  // ajoute un drug, JAMAIS modifier un id existant).
  // ════════════════════════════════════════════════════════════════
  describe("snapshot ids ↔ noms (anti-renumération)", () => {
    test("chaque entrée du snapshot existe encore avec le même nom", () => {
      const drift = idsSnapshot.drugs
        .map(({ id, nom }) => {
          const found = DRUGS.find((d) => d.id === id);
          if (!found) return { id, nom, error: "id supprimé du DRUGS" };
          if (found.nom !== nom) {
            return { id, nom, current: found.nom, error: "nom changé pour cet id" };
          }
          return null;
        })
        .filter(Boolean);
      // Si ce test échoue : un drug a été renuméroté ou supprimé. Les notes
      // localStorage `mediurg-note-{id}` des users en prod vont pointer sur
      // le mauvais médicament. Ne pas modifier le snapshot pour faire passer
      // le test sans avoir réfléchi aux conséquences.
      expect(drift).toEqual([]);
    });

    test("aucun nouveau drug ne devrait être absent du snapshot (rappel à l'auteur)", () => {
      const snapIds = new Set(idsSnapshot.drugs.map((d) => d.id));
      const newDrugs = DRUGS.filter((d) => !snapIds.has(d.id)).map((d) => ({
        id: d.id,
        nom: d.nom,
      }));
      // Si ce test échoue : tu as ajouté un drug. Ajoute-le aussi dans
      // src/data/drug-ids.snapshot.json (champ `drugs`) pour activer la
      // protection anti-renumération sur ce nouvel id.
      expect(newDrugs).toEqual([]);
    });
  });

  test("poso a au moins une posologie adulte ou pédiatrique", () => {
    const broken = DRUGS.filter(
      (d) => (d.poso?.a?.length ?? 0) === 0 && (d.poso?.p?.length ?? 0) === 0
    ).map((d) => `${d.id} ${d.nom}`);
    expect(broken).toEqual([]);
  });

  test("les médicaments à scopage obligatoire déclarent monitoring Scope", () => {
    const scopedCategories = new Set([
      "Hypnotiques",
      "Curares",
      "Catécholamines",
      "Cardiologie",
      "Neurologie",
      "Produits sanguins",
    ]);
    const scopedIds = new Set([
      5, // SUFENTANIL
      6, // MORPHINE
      8, // NARCAN
      12, // BRIDION
      29, // ANEXATE
      30, // GLUCAGEN
      39, // KCL
      40, // SULFATE DE MAGNÉSIUM
      42, // HÉPARINE SODIQUE
      43, // CLOTTAFACT
    ]);
    const missing = DRUGS.filter((drug) => scopedCategories.has(drug.cat) || scopedIds.has(drug.id))
      .filter((drug) => !(drug.monitoring || []).includes("Scope"))
      .map((drug) => `${drug.id} ${drug.nom}`);

    expect(missing).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════
// PSE — chaque clé doit pointer sur un drug existant
// ════════════════════════════════════════════════════════════════
describe("PSE — cohérence avec DRUGS", () => {
  const drugIds = new Set(DRUGS.map((d) => d.id));

  test("toutes les clés PSE correspondent à un drug.id existant", () => {
    const orphan = Object.keys(PSE)
      .map(Number)
      .filter((id) => !drugIds.has(id));
    expect(orphan).toEqual([]);
  });

  test("chaque entrée PSE a conc, unite, min, max, steps", () => {
    const required = ["conc", "unite", "min", "max", "steps"];
    const broken = Object.entries(pseForIntegrity)
      .map(([id, p]) => ({ id, missing: hasMissingKeys(p, required) }))
      .filter((x) => x.missing.length > 0);
    expect(broken).toEqual([]);
  });

  test("unité PSE reconnue par calcDebit", () => {
    const validUnits = [
      "µg/kg/min",
      "mg/kg/h",
      "µg/kg/h",
      "mg/h",
      "UI/kg/h",
      "UI/24h",
      "mL/kg/min",
    ];
    const bad = Object.entries(PSE)
      .filter(([, p]) => !validUnits.includes(p.unite))
      .map(([id, p]) => `${id} → "${p.unite}"`);
    expect(bad).toEqual([]);
  });

  test("min < max et steps non vide", () => {
    const bad = Object.entries(PSE)
      .filter(([, p]) => p.min >= p.max || !p.steps?.length)
      .map(([id]) => id);
    expect(bad).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════
// PREP_KITS — cohérence avec DRUGS et check-lists interactives
// ════════════════════════════════════════════════════════════════
describe("PREP_KITS — cohérence", () => {
  const drugIds = new Set(DRUGS.map((d) => d.id));

  test("chaque drugId de kit pointe vers un drug.id existant", () => {
    const broken: string[] = [];
    prepKitsForIntegrity.forEach((kit) => {
      kit.drogues.forEach((drogue) => {
        if (drogue.drugId !== undefined && !drugIds.has(drogue.drugId)) {
          broken.push(`${kit.id} → ${drogue.nom} drugId=${drogue.drugId}`);
        }
      });
    });
    expect(broken).toEqual([]);
  });

  test("les menus select[from] des check-lists trouvent une drogue du kit", () => {
    const broken: string[] = [];
    prepKitsForIntegrity.forEach((kit) => {
      kit.checklist?.forEach((section) => {
        section.items.forEach((item) => {
          if (item.type !== "select" || !item.from) return;
          const needle = normalize(item.from);
          const hasMatch = kit.drogues.some((drogue) => normalize(drogue.role).includes(needle));
          if (!hasMatch) {
            broken.push(`${kit.id} → ${section.titre} / ${item.label} from="${item.from}"`);
          }
        });
      });
    });
    expect(broken).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════
// INCOMPATIBILITIES — cohérence des références (with / compatibleWith)
// CLAUDE.md : un nom mal orthographié = cellule fantôme silencieuse.
// ════════════════════════════════════════════════════════════════
describe("INCOMPATIBILITIES — cohérence symétrique", () => {
  const drugSet = new Set(INCOMPATIBILITIES.map((e) => e.drug));

  test("aucun drug dupliqué dans la matrice", () => {
    const dups = INCOMPATIBILITIES.map((e) => e.drug).filter((n, i, arr) => arr.indexOf(n) !== i);
    expect(dups).toEqual([]);
  });

  test("toutes les références 'with' pointent sur un drug connu", () => {
    const broken: string[] = [];
    INCOMPATIBILITIES.forEach((entry) => {
      (entry.items || []).forEach((item) => {
        if (!drugSet.has(item.with)) {
          broken.push(`"${entry.drug}" → with: "${item.with}"`);
        }
      });
    });
    expect(broken).toEqual([]);
  });

  test("toutes les références 'compatibleWith' pointent sur un drug connu", () => {
    const broken: string[] = [];
    INCOMPATIBILITIES.forEach((entry) => {
      (entry.compatibleWith || []).forEach((name) => {
        if (!drugSet.has(name)) {
          broken.push(`"${entry.drug}" → compatibleWith: "${name}"`);
        }
      });
    });
    expect(broken).toEqual([]);
  });

  test("aucune référence à soi-même", () => {
    const selfRefs: string[] = [];
    INCOMPATIBILITIES.forEach((entry) => {
      (entry.items || []).forEach((item) => {
        if (item.with === entry.drug) selfRefs.push(`${entry.drug} → with self`);
      });
      (entry.compatibleWith || []).forEach((name) => {
        if (name === entry.drug) selfRefs.push(`${entry.drug} → compatibleWith self`);
      });
    });
    expect(selfRefs).toEqual([]);
  });

  test("type d'incompatibilité reconnu (pH | incompatible)", () => {
    const validTypes = ["pH", "incompatible"];
    const bad: string[] = [];
    INCOMPATIBILITIES.forEach((entry) => {
      (entry.items || []).forEach((item) => {
        if (!validTypes.includes(item.type)) {
          bad.push(`"${entry.drug}" + "${item.with}" → type: "${item.type}"`);
        }
      });
    });
    expect(bad).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════
// PROTOCOLS — intégrité de base
// ════════════════════════════════════════════════════════════════
describe("PROTOCOLS — intégrité", () => {
  test("aucun id dupliqué", () => {
    const ids = PROTOCOLS.map((p) => p.id);
    const dups = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dups).toEqual([]);
  });

  test("aucun code dupliqué", () => {
    const codes = PROTOCOLS.map((p) => p.code);
    const dups = codes.filter((c, i) => codes.indexOf(c) !== i);
    expect(dups).toEqual([]);
  });

  test("chaque protocole a un titre, une couleur, des sections", () => {
    const broken = PROTOCOLS.filter((p) => !p.titre || !p.couleur || !p.sections?.length).map(
      (p) => p.code
    );
    expect(broken).toEqual([]);
  });

  test("types de section reconnus par ProtocolCard.SECTION_META", () => {
    const validTypes = [
      "inclusion",
      "exclusion",
      "gravite",
      "actions",
      "surveillance",
      "recueil",
      "rythme_choquable",
      "rythme_non_choquable",
      "reprise",
    ];
    const bad: string[] = [];
    PROTOCOLS.forEach((p) => {
      p.sections.forEach((s) => {
        if (!validTypes.includes(s.type)) {
          bad.push(`${p.code} → section type "${s.type}"`);
        }
      });
    });
    expect(bad).toEqual([]);
  });

  test("convention Adulte/Enfant : titre 'Enfant' ⇒ code contient 'ENF'", () => {
    // Cf. CLAUDE.md : le filtrage Adulte/Enfant dans ProtocolesPage.tsx dépend de
    // code.includes("ENF") + titre.includes("Adulte"/"Enfant").
    const bad = PROTOCOLS.filter((p) => p.titre.includes("Enfant") !== p.code.includes("ENF")).map(
      (p) => `${p.code} — ${p.titre}`
    );
    expect(bad).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════
// DRUG_PATTERNS — chaque pattern doit retrouver au moins un drug
// via la même recherche normalisée qu'App.tsx
// ════════════════════════════════════════════════════════════════
describe("DRUG_PATTERNS — couverture vers DRUGS", () => {
  const searchHits = (pattern: string) => {
    const q = normalize(pattern);
    return DRUGS.filter((d) => {
      const fields = [d.nom, d.commercial, d.dci, d.classe].filter(Boolean).map(normalize);
      return fields.some((f) => f.includes(q));
    });
  };

  test("chaque pattern matche au moins un drug existant", () => {
    const orphan = DRUG_PATTERNS.filter((p) => searchHits(p).length === 0);
    expect(orphan).toEqual([]);
  });

  test("aucun doublon dans DRUG_PATTERNS", () => {
    const dups = DRUG_PATTERNS.filter((p, i) => DRUG_PATTERNS.indexOf(p) !== i);
    expect(dups).toEqual([]);
  });

  test("aucun pattern ne se termine par un caractère non-word (% ou espace)", () => {
    // Cf. ProtocolCard.tsx : le \b de fin du DRUG_REGEX ne matche pas
    // après un caractère non-word — le pattern serait inopérant.
    const bad = DRUG_PATTERNS.filter((p) => /[^\w]$/.test(p) && !/[a-zA-Zé]$/.test(p.slice(-1)));
    expect(bad).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════
// Plausibilité clinique — détecte les erreurs d'unité 1000× silencieuses
// ════════════════════════════════════════════════════════════════
// Ces tests ne valident PAS la justesse clinique des doses ; ils valident
// la cohérence entre les unités déclarées et les ordres de grandeur des
// concentrations. Une erreur typique : conc_produit en mg/mL au lieu de
// µg/mL → résultat 1000× faux silencieusement.

describe("Plausibilité — préparations IV (drugs.js)", () => {
  // Pour 70 kg adulte, le volume à prélever doit rester raisonnable
  // (entre 0,05 mL — sinon imprécis à la seringue — et 200 mL — sinon
  // c'est qu'une unité est fausse de 1000×).
  const SANE_VOL_MIN = 0.05;

  test("dose_kg × 70 kg / conc_produit donne un volume entre 0,05 et 500 mL", () => {
    // 500 mL = borne haute pour antibios en perfusion lente diluée
    // (vanco, etc.). Au-dessus, c'est probablement une erreur d'unité 1000×.
    const bad: string[] = [];
    drugsForIntegrity.forEach((d) => {
      const p = d.prep;
      if (!p?.dose_kg || !p?.conc_produit) return;
      const vol = (p.dose_kg * REF_KG) / p.conc_produit;
      if (vol < SANE_VOL_MIN || vol > 500) {
        bad.push(
          `${d.id} ${d.nom} → ${vol.toFixed(2)} mL (dose_kg=${p.dose_kg}, conc=${p.conc_produit} ${p.unite}/mL)`
        );
      }
    });
    expect(bad).toEqual([]);
  });

  test("phases × 70 kg / conc_produit donne un volume entre 0,05 et 500 mL", () => {
    // Hidonac autorise des volumes plus grands car les phases sont diluées
    // dans 500–1000 mL de G5%. On assouplit la borne haute.
    const bad: string[] = [];
    drugsForIntegrity.forEach((d) => {
      const p = d.prep;
      if (!p?.phases?.length || !p.conc_produit) return;
      const concProduit = p.conc_produit;
      p.phases.forEach((phase, i) => {
        const vol = (phase.dose_kg * REF_KG) / concProduit;
        if (vol < SANE_VOL_MIN || vol > 500) {
          bad.push(`${d.id} ${d.nom} phase ${i} → ${vol.toFixed(2)} mL`);
        }
      });
    });
    expect(bad).toEqual([]);
  });

  test("unite + conc_produit cohérents (sauf preps spéciales)", () => {
    // Les preps qui calculent autrement (sufenta_table = table Vi/Vf,
    // dose_threshold = seuil ampoules type Anexate) n'ont pas besoin de
    // conc_produit au niveau racine.
    const bad = drugsForIntegrity
      .filter((d) => d.prep)
      .filter((d) => !d.prep?.sufenta_table && d.prep?.dose_threshold === undefined)
      .filter((d) => {
        const hasConc = d.prep?.conc_produit !== undefined;
        const hasUnite = d.prep?.unite !== undefined;
        return hasConc !== hasUnite;
      })
      .map((d) => `${d.id} ${d.nom} (conc=${d.prep?.conc_produit}, unite=${d.prep?.unite})`);
    expect(bad).toEqual([]);
  });
});

describe("Plausibilité — débits PSE (pse.js)", () => {
  // Pour une dose mid-range et un adulte 70 kg, le débit doit tomber
  // dans les valeurs cliniques usuelles d'un PSE (0,1 à 100 mL/h).
  // Hors de cette plage = erreur d'unité quasi-certaine.
  const SANE_RATE_MIN = 0.05;
  const SANE_RATE_MAX = 100;

  test("dose mid-range × 70 kg → débit entre 0,05 et 100 mL/h", () => {
    const bad: string[] = [];
    Object.entries(PSE).forEach(([id, p]) => {
      // Les unités « mL/kg/min » (Octaplex et autres push rapides de
      // produits sanguins) ont volontairement des débits élevés (jusqu'au
      // cap maxMlH) — on les exclut de cette borne 100 mL/h conçue pour
      // les perfusions continues classiques.
      if (p.unite === "mL/kg/min") return;
      if ("inputMode" in p && p.inputMode === "effectiveDose") return;
      const mid = (p.min + p.max) / 2;
      const rate = calcDebit(p, mid, REF_KG);
      if (rate === null) {
        bad.push(`${id} → calcDebit a renvoyé null pour dose=${mid}`);
        return;
      }
      if (rate < SANE_RATE_MIN || rate > SANE_RATE_MAX) {
        bad.push(`${id} → ${rate} mL/h (dose=${mid} ${p.unite}, conc=${p.conc})`);
      }
    });
    expect(bad).toEqual([]);
  });

  test("steps[] sont toutes dans [min, max]", () => {
    const bad: string[] = [];
    Object.entries(PSE).forEach(([id, p]) => {
      p.steps.forEach((s) => {
        if (s < p.min || s > p.max) {
          bad.push(`${id} → step ${s} hors plage [${p.min}, ${p.max}]`);
        }
      });
    });
    expect(bad).toEqual([]);
  });

  test("mode 'extra' (héparine UI/24h) : débit cohérent aussi", () => {
    const bad: string[] = [];
    Object.entries(pseForIntegrity).forEach(([id, p]) => {
      if (!p.extra) return;
      const ex = { unite: p.extra.unite, conc: p.conc };
      const mid = (p.extra.min + p.extra.max) / 2;
      const rate = calcDebit(ex, mid, null);
      if (rate === null || rate < SANE_RATE_MIN || rate > SANE_RATE_MAX) {
        bad.push(`${id} extra → ${rate} mL/h (dose=${mid} ${p.extra.unite})`);
      }
    });
    expect(bad).toEqual([]);
  });
});

describe("Plausibilité — toutes les chaînes poso /kg sont parsables", () => {
  // Si un poso contient un pattern « N unit/kg » mais que calcDose ne le
  // parse pas, l'utilisateur perd silencieusement le calcul → calcul mental
  // → risque d'erreur. Le test garantit que toute chaîne /kg est captée.

  // Pattern minimal qui devrait toujours être parsé par calcDose
  const HAS_DOSE_PATTERN = /\d+(?:[,.]\d+)?\s*(?:mg|µg|mcg|mL|ml|g|UI|U|mmol|mEq)\/kg/i;

  test("chaque poso adulte/péd contenant '/kg' est parsable par calcDose", () => {
    const unparsable: string[] = [];
    DRUGS.forEach((d) => {
      (["a", "p"] as const).forEach((group) => {
        (d.poso?.[group] || []).forEach((line: string, i: number) => {
          if (!HAS_DOSE_PATTERN.test(line)) return; // ligne sans dose/kg, OK
          const res = calcDose(line, REF_KG);
          if (res === null) {
            unparsable.push(`${d.id} ${d.nom} poso.${group}[${i}] : "${line}"`);
          }
        });
      });
    });
    expect(unparsable).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════
// Préparations v2.5 promues — invariant anti-écran-vide adulte/enfant
// ════════════════════════════════════════════════════════════════
describe("Préparations v2.5 publiques — recettes visibles par population", () => {
  // PrepBlock retourne null si toutes les recettes portent un `population` et
  // qu'aucune ne matche la population active (sauf pedTable qui couvre l'enfant
  // via le rendu pédiatrique dédié). Cet invariant protège les préparations
  // promues : ≥ 1 recette visible pour adulte ET pour enfant.
  const promotedIds = new Set([13, 15, 16, 17, 78]);
  const promotedDrugs = DRUGS.filter((drug) => promotedIds.has(drug.id));

  test("chaque préparation promue a ≥1 recette adulte ET enfant", () => {
    const violations: string[] = [];
    promotedDrugs.forEach((drug) => {
      const prep = drug.prep as {
        preparations?: Array<{ population?: string }>;
        pedTable?: unknown;
      };
      const recipes = prep.preparations;
      if (!recipes?.length) return; // pas de recettes → fallback, hors invariant
      (["adulte", "enfant"] as const).forEach((pop) => {
        if (pop === "enfant" && prep.pedTable) return; // pedTable couvre l'enfant
        const visible = recipes.filter((r) => !r.population || r.population === pop);
        if (visible.length === 0) {
          violations.push(`${drug.id} ${drug.nom} : aucune recette "${pop}"`);
        }
      });
    });
    expect(violations).toEqual([]);
  });
});
