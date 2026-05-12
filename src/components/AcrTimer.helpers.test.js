import { fmt, fmtWall, stepState, suggestActions, readCoach } from "./AcrTimer.helpers";

// ════════════════════════════════════════════════════════════════
// fmt — formate des secondes en MM:SS
// ════════════════════════════════════════════════════════════════
describe("fmt", () => {
  test("zéro secondes → 00:00", () => {
    expect(fmt(0)).toBe("00:00");
  });

  test("moins de 60 secondes → 00:SS", () => {
    expect(fmt(5)).toBe("00:05");
    expect(fmt(45)).toBe("00:45");
  });

  test("plus d'une minute → MM:SS", () => {
    expect(fmt(60)).toBe("01:00");
    expect(fmt(125)).toBe("02:05");
    expect(fmt(599)).toBe("09:59");
  });

  test("plus de 9 minutes → toujours MM:SS (pas d'heures)", () => {
    expect(fmt(3599)).toBe("59:59");
    expect(fmt(3600)).toBe("60:00"); // 1h affichée comme 60 min
  });

  test("valeur négative → traitée comme 0", () => {
    expect(fmt(-10)).toBe("00:00");
  });
});

// ════════════════════════════════════════════════════════════════
// fmtWall — heure téléphone HH:MM:SS
// ════════════════════════════════════════════════════════════════
describe("fmtWall", () => {
  test("timestamp valide → HH:MM:SS", () => {
    const ts = new Date("2026-05-12T14:30:45").getTime();
    const result = fmtWall(ts);
    // Format dépend du fuseau, mais doit matcher HH:MM:SS
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  test("timestamp invalide → fallback '—'", () => {
    // Date(NaN) → invalide, toLocaleTimeString peut throw selon impl
    expect(typeof fmtWall(NaN)).toBe("string");
  });
});

// ════════════════════════════════════════════════════════════════
// stepState — état d'une étape de prep DSA selon le compte à rebours
// ════════════════════════════════════════════════════════════════
describe("stepState", () => {
  const step = { from: 15, to: 11 };

  test("avant la fenêtre (t > from) → pending", () => {
    expect(stepState(step, 20)).toBe("pending");
    expect(stepState(step, 16)).toBe("pending");
  });

  test("dans la fenêtre (to ≤ t ≤ from) → active", () => {
    expect(stepState(step, 15)).toBe("active");
    expect(stepState(step, 13)).toBe("active");
    expect(stepState(step, 11)).toBe("active");
  });

  test("après la fenêtre (t < to) → done", () => {
    expect(stepState(step, 10)).toBe("done");
    expect(stepState(step, 0)).toBe("done");
  });
});

// ════════════════════════════════════════════════════════════════
// suggestActions — logique de protocole ACR (ERC vs ACLS)
// Cas critique pour la sécurité patient : si cette fonction casse,
// les suggestions d'adré/cordarone sont fausses.
// ════════════════════════════════════════════════════════════════
describe("suggestActions — ERC", () => {
  test("1er choc choquable : seulement le choc (pas d'adré avant 3e)", () => {
    const out = suggestActions({
      rhythm: "choquable",
      totalShocks: 0,
      lastAdreAt: null,
      elapsed: 0,
      pediatric: false,
      protocol: "erc",
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ type: "choc", label: "Choc n°1" });
  });

  test("3e choc ERC : choc + 1re adré + cordarone 300", () => {
    const out = suggestActions({
      rhythm: "choquable",
      totalShocks: 2,
      lastAdreAt: null,
      elapsed: 240,
      pediatric: false,
      protocol: "erc",
    });
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ type: "choc", label: "Choc n°3" });
    expect(out[1]).toMatchObject({ type: "adre" });
    expect(out[2]).toMatchObject({ type: "amio", label: "Amiodarone 300 mg IV" });
  });

  test("5e choc ERC : choc + cordarone 150 (adré gérée par cycle 4 min)", () => {
    const out = suggestActions({
      rhythm: "choquable",
      totalShocks: 4,
      lastAdreAt: 200, // dernière adré récente
      elapsed: 400,
      pediatric: false,
      protocol: "erc",
    });
    expect(out.find((a) => a.type === "choc")?.label).toBe("Choc n°5");
    expect(out.find((a) => a.type === "amio")?.label).toBe("Amiodarone 150 mg IV");
  });

  test("non choquable + jamais d'adré → suggère ASAP", () => {
    const out = suggestActions({
      rhythm: "non_choquable",
      totalShocks: 0,
      lastAdreAt: null,
      elapsed: 0,
      pediatric: false,
      protocol: "erc",
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ type: "adre", hint: "ASAP en non choquable" });
  });

  test("cycle adré 4 min après la 1re dose", () => {
    const out = suggestActions({
      rhythm: "non_choquable",
      totalShocks: 0,
      lastAdreAt: 60,
      elapsed: 290, // 290 - 60 = 230 ≥ 230 (240-10)
      pediatric: false,
      protocol: "erc",
    });
    expect(out.find((a) => a.type === "adre")?.hint).toBe("cycle 4 min");
  });
});

