import {
  coerceAcrSession,
  createEmptyAcrSession,
  formatAcrElapsed,
  formatWallTime,
  mergeTimerSnapshotIntoSession,
  type AcrFullSession,
  type AcrTimerSnapshot,
} from "./acrSession";

// ════════════════════════════════════════════════════════════════
// formatAcrElapsed
// ════════════════════════════════════════════════════════════════
describe("formatAcrElapsed", () => {
  test("formate en MM:SS avec padding", () => {
    expect(formatAcrElapsed(0)).toBe("00:00");
    expect(formatAcrElapsed(5)).toBe("00:05");
    expect(formatAcrElapsed(65)).toBe("01:05");
    expect(formatAcrElapsed(600)).toBe("10:00");
  });

  test("dépasse 60 min sans rollover (cumul continu)", () => {
    expect(formatAcrElapsed(3600)).toBe("60:00");
    expect(formatAcrElapsed(3661)).toBe("61:01");
  });

  test("clampe les valeurs négatives à 00:00", () => {
    expect(formatAcrElapsed(-30)).toBe("00:00");
  });

  test("tolère NaN / Infinity sans crasher", () => {
    expect(formatAcrElapsed(Number.NaN)).toBe("00:00");
    expect(formatAcrElapsed(Number.POSITIVE_INFINITY)).toBe("00:00");
  });
});

