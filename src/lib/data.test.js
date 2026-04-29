// Tests d'intégrité des données — détectent les références cassées
// silencieuses entre drugs.js / pse.js / incompatibilities.js / protocols.js
// et la liste DRUG_PATTERNS de ProtocolCard.js.

import { DRUGS } from "../data/drugs";
import { PSE } from "../data/pse";
import { INCOMPATIBILITIES } from "../data/incompatibilities";
import { PROTOCOLS } from "../data/protocols";
import { DRUG_PATTERNS } from "../components/ProtocolCard";
import { normalize } from "./normalize";
import { calcDose, calcDebit } from "./calc";

// Poids de référence pour les tests de plausibilité clinique
const REF_KG = 70;

// ════════════════════════════════════════════════════════════════
// DRUGS — intégrité des IDs
// ════════════════════════════════════════════════════════════════
describe("DRUGS — intégrité", () => {
  test("aucun id dupliqué", () => {
    const ids = DRUGS.map(d => d.id);
    const dups = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dups).toEqual([]);
  });

  test("tous les ids sont des entiers > 0", () => {
    const bad = DRUGS.filter(d => !Number.isInteger(d.id) || d.id <= 0);
    expect(bad).toEqual([]);
  });

  test("champs obligatoires présents (id, nom, commercial, dci, cat, svc, poso)", () => {
    const required = ["id", "nom", "commercial", "dci", "cat", "svc", "poso"];
    const broken = DRUGS
      .map(d => ({ id: d.id, nom: d.nom, missing: required.filter(k => d[k] === undefined || d[k] === null) }))
      .filter(x => x.missing.length > 0);
    expect(broken).toEqual([]);
  });

  test("poso a au moins une posologie adulte ou pédiatrique", () => {
    const broken = DRUGS
      .filter(d => !(d.poso?.a?.length > 0) && !(d.poso?.p?.length > 0))
      .map(d => `${d.id} ${d.nom}`);
    expect(broken).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════
// PSE — chaque clé doit pointer sur un drug existant
// ════════════════════════════════════════════════════════════════
describe("PSE — cohérence avec DRUGS", () => {
  const drugIds = new Set(DRUGS.map(d => d.id));

  test("toutes les clés PSE correspondent à un drug.id existant", () => {
    const orphan = Object.keys(PSE)
      .map(Number)
      .filter(id => !drugIds.has(id));
    expect(orphan).toEqual([]);
  });

  test("chaque entrée PSE a conc, unite, min, max, steps", () => {
    const required = ["conc", "unite", "min", "max", "steps"];
    const broken = Object.entries(PSE)
      .map(([id, p]) => ({ id, missing: required.filter(k => p[k] === undefined) }))
      .filter(x => x.missing.length > 0);
    expect(broken).toEqual([]);
  });

  test("unité PSE reconnue par calcDebit", () => {
    const validUnits = ["µg/kg/min", "mg/kg/h", "µg/kg/h", "mg/h", "UI/kg/h", "UI/24h"];
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
// INCOMPATIBILITIES — cohérence des références (with / compatibleWith)
// CLAUDE.md : un nom mal orthographié = cellule fantôme silencieuse.
// ════════════════════════════════════════════════════════════════
describe("INCOMPATIBILITIES — cohérence symétrique", () => {
  const drugSet = new Set(INCOMPATIBILITIES.map(e => e.drug));

  test("aucun drug dupliqué dans la matrice", () => {
    const dups = INCOMPATIBILITIES
      .map(e => e.drug)
      .filter((n, i, arr) => arr.indexOf(n) !== i);
    expect(dups).toEqual([]);
  });

  test("toutes les références 'with' pointent sur un drug connu", () => {
    const broken = [];
    INCOMPATIBILITIES.forEach(entry => {
      (entry.items || []).forEach(item => {
        if (!drugSet.has(item.with)) {
          broken.push(`"${entry.drug}" → with: "${item.with}"`);
        }
      });
    });
    expect(broken).toEqual([]);
  });

  test("toutes les références 'compatibleWith' pointent sur un drug connu", () => {
    const broken = [];
    INCOMPATIBILITIES.forEach(entry => {
      (entry.compatibleWith || []).forEach(name => {
        if (!drugSet.has(name)) {
          broken.push(`"${entry.drug}" → compatibleWith: "${name}"`);
        }
      });
    });
    expect(broken).toEqual([]);
  });

  test("aucune référence à soi-même", () => {
    const selfRefs = [];
    INCOMPATIBILITIES.forEach(entry => {
      (entry.items || []).forEach(item => {
        if (item.with === entry.drug) selfRefs.push(`${entry.drug} → with self`);
      });
      (entry.compatibleWith || []).forEach(name => {
        if (name === entry.drug) selfRefs.push(`${entry.drug} → compatibleWith self`);
      });
    });
    expect(selfRefs).toEqual([]);
  });

  test("type d'incompatibilité reconnu (pH | incompatible)", () => {
    const validTypes = ["pH", "incompatible"];
    const bad = [];
    INCOMPATIBILITIES.forEach(entry => {
      (entry.items || []).forEach(item => {
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
    const ids = PROTOCOLS.map(p => p.id);
    const dups = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dups).toEqual([]);
  });

  test("aucun code dupliqué", () => {
    const codes = PROTOCOLS.map(p => p.code);
    const dups = codes.filter((c, i) => codes.indexOf(c) !== i);
    expect(dups).toEqual([]);
  });

  test("chaque protocole a un titre, une couleur, des sections", () => {
    const broken = PROTOCOLS
      .filter(p => !p.titre || !p.couleur || !p.sections?.length)
      .map(p => p.code);
    expect(broken).toEqual([]);
  });

  test("types de section reconnus par ProtocolCard.SECTION_META", () => {
    const validTypes = [
      "inclusion", "exclusion", "gravite", "actions",
      "surveillance", "recueil", "rythme_choquable",
      "rythme_non_choquable", "reprise",
    ];
    const bad = [];
    PROTOCOLS.forEach(p => {
      p.sections.forEach(s => {
        if (!validTypes.includes(s.type)) {
          bad.push(`${p.code} → section type "${s.type}"`);
        }
      });
    });
    expect(bad).toEqual([]);
  });

  test("convention Adulte/Enfant : titre 'Enfant' ⇒ code contient 'ENF'", () => {
    // Cf. CLAUDE.md : le filtrage Adulte/Enfant dans App.js dépend de
    // code.includes("ENF") + titre.includes("Adulte"/"Enfant").
    const bad = PROTOCOLS
      .filter(p => p.titre.includes("Enfant") !== p.code.includes("ENF"))
      .map(p => `${p.code} — ${p.titre}`);
    expect(bad).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════
// DRUG_PATTERNS — chaque pattern doit retrouver au moins un drug
// via la même recherche normalisée qu'App.js
// ════════════════════════════════════════════════════════════════
describe("DRUG_PATTERNS — couverture vers DRUGS", () => {
  const searchHits = (pattern) => {
    const q = normalize(pattern);
    return DRUGS.filter(d => {
      const fields = [d.nom, d.commercial, d.dci, d.classe].filter(Boolean).map(normalize);
      return fields.some(f => f.includes(q));
    });
  };

  test("chaque pattern matche au moins un drug existant", () => {
    const orphan = DRUG_PATTERNS.filter(p => searchHits(p).length === 0);
    expect(orphan).toEqual([]);
  });

  test("aucun doublon dans DRUG_PATTERNS", () => {
    const dups = DRUG_PATTERNS.filter((p, i) => DRUG_PATTERNS.indexOf(p) !== i);
    expect(dups).toEqual([]);
  });

  test("aucun pattern ne se termine par un caractère non-word (% ou espace)", () => {
    // Cf. ProtocolCard.js : le \b de fin du DRUG_REGEX ne matche pas
    // après un caractère non-word — le pattern serait inopérant.
    const bad = DRUG_PATTERNS.filter(p => /[^\w]$/.test(p) && !/[a-zA-Zé]$/.test(p.slice(-1)));
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
  const SANE_VOL_MAX = 200;

  test("dose_kg × 70 kg / conc_produit donne un volume entre 0,05 et 500 mL", () => {
    // 500 mL = borne haute pour antibios en perfusion lente diluée
    // (vanco, etc.). Au-dessus, c'est probablement une erreur d'unité 1000×.
    const bad = [];
    DRUGS.forEach(d => {
      const p = d.prep;
      if (!p?.dose_kg || !p?.conc_produit) return;
      const vol = (p.dose_kg * REF_KG) / p.conc_produit;
      if (vol < SANE_VOL_MIN || vol > 500) {
        bad.push(`${d.id} ${d.nom} → ${vol.toFixed(2)} mL (dose_kg=${p.dose_kg}, conc=${p.conc_produit} ${p.unite}/mL)`);
      }
    });
    expect(bad).toEqual([]);
  });

  test("phases × 70 kg / conc_produit donne un volume entre 0,05 et 500 mL", () => {
    // Hidonac autorise des volumes plus grands car les phases sont diluées
    // dans 500–1000 mL de G5%. On assouplit la borne haute.
    const bad = [];
    DRUGS.forEach(d => {
      const p = d.prep;
      if (!p?.phases?.length || !p.conc_produit) return;
      p.phases.forEach((phase, i) => {
        const vol = (phase.dose_kg * REF_KG) / p.conc_produit;
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
    const bad = DRUGS
      .filter(d => d.prep)
      .filter(d => !d.prep.sufenta_table && d.prep.dose_threshold === undefined)
      .filter(d => {
        const hasConc = d.prep.conc_produit !== undefined;
        const hasUnite = d.prep.unite !== undefined;
        return hasConc !== hasUnite;
      })
      .map(d => `${d.id} ${d.nom} (conc=${d.prep.conc_produit}, unite=${d.prep.unite})`);
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
    const bad = [];
    Object.entries(PSE).forEach(([id, p]) => {
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
    const bad = [];
    Object.entries(PSE).forEach(([id, p]) => {
      p.steps.forEach(s => {
        if (s < p.min || s > p.max) {
          bad.push(`${id} → step ${s} hors plage [${p.min}, ${p.max}]`);
        }
      });
    });
    expect(bad).toEqual([]);
  });

  test("mode 'extra' (héparine UI/24h) : débit cohérent aussi", () => {
    const bad = [];
    Object.entries(PSE).forEach(([id, p]) => {
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
    const unparsable = [];
    DRUGS.forEach(d => {
      ["a", "p"].forEach(group => {
        (d.poso?.[group] || []).forEach((line, i) => {
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
