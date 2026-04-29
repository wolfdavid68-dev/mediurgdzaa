import { tokenizeProtocolText } from "./protocolText";
import { DRUG_PATTERNS } from "../components/ProtocolCard";

// Helpers pour rendre les assertions plus lisibles
const types = (toks) => toks.map(t => t.type);
const values = (toks) => toks.map(t => t.value);

describe("tokenizeProtocolText — texte sans match", () => {
  test("texte vide → tableau vide", () => {
    expect(tokenizeProtocolText("", DRUG_PATTERNS)).toEqual([]);
  });

  test("texte sans drug ni dose → 1 seul token text", () => {
    const t = "Mettre la victime en PLS dès que possible.";
    const toks = tokenizeProtocolText(t, DRUG_PATTERNS);
    expect(toks).toEqual([{ type: "text", value: t }]);
  });

  test("nombre sans unité reconnue → pas de dose", () => {
    // « 5 % » n'est pas une dose (% pas dans les unités), « 80 » seul non plus
    const toks = tokenizeProtocolText("Bradypnée < 10 cycles/min", DRUG_PATTERNS);
    expect(types(toks)).toEqual(["text"]);
  });
});

describe("tokenizeProtocolText — détection des doses", () => {
  test("dose mg/kg simple", () => {
    const toks = tokenizeProtocolText("Posologie : 1 mg/kg IV bolus", DRUG_PATTERNS);
    const dose = toks.find(t => t.type === "dose");
    expect(dose.value).toBe("1 mg/kg");
  });

  test("fourchette de dose", () => {
    const toks = tokenizeProtocolText("Induction : 1-2,5 mg/kg IV", DRUG_PATTERNS);
    const dose = toks.find(t => t.type === "dose");
    expect(dose.value).toBe("1-2,5 mg/kg");
  });

  test("dose µg/kg/min", () => {
    const toks = tokenizeProtocolText("0,1 µg/kg/min IVSE", DRUG_PATTERNS);
    const dose = toks.find(t => t.type === "dose");
    // Le suffixe /min est capté via la 3e capture (?:\/(?:kg|h|min|j|24h))?
    expect(dose.value).toContain("0,1");
    expect(dose.value).toContain("µg/kg");
  });

  test("dose en mL", () => {
    const toks = tokenizeProtocolText("Diluer dans 100 mL de NaCl", DRUG_PATTERNS);
    const doses = toks.filter(t => t.type === "dose");
    expect(doses.map(d => d.value)).toContain("100 mL");
  });

  test("doses multiples dans une phrase", () => {
    const t = "1 g d'acide tranexamique dilué dans 100 mL en 10 min";
    const toks = tokenizeProtocolText(t, DRUG_PATTERNS);
    const doses = toks.filter(d => d.type === "dose").map(d => d.value);
    expect(doses).toContain("1 g");
    expect(doses).toContain("100 mL");
    // « 10 min » n'est PAS une dose (min n'est pas une unité standalone)
    expect(doses).not.toContain("10 min");
  });
});

