import { DRUGS } from "../data/drugs";
import { PREP_KITS } from "../data/prepKits";
import { PROTOCOLS } from "../data/protocols";
import { SCALES } from "../data/scales";
import { resolveDeepLink } from "./deepLink";
import { filterDrugs } from "./drugSearch";
import type { ClinicalScale, Protocol } from "../types/data";

const findUniqueDrug = (search: string) => {
  const matches = filterDrugs({
    search,
    cat: "Tout",
    svc: "Tout",
    showFavoritesOnly: false,
    favorites: new Set<number>(),
  });
  expect(matches.length).toBe(1);
  return matches[0];
};

describe("resolveDeepLink", () => {
  test("chaîne vide → rien à appliquer", async () => {
    const r = await resolveDeepLink("", true);
    expect(r.dirty).toBe(false);
    expect(r.cleanedSearch).toBe("");
  });

  test("paramètres inconnus → conservés sans replaceState", async () => {
    const r = await resolveDeepLink("?utm_source=qr", true);
    expect(r.dirty).toBe(false);
    expect(r.cleanedSearch).toBe("utm_source=qr");
  });

  describe("?mode=acr", () => {
    test("avec accès complet → ouvre la modale et consomme", async () => {
      const r = await resolveDeepLink("?mode=acr", true);
      expect(r.showAcr).toBe(true);
      expect(r.dirty).toBe(true);
      expect(r.cleanedSearch).toBe("");
    });

    test("sans accès complet → param conservé pour rejeu", async () => {
      const r = await resolveDeepLink("?mode=acr", false);
      expect(r.showAcr).toBeUndefined();
      expect(r.dirty).toBe(false);
      expect(r.cleanedSearch).toBe("mode=acr");
    });
  });

  describe("?page + ?tab", () => {
    test("protocoles + kits avec accès complet", async () => {
      const r = await resolveDeepLink("?page=protocoles&tab=kits", true);
      expect(r.page).toBe("protocoles");
      expect(r.protoCategory).toBe("kits");
      expect(r.cleanedSearch).toBe("");
    });

    test("echelles sans accès complet → conservé", async () => {
      const r = await resolveDeepLink("?page=echelles", false);
      expect(r.page).toBeUndefined();
      expect(r.cleanedSearch).toBe("page=echelles");
    });

    test("medicaments → accessible sans accès complet", async () => {
      const r = await resolveDeepLink("?page=medicaments", false);
      expect(r.page).toBe("medicaments");
      expect(r.cleanedSearch).toBe("");
    });

    test("tab invalide → conservé", async () => {
      const r = await resolveDeepLink("?tab=inexistant", true);
      expect(r.protoCategory).toBeUndefined();
      expect(r.cleanedSearch).toBe("tab=inexistant");
    });
  });

  describe("?kit", () => {
    test("kit connu → Protocoles → Kits avec le kit déployé", async () => {
      const r = await resolveDeepLink("?kit=ktc", true);
      expect(r.page).toBe("protocoles");
      expect(r.protoCategory).toBe("kits");
      expect(r.autoOpenKitId).toBe("ktc");
      expect(r.cleanedSearch).toBe("");
    });

    test("insensible à la casse", async () => {
      const r = await resolveDeepLink("?kit=KTC", true);
      expect(r.autoOpenKitId).toBe("ktc");
    });

    test("chaque id de PREP_KITS est résolu", async () => {
      for (const kit of PREP_KITS) {
        expect((await resolveDeepLink(`?kit=${kit.id}`, true)).autoOpenKitId).toBe(kit.id);
      }
    });

    test("kit inconnu → consommé sans navigation", async () => {
      const r = await resolveDeepLink("?kit=inexistant", true);
      expect(r.autoOpenKitId).toBeUndefined();
      expect(r.page).toBeUndefined();
      expect(r.dirty).toBe(true);
      expect(r.cleanedSearch).toBe("");
    });

    test("sans accès complet → conservé, les params libres restent consommés", async () => {
      const r = await resolveDeepLink("?kit=ktc&poids=80", false);
      expect(r.autoOpenKitId).toBeUndefined();
      expect(r.patientWeight).toBe("80");
      expect(r.cleanedSearch).toBe("kit=ktc");
    });
  });

  describe("?kit + ?onglet", () => {
    test("onglet toujours disponible → appliqué", async () => {
      const r = await resolveDeepLink("?kit=drain-thoracique&onglet=materiel", true);
      expect(r.autoOpenKitId).toBe("drain-thoracique");
      expect(r.autoOpenKitTab).toBe("materiel");
      expect(r.cleanedSearch).toBe("");
    });

    test("alias « rearmement » → onglet materiel", async () => {
      const r = await resolveDeepLink("?kit=drain-thoracique&onglet=rearmement", true);
      expect(r.autoOpenKitTab).toBe("materiel");
    });

    test("onglet lignes réservé au kit ktc", async () => {
      expect((await resolveDeepLink("?kit=ktc&onglet=lignes", true)).autoOpenKitTab).toBe("lignes");
      const r = await resolveDeepLink("?kit=drain-thoracique&onglet=lignes", true);
      expect(r.autoOpenKitTab).toBeUndefined();
      expect(r.autoOpenKitId).toBe("drain-thoracique");
    });

    test("onglet schema seulement si le kit a un schéma", async () => {
      const withSchema = PREP_KITS.filter((k) => k.schema).map((k) => k.id);
      const withoutSchema = PREP_KITS.filter((k) => !k.schema).map((k) => k.id);
      for (const id of withSchema) {
        expect((await resolveDeepLink(`?kit=${id}&onglet=schema`, true)).autoOpenKitTab).toBe(
          "schema"
        );
      }
      for (const id of withoutSchema) {
        expect(
          (await resolveDeepLink(`?kit=${id}&onglet=schema`, true)).autoOpenKitTab
        ).toBeUndefined();
      }
    });

    test("onglet inconnu → ignoré mais consommé", async () => {
      const r = await resolveDeepLink("?kit=ktc&onglet=inexistant", true);
      expect(r.autoOpenKitId).toBe("ktc");
      expect(r.autoOpenKitTab).toBeUndefined();
      expect(r.cleanedSearch).toBe("");
    });

    test("onglet sans kit → conservé tel quel", async () => {
      const r = await resolveDeepLink("?onglet=materiel", true);
      expect(r.autoOpenKitTab).toBeUndefined();
      expect(r.dirty).toBe(false);
      expect(r.cleanedSearch).toBe("onglet=materiel");
    });
  });

  describe("?med", () => {
    test("id numérique exact → recherche préremplie + fiche déployée", async () => {
      const drug = DRUGS[0];
      const r = await resolveDeepLink(`?med=${drug.id}`, false);
      expect(r.page).toBe("medicaments");
      expect(r.search).toBe(drug.nom);
      expect(r.autoOpenDrugId).toBe(drug.id);
      expect(r.cleanedSearch).toBe("");
    });

    test("nom sans ambiguïté → fiche déployée", async () => {
      const drug = findUniqueDrug("CORDARONE");
      const r = await resolveDeepLink("?med=CORDARONE", false);
      expect(r.search).toBe("CORDARONE");
      expect(r.autoOpenDrugId).toBe(drug.id);
    });

    test("recherche ambiguë → liste filtrée seulement, pas d'auto-ouverture", async () => {
      const r = await resolveDeepLink("?med=ine", false);
      expect(r.search).toBe("ine");
      expect(r.autoOpenDrugId).toBeUndefined();
      expect(r.cleanedSearch).toBe("");
    });

    test("id inexistant → recherche brute, pas d'auto-ouverture", async () => {
      const r = await resolveDeepLink("?med=999999", false);
      expect(r.search).toBe("999999");
      expect(r.autoOpenDrugId).toBeUndefined();
    });

    test("valeur vide → consommé sans effet", async () => {
      const r = await resolveDeepLink("?med=", false);
      expect(r.search).toBeUndefined();
      expect(r.dirty).toBe(true);
    });
  });

  describe("?poids", () => {
    test("virgule décimale normalisée en point", async () => {
      const r = await resolveDeepLink("?poids=72,5", false);
      expect(r.patientWeight).toBe("72.5");
      expect(r.cleanedSearch).toBe("");
    });

    test("point décimal accepté", async () => {
      expect((await resolveDeepLink("?poids=12.3", false)).patientWeight).toBe("12.3");
    });

    test.each(["abc", "0", "-5", "400", ""])(
      "valeur invalide « %s » → ignorée mais consommée",
      async (poids) => {
        const r = await resolveDeepLink(`?poids=${poids}`, false);
        expect(r.patientWeight).toBeUndefined();
        expect(r.dirty).toBe(true);
        expect(r.cleanedSearch).toBe("");
      }
    );
  });

  describe("?compat", () => {
    test("deux noms résolus → vue Comparer avec la paire", async () => {
      const r = await resolveDeepLink("?compat=noradrenaline,lasilix", true);
      expect(r.page).toBe("protocoles");
      expect(r.protoCategory).toBe("incompatibilites");
      expect(r.incompatPair).toEqual(["Norépinéphrine (Noradrénaline®)", "Furosémide (Lasilix®)"]);
      expect(r.cleanedSearch).toBe("");
    });

    test("« adrenaline » résout Adrénaline (match exact), pas Noradrénaline", async () => {
      const r = await resolveDeepLink("?compat=adrenaline,propofol", true);
      expect(r.incompatPair).toEqual(["Adrénaline®", "Propofol (Diprivan®)"]);
    });

    test("un seul nom → vue Fiche focalisée", async () => {
      const r = await resolveDeepLink("?compat=noradrenaline", true);
      expect(r.incompatFocus).toBe("Norépinéphrine (Noradrénaline®)");
      expect(r.incompatPair).toBeUndefined();
    });

    test("un des deux noms inconnu → Fiche sur le nom résolu", async () => {
      const r = await resolveDeepLink("?compat=noradrenaline,xyz", true);
      expect(r.incompatFocus).toBe("Norépinéphrine (Noradrénaline®)");
      expect(r.incompatPair).toBeUndefined();
    });

    test("aucun nom résolu → onglet Incompatibilités quand même", async () => {
      const r = await resolveDeepLink("?compat=xyz,abc", true);
      expect(r.page).toBe("protocoles");
      expect(r.protoCategory).toBe("incompatibilites");
      expect(r.incompatPair).toBeUndefined();
      expect(r.incompatFocus).toBeUndefined();
      expect(r.dirty).toBe(true);
    });

    test("sans accès complet → conservé", async () => {
      const r = await resolveDeepLink("?compat=noradrenaline,lasilix", false);
      expect(r.incompatPair).toBeUndefined();
      expect(r.dirty).toBe(false);
      expect(r.cleanedSearch).toContain("compat=");
    });
  });

  describe("?protocole", () => {
    const protocols = PROTOCOLS as Protocol[];

    test("code exact avec ou sans espace → protocole déployé", async () => {
      const pisu5 = protocols.find((p) => p.code === "PISU 5");
      expect(pisu5).toBeDefined();
      for (const q of ["PISU 5", "pisu5", "pisu-5"]) {
        const r = await resolveDeepLink(`?protocole=${q}`, true);
        expect(r.page).toBe("protocoles");
        expect(r.protoCategory).toBe("PISU");
        expect(r.autoOpenProtocolId).toBe(pisu5!.id);
      }
    });

    test("id numérique → protocole déployé", async () => {
      const first = protocols[0];
      const r = await resolveDeepLink(`?protocole=${first.id}`, true);
      expect(r.autoOpenProtocolId).toBe(first.id);
    });

    test("texte sans ambiguïté → protocole déployé", async () => {
      const hemorragie = protocols.filter((p) => p.titre.includes("Hémorragie"));
      expect(hemorragie.length).toBe(1);
      const r = await resolveDeepLink("?protocole=hemorragie", true);
      expect(r.autoOpenProtocolId).toBe(hemorragie[0].id);
    });

    test("texte ambigu (Adulte + Enfant) → liste PISU sans auto-ouverture", async () => {
      const matches = protocols.filter((p) => p.titre.includes("Détresse Respiratoire"));
      expect(matches.length).toBeGreaterThan(1);
      const r = await resolveDeepLink("?protocole=detresse respiratoire", true);
      expect(r.page).toBe("protocoles");
      expect(r.protoCategory).toBe("PISU");
      expect(r.autoOpenProtocolId).toBeUndefined();
    });

    test("sans accès complet → conservé", async () => {
      const r = await resolveDeepLink("?protocole=pisu5", false);
      expect(r.autoOpenProtocolId).toBeUndefined();
      expect(r.cleanedSearch).toBe("protocole=pisu5");
    });
  });

  describe("?echelle", () => {
    const scales = SCALES as ClinicalScale[];

    test("chaque id d'échelle est résolu", async () => {
      for (const scale of scales) {
        const r = await resolveDeepLink(`?echelle=${encodeURIComponent(scale.id)}`, true);
        expect(r.page).toBe("echelles");
        expect(r.autoOpenScaleId).toBe(scale.id);
      }
    });

    test("nom sans ambiguïté → échelle déployée", async () => {
      const ramsay = scales.filter((s) => s.nom.includes("Ramsay"));
      expect(ramsay.length).toBe(1);
      const r = await resolveDeepLink("?echelle=ramsay", true);
      expect(r.autoOpenScaleId).toBe(ramsay[0].id);
    });

    test("nom inconnu → page Échelles sans auto-ouverture", async () => {
      const r = await resolveDeepLink("?echelle=inexistant", true);
      expect(r.page).toBe("echelles");
      expect(r.autoOpenScaleId).toBeUndefined();
      expect(r.dirty).toBe(true);
    });

    test("sans accès complet → conservé", async () => {
      const r = await resolveDeepLink("?echelle=glasgow", false);
      expect(r.autoOpenScaleId).toBeUndefined();
      expect(r.cleanedSearch).toBe("echelle=glasgow");
    });
  });

  test("combinaison vocale complète : médicament + poids", async () => {
    const drug = findUniqueDrug("CORDARONE");
    const r = await resolveDeepLink("?med=CORDARONE&poids=80", true);
    expect(r.page).toBe("medicaments");
    expect(r.autoOpenDrugId).toBe(drug.id);
    expect(r.patientWeight).toBe("80");
    expect(r.cleanedSearch).toBe("");
  });
});