describe("suggestActions — ACLS", () => {
  test("2e choc ACLS : choc + 1re adré (vs 3e en ERC)", () => {
    const out = suggestActions({
      rhythm: "choquable",
      totalShocks: 1,
      lastAdreAt: null,
      elapsed: 120,
      pediatric: false,
      protocol: "acls",
    });
    expect(out.find((a) => a.type === "adre")?.hint).toContain("après 2e");
  });

  test("4e choc ACLS : suggère changement palettes (Focused Update 2024)", () => {
    const out = suggestActions({
      rhythm: "choquable",
      totalShocks: 3,
      lastAdreAt: 240,
      elapsed: 480,
      pediatric: false,
      protocol: "acls",
    });
    expect(out.some((a) => a.type === "tech")).toBe(true);
    expect(out.find((a) => a.type === "tech")?.label).toContain("antéro-postérieur");
  });

  test("pas de changement palettes en mode ERC", () => {
    const out = suggestActions({
      rhythm: "choquable",
      totalShocks: 4,
      lastAdreAt: 240,
      elapsed: 480,
      pediatric: false,
      protocol: "erc",
    });
    expect(out.some((a) => a.type === "tech")).toBe(false);
  });
});

describe("suggestActions — pédiatrique", () => {
  test("doses adaptées au poids (0,01 mg/kg adré, 5 mg/kg amio)", () => {
    const out = suggestActions({
      rhythm: "choquable",
      totalShocks: 2,
      lastAdreAt: null,
      elapsed: 240,
      pediatric: true,
      protocol: "erc",
    });
    expect(out.find((a) => a.type === "adre")?.label).toContain("0,01 mg/kg");
    expect(out.find((a) => a.type === "amio")?.label).toContain("5 mg/kg");
  });
});

// ════════════════════════════════════════════════════════════════
// readCoach — lecture du mode persisté avec fallback
// localStorage stub explicite (happy-dom ne le fournit pas toujours en JS test)
// ════════════════════════════════════════════════════════════════
describe("readCoach", () => {
  let store;

  beforeEach(() => {
    store = {};
    vi.stubGlobal("localStorage", {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => {
        store[k] = String(v);
      },
      removeItem: (k) => {
        delete store[k];
      },
      clear: () => {
        store = {};
      },
    });
  });

  test("absence en localStorage → default 'full'", () => {
    expect(readCoach()).toBe("full");
  });

  test("valeur valide en localStorage → retournée telle quelle", () => {
    localStorage.setItem("mediurg-acr-coach", "visual");
    expect(readCoach()).toBe("visual");
    localStorage.setItem("mediurg-acr-coach", "silent");
    expect(readCoach()).toBe("silent");
  });

  test("valeur invalide en localStorage → fallback 'full'", () => {
    localStorage.setItem("mediurg-acr-coach", "garbage");
    expect(readCoach()).toBe("full");
  });
});