// ════════════════════════════════════════════════════════════════
// formatWallTime
// ════════════════════════════════════════════════════════════════
describe("formatWallTime", () => {
  test("retourne une chaîne vide pour undefined / 0", () => {
    expect(formatWallTime(undefined)).toBe("");
    expect(formatWallTime(0)).toBe("");
  });

  test("formate un timestamp en HH:MM:SS (24h, fr-FR)", () => {
    // 2026-06-23T08:05:09 heure locale → on vérifie le format, pas le fuseau
    const ts = new Date(2026, 5, 23, 8, 5, 9).getTime();
    expect(formatWallTime(ts)).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});

// ════════════════════════════════════════════════════════════════
// createEmptyAcrSession
// ════════════════════════════════════════════════════════════════
describe("createEmptyAcrSession", () => {
  test("produit une session vide bien formée", () => {
    const s = createEmptyAcrSession();
    expect(s.protocol).toBe("erc");
    expect(s.pediatric).toBe(false);
    expect(s.stats).toEqual({ elapsed: 0, shocks: 0, adres: 0, amios: 0, cycle: 1 });
    expect(s.cycles).toEqual([]);
    expect(s.events).toEqual([]);
    expect(s.analyseDossier.causesH).toEqual([]);
    expect(s.analyseDossier.causesT).toEqual([]);
    expect(s.racs.signesReveil).toEqual([]);
    expect(typeof s.id).toBe("string");
    expect(s.id).toMatch(/^acr-/);
  });

  test("génère des ids distincts à chaque appel", () => {
    expect(createEmptyAcrSession().id).not.toBe(createEmptyAcrSession().id);
  });
});

// ════════════════════════════════════════════════════════════════
// coerceAcrSession — robustesse face à un localStorage corrompu
// ════════════════════════════════════════════════════════════════
describe("coerceAcrSession", () => {
  test("retombe sur une session vide pour null / undefined / garbage", () => {
    for (const bad of [null, undefined, 42, "x", true, []]) {
      const s = coerceAcrSession(bad);
      expect(s.protocol).toBe("erc");
      expect(s.cycles).toEqual([]);
      expect(s.analyseDossier.causesH).toEqual([]);
      expect(s.racs.signesReveil).toEqual([]);
    }
  });

  test("préserve les champs valides d'une saisie partielle", () => {
    const s = coerceAcrSession({
      protocol: "acls",
      pediatric: true,
      patient: { nom: "Doe", age: "57" },
      stats: { shocks: 3 },
    });
    expect(s.protocol).toBe("acls");
    expect(s.pediatric).toBe(true);
    expect(s.patient.nom).toBe("Doe");
    expect(s.patient.age).toBe("57");
    expect(s.stats.shocks).toBe(3);
    // les stats manquantes retombent sur les valeurs par défaut
    expect(s.stats.elapsed).toBe(0);
    expect(s.stats.cycle).toBe(1);
  });

  test("ignore les types invalides au profit des défauts", () => {
    const s = coerceAcrSession({
      protocol: 123,
      pediatric: "oui",
      stats: { shocks: "trois", adres: 2 },
    });
    expect(s.protocol).toBe("erc");
    expect(s.pediatric).toBe(false);
    expect(s.stats.shocks).toBe(0);
    expect(s.stats.adres).toBe(2);
  });

  test("filtre les non-chaînes dans causesH / causesT / signesReveil", () => {
    const s = coerceAcrSession({
      analyseDossier: { causesH: ["Hypoxie", 5, null, "Hypothermie"], causesT: "pas un tableau" },
      racs: { signesReveil: ["Ouverture des yeux", false] },
    });
    expect(s.analyseDossier.causesH).toEqual(["Hypoxie", "Hypothermie"]);
    expect(s.analyseDossier.causesT).toEqual([]);
    expect(s.racs.signesReveil).toEqual(["Ouverture des yeux"]);
  });

  test("coerce cycles / events non-tableau en tableau vide", () => {
    const s = coerceAcrSession({ cycles: "x", events: null });
    expect(s.cycles).toEqual([]);
    expect(s.events).toEqual([]);
  });

  test("conserve un id / createdAt valides existants", () => {
    const s = coerceAcrSession({ id: "acr-fixed-123", createdAt: 1000, updatedAt: 2000 });
    expect(s.id).toBe("acr-fixed-123");
    expect(s.createdAt).toBe(1000);
    expect(s.updatedAt).toBe(2000);
  });
});

// ════════════════════════════════════════════════════════════════
// mergeTimerSnapshotIntoSession — fusion chrono live → dossier
// ════════════════════════════════════════════════════════════════
const makeSnapshot = (over: Partial<AcrTimerSnapshot> = {}): AcrTimerSnapshot => ({
  pediatric: false,
  protocol: "erc",
  elapsed: 0,
  shocks: 0,
  adres: 0,
  amios: 0,
  cycle: 1,
  history: [],
  events: [],
  ...over,
});

describe("mergeTimerSnapshotIntoSession", () => {
  test("recopie les stats live dans la session", () => {
    const out = mergeTimerSnapshotIntoSession(
      createEmptyAcrSession(),
      makeSnapshot({
        pediatric: true,
        protocol: "acls",
        elapsed: 240,
        shocks: 2,
        adres: 3,
        amios: 1,
        cycle: 5,
      })
    );
    expect(out.pediatric).toBe(true);
    expect(out.protocol).toBe("acls");
    expect(out.stats).toEqual({ elapsed: 240, shocks: 2, adres: 3, amios: 1, cycle: 5 });
  });

  test("mappe l'historique en cycles avec libellés de rythme et drogues", () => {
    const out = mergeTimerSnapshotIntoSession(
      createEmptyAcrSession(),
      makeSnapshot({
        history: [
          { cycle: 1, t: 0, rhythm: "choquable", actions: ["Choc n°1"] },
          { cycle: 2, t: 120, rhythm: "non_choquable", actions: ["Adrénaline 1 mg"] },
        ],
      })
    );
    expect(out.cycles).toHaveLength(2);
    expect(out.cycles[0]).toMatchObject({
      cycle: 1,
      rhythm: "FV / TV sans pouls",
      choc: "Choc n°1",
    });
    expect(out.cycles[1]).toMatchObject({
      cycle: 2,
      rhythm: "Asystolie / AESP",
      drogues: "Adrénaline 1 mg",
    });
  });

  test("préserve les champs cycle saisis par l'utilisateur (ventilation, capno, commentaire)", () => {
    const base: AcrFullSession = {
      ...createEmptyAcrSession(),
      cycles: [
        { cycle: 1, t: 0, actions: [], ventilation: "IOT", capno: "30", commentaire: "VVP posée" },
      ],
    };
    const out = mergeTimerSnapshotIntoSession(
      base,
      makeSnapshot({ history: [{ cycle: 1, t: 0, rhythm: "choquable", actions: ["Choc n°1"] }] })
    );
    expect(out.cycles[0]).toMatchObject({
      ventilation: "IOT",
      capno: "30",
      commentaire: "VVP posée",
      choc: "Choc n°1",
    });
  });

  test("auto-remplit horaires et RACS depuis les événements horodatés", () => {
    const out = mergeTimerSnapshotIntoSession(
      createEmptyAcrSession(),
      makeSnapshot({
        events: [
          { id: "e1", type: "start", label: "Début ACR", t: 0, at: 1000 },
          { id: "e2", type: "choc", label: "Choc n°1", t: 30, at: 1030 },
          { id: "e3", type: "rosc", label: "RACS", t: 480, at: 1480 },
        ],
      })
    );
    expect(out.horaires.debutRcp).not.toBe("");
    expect(out.horaires.premiereAnalyse).not.toBe("");
    expect(out.racs.obtenu).toBe(true);
    expect(out.racs.heure).not.toBe("");
  });

  test("ne piétine pas les horaires déjà saisis manuellement", () => {
    const base: AcrFullSession = {
      ...createEmptyAcrSession(),
      horaires: { ...createEmptyAcrSession().horaires, debutRcp: "08:00" },
    };
    const out = mergeTimerSnapshotIntoSession(
      base,
      makeSnapshot({ events: [{ id: "e1", type: "start", label: "Début ACR", t: 0, at: 1000 }] })
    );
    expect(out.horaires.debutRcp).toBe("08:00");
  });

  test("conserve obtenu=true même sans événement rosc une fois coché", () => {
    const base: AcrFullSession = {
      ...createEmptyAcrSession(),
      racs: { ...createEmptyAcrSession().racs, obtenu: true },
    };
    const out = mergeTimerSnapshotIntoSession(base, makeSnapshot());
    expect(out.racs.obtenu).toBe(true);
  });
});