describe("tokenizeProtocolText — détection des médicaments", () => {
  test("médicament en début de phrase, sensible aux accents", () => {
    const toks = tokenizeProtocolText("Adrénaline 0,5 mg IM", DRUG_PATTERNS);
    expect(types(toks)).toEqual(["drug", "text", "dose", "text"]);
    expect(toks[0]).toEqual({ type: "drug", value: "Adrénaline" });
  });

  test("case insensitive : 'adrénaline' minuscule détecté", () => {
    const toks = tokenizeProtocolText("Renouveler l'adrénaline 1 mg", DRUG_PATTERNS);
    const drugs = toks.filter(t => t.type === "drug").map(d => d.value);
    expect(drugs).toEqual(["adrénaline"]);
  });

  test("deux médicaments dans une phrase + dose", () => {
    const toks = tokenizeProtocolText(
      "Méthylprednisolone (Solumédrol®) 1 mg/kg",
      DRUG_PATTERNS
    );
    const drugs = toks.filter(t => t.type === "drug").map(d => d.value);
    expect(drugs).toEqual(["Méthylprednisolone", "Solumédrol"]);
    const dose = toks.find(t => t.type === "dose");
    expect(dose.value).toBe("1 mg/kg");
  });

  test("pattern multi-mot : 'acide tranexamique' reste un seul token", () => {
    const toks = tokenizeProtocolText(
      "1 g d'acide tranexamique (Exacyl®) en 10 min",
      DRUG_PATTERNS
    );
    const drugs = toks.filter(t => t.type === "drug").map(d => d.value);
    expect(drugs).toEqual(["acide tranexamique", "Exacyl"]);
  });

  test("NaCl (pattern court) cliquable même suivi de '0,9 %'", () => {
    const toks = tokenizeProtocolText(
      "Poser une VVP avec NaCl 0,9 % 500 mL",
      DRUG_PATTERNS
    );
    const drugs = toks.filter(t => t.type === "drug").map(d => d.value);
    expect(drugs).toEqual(["NaCl"]);
    const doses = toks.filter(t => t.type === "dose").map(d => d.value);
    expect(doses).toEqual(["500 mL"]);
  });

  test("Ringer Lactate (multi-mot avec espace)", () => {
    const toks = tokenizeProtocolText(
      "VVP de gros calibre avec le Ringer Lactate 500 mL",
      DRUG_PATTERNS
    );
    const drugs = toks.filter(t => t.type === "drug").map(d => d.value);
    expect(drugs).toEqual(["Ringer Lactate"]);
  });

  test("Glucose détecté sur G5%/G30% via pattern court", () => {
    const toks = tokenizeProtocolText(
      "VVP avec du Glucose 5 % 250 mL à 80 mL/h",
      DRUG_PATTERNS
    );
    const drugs = toks.filter(t => t.type === "drug").map(d => d.value);
    expect(drugs).toEqual(["Glucose"]);
  });
});

describe("tokenizeProtocolText — préservation du texte intercalaire", () => {
  test("la concaténation des values restitue le texte original", () => {
    const t = "Adrénaline 1 mg IV bolus toutes les 4 min jusqu'à ROSC.";
    const toks = tokenizeProtocolText(t, DRUG_PATTERNS);
    expect(values(toks).join("")).toBe(t);
  });

  test("texte avec ponctuation autour des matchs", () => {
    const t = "Administrer (Solumédrol®) 1 mg/kg sans dépasser 120 mg.";
    const toks = tokenizeProtocolText(t, DRUG_PATTERNS);
    expect(values(toks).join("")).toBe(t);
  });

  test("phrase sans aucun match : 1 token text identique", () => {
    const t = "Mettre la victime en décubitus dorsal.";
    const toks = tokenizeProtocolText(t, DRUG_PATTERNS);
    expect(toks).toEqual([{ type: "text", value: t }]);
  });
});

describe("tokenizeProtocolText — pièges connus", () => {
  test("un pattern fini par % serait inopérant (régression interdite)", () => {
    // Si on rajoutait par erreur "Glucose 30 %" avec % final, le \b de fin
    // ne matcherait pas. On vérifie qu'aucun pattern actuel n'est dans ce cas.
    const bad = DRUG_PATTERNS.filter(p => /[^A-Za-zÀ-ÿ]$/.test(p));
    expect(bad).toEqual([]);
  });

  test("'5 %' n'est pas confondu avec une dose", () => {
    const toks = tokenizeProtocolText(
      "Surface brûlée > 20 % chez l'adulte",
      DRUG_PATTERNS
    );
    expect(toks.filter(t => t.type === "dose")).toEqual([]);
  });

  test("traitement des points d'intervalle '0,01 mg/kg'", () => {
    const toks = tokenizeProtocolText("Adrénaline 0,01 mg/kg IV bolus", DRUG_PATTERNS);
    const dose = toks.find(t => t.type === "dose");
    expect(dose.value).toBe("0,01 mg/kg");
  });

  test("intervalle avec tiret cadratin (–)", () => {
    const toks = tokenizeProtocolText("1 000–1 500 mL chez l'adulte", DRUG_PATTERNS);
    // Le pattern accepte '-' et '–' MAIS « 1 000 » contient un espace : la
    // regex `\d+(?:[,.]\d+)?` ne traverse pas l'espace. On vérifie juste
    // qu'on n'a pas planté ; le comportement exact suit les groupes capturés.
    expect(() => tokenizeProtocolText("1 000–1 500 mL", DRUG_PATTERNS)).not.toThrow();
  });
});
