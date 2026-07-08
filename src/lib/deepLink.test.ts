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
  test("chaîne vide → rien à appliquer", () => {
    const r = resolveDeepLink("", true);
    expect(r.dirty).toBe(false);
    expect(r.cleanedSearch).toBe("");
  });

  test("paramètres inconnus → conservés sans replaceState", () => {
    const r = resolveDeepLink("?utm_source=qr", true);
    expect(r.dirty).toBe(false);
    expect(r.cleanedSearch).toBe("utm_source=qr");
  });

  describe("?mode=acr", () => {
    test("avec accès complet → ouvre la modale et consomme", () => {
      const r = resolveDeepLink("?mode=acr", true);
      expect(r.showAcr).toBe(true);
      expect(r.dirty).toBe(true);
      expect(r.cleanedSearch).toBe("");
    });

    test("sans accès complet → param conservé pour rejeu", () => {
      const r = resolveDeepLink("?mode=acr", false);
      expect(r.showAcr).toBeUndefined();
      expect(r.dirty).toBe(false);
      expect(r.cleanedSearch).toBe("mode=acr");
    });
  });

  describe("?page + ?tab", () => {
    test("protocoles + kits avec accès complet", () => {
      const r = resolveDeepLink("?page=protocoles&tab=kits", true);
      expect(r.page).toBe("protocoles");
      expect(r.protoCategory).toBe("kits");
      expect(r.cleanedSearch).toBe("");
    });

    test("echelles sans accès complet → conservé", () => {
      const r = resolveDeepLink("?page=echelles", false);
      expect(r.page).toBeUndefined();
      expect(r.cleanedSearch).toBe("page=echelles");
    });

    test("medicaments → accessible sans accès complet", () => {
      const r = resolveDeepLink("?page=medicaments", false);
      expect(r.page).toBe("medicaments");
      expect(r.cleanedSearch).toBe("");
    });

    test("tab invalide → conservé", () => {
      const r = resolveDeepLink("?tab=inexistant", true);
      expect(r.protoCategory).toBeUndefined();
      expect(r.cleanedSearch).toBe("tab=inexistant");
    });
  });

  describe("?kit", () => {
    test("kit connu → Protocoles → Kits avec le kit déployé", () => {
      const r = resolveDeepLink("?kit=ktc", true);
      expect(r.page).toBe("protocoles");
      expect(r.protoCategory).toBe("kits");
      expect(r.autoOpenKitId).toBe("ktc");
      expect(r.cleanedSearch).toBe("");
    });

    test("insensible à la casse", () => {
      const r = resolveDeepLink("?kit=KTC", true);
      expect(r.autoOpenKitId).toBe("ktc");
    });

    test("chaque id de PREP_KITS est résolu", () => {
      for (const kit of PREP_KITS) {
        expect(resolveDeepLink(`?kit=${kit.id}`, true).autoOpenKitId).toBe(kit.id);
      }
    });

    test("kit inconnu → consommé sans navigation", () => {
      const r = resolveDeepLink("?kit=inexistant", true);
      expect(r.autoOpenKitId).toBeUndefined();
      expect(r.page).toBeUndefined();
      expect(r.dirty).toBe(true);
      expect(r.cleanedSearch).toBe("");
    });

    test("sans accès complet → conservé, les params libres restent consommés", () => {
      const r = resolveDeepLink("?kit=ktc&poids=80", false);
      expect(r.autoOpenKitId).toBeUndefined();
      expect(r.patientWeight).toBe("80");
      expect(r.cleanedSearch).toBe("kit=ktc");
    });
  });

  describe("?kit + ?onglet", () => {
    test("onglet toujours disponible → appliqué", () => {
      const r = resolveDeepLink("?kit=drain-thoracique&onglet=materiel", true);
      expect(r.autoOpenKitId).toBe("drain-thoracique");
      expect(r.autoOpenKitTab).toBe("materiel");
      expect(r.cleanedSearch).toBe("");
    });

    test("alias « rearmement » → onglet materiel", () => {
      const r = resolveDeepLink("?kit=drain-thoracique&onglet=rearmement", true);
      expect(r.autoOpenKitTab).toBe("materiel");
    });

    test("onglet lignes réservé au kit ktc", () => {
      expect(resolveDeepLink("?kit=ktc&onglet=lignes", true).autoOpenKitTab).toBe("lignes");
      const r = resolveDeepLink("?kit=drain-thoracique&onglet=lignes", true);
      expect(r.autoOpenKitTab).toBeUndefined();
      expect(r.autoOpenKitId).toBe("drain-thoracique");
    });

    test("onglet schema seulement si le kit a un schéma", () => {
      const withSchema = PREP_KITS.filter((k) => k.schema).map((k) => k.id);
      const withoutSchema = PREP_KITS.filter((k) => !k.schema).map((k) => k.id);
      for (const id of withSchema) {
        expect(resolveDeepLink(`?kit=${id}&onglet=schema`, true).autoOpenKitTab).toBe("schema");
      }
      for (const id of withoutSchema) {
        expect(resolveDeepLink(`?kit=${id}&onglet=schema`, true).autoOpenKitTab).toBeUndefined();
      }
    });

    test("onglet inconnu → ignoré mais consommé", () => {
      const r = resolveDeepLink("?kit=ktc&onglet=inexistant", true);
      expect(r.autoOpenKitId).toBe("ktc");
      expect(r.autoOpenKitTab).toBeUndefined();
      expect(r.cleanedSearch).toBe("");
    });

    test("onglet sans kit → conservé tel quel", () => {
      const r = resolveDeepLink("?onglet=materiel", true);
      expect(r.autoOpenKitTab).toBeUndefined();
      expect(r.dirty).toBe(false);
      expect(r.cleanedSearch).toBe("onglet=materiel");
    });
  });

  describe("?med", () => {
    test("id numérique exact → recherche préremplie + fiche déployée", () => {
      const drug = DRUGS[0];
      const r = resolveDeepLink(`?med=${drug.id}`, false);
      expect(r.page).toBe("medicaments");
      expect(r.search).toBe(drug.nom);
      expect(r.autoOpenDrugId).toBe(drug.id);
      expect(r.cleanedSearch).toBe("");
    });

    test("nom sans ambiguïté → fiche déployée", () => {
      const drug = findUniqueDrug("CORDARONE");
      const r = resolveDeepLink("?med=CORDARONE", false);
      expect(r.search).toBe("CORDARONE");
      expect(r.autoOpenDrugId).toBe(drug.id);
    });

    test("recherche ambiguë → liste filtrée seulement, pas d'auto-ouverture", () => {
      const r = resolveDeepLink("?med=ine", false);
      expect(r.search).toBe("ine");
      expect(r.autoOpenDrugId).toBeUndefined();
      expect(r.cleanedSearch).toBe("");
    });

    test("id inexistant → recherche brute, pas d'auto-ouverture", () => {
      const r = resolveDeepLink("?med=999999", false);
      expect(r.search).toBe("999999");
      expect(r.autoOpenDrugId).toBeUndefined();
    });

    test("valeur vide → consommé sans effet", () => {
      const r = resolveDeepLink("?med=", false);
      expect(r.search).toBeUndefined();
      expect(r.dirty).toBe(true);
    });
  });

  describe("?poids", () => {
    test("virgule décimale normalisée en point", () => {
      const r = resolveDeepLink("?poids=72,5", false);
      expect(r.patientWeight).toBe("72.5");
      expect(r.cleanedSearch).toBe("");
    });

    test("point décimal accepté", () => {
      expect(resolveDeepLink("?poids=12.3", false).patientWeight).toBe("12.3");
    });

    test.each(["abc", "0", "-5", "400", ""])(
      "valeur invalide « %s » → ignorée mais consommée",
      (poids) => {
        const r = resolveDeepLink(`?poids=${poids}`, false);
        expect(r.patientWeight).toBeUndefined();
        expect(r.dirty).toBe(true);
        expect(r.cleanedSearch).toBe("");
      }
    );
  });

  describe("?compat", () => {
    test("deux noms résolus → vue Comparer avec la paire", () => {
      const r = resolveDeepLink("?compat=noradrenaline,lasilix", true);
      expect(r.page).toBe("protocoles");
      expect(r.protoCategory).toBe("incompatibilites");
      expect(r.incompatPair).toEqual(["Norépinéphrine (Noradrénaline®)", "Furosémide (Lasilix®)"]);
      expect(r.cleanedSearch).toBe("");
    });

    test("« adrenaline » résout Adrénaline (match exact), pas Noradrénaline", () => {
      const r = resolveDeepLink("?compat=adrenaline,propofol", true);
      expect(r.incompatPair).toEqual(["Adrénaline®", "Propofol (Diprivan®)"]);
    });

    test("un seul nom → vue Fiche focalisée", () => {
      const r = resolveDeepLink("?compat=noradrenaline", true);
      expect(r.incompatFocus).toBe("Norépinéphrine (Noradrénaline®)");
      expect(r.incompatPair).toBeUndefined();
    });

    test("un des deux noms inconnu → Fiche sur le nom résolu", () => {
      const r = resolveDeepLink("?compat=noradrenaline,xyz", true);
      expect(r.incompatFocus).toBe("Norépinéphrine (Noradrénaline®)");
      expect(r.incompatPair).toBeUndefined();
    });

    test("aucun nom résolu → onglet Incompatibilités quand même", () => {
      const r = resolveDeepLink("?compat=xyz,abc", true);
      expect(r.page).toBe("protocoles");
      expect(r.protoCategory).toBe("incompatibilites");
      expect(r.incompatPair).toBeUndefined();
      expect(r.incompatFocus).toBeUndefined();
      expect(r.dirty).toBe(true);
    });

    test("sans accès complet → conservé", () => {
      const r = resolveDeepLink("?compat=noradrenaline,lasilix", false);
      expect(r.incompatPair).toBeUndefined();
      expect(r.dirty).toBe(false);
      expect(r.cleanedSearch).toContain("compat=");
    });
  });

  describe("?protocole", () => {
    const protocols = PROTOCOLS as Protocol[];

    test("code exact avec ou sans espace → protocole déployé", () => {
      const pisu5 = protocols.find((p) => p.code === "PISU 5");
      expect(pisu5).toBeDefined();
      for (const q of ["PISU 5", "pisu5", "pisu-5"]) {
        const r = resolveDeepLink(`?protocole=${q}`, true);
        expect(r.page).toBe("protocoles");
        expect(r.protoCategory).toBe("PISU");
        expect(r.autoOpenProtocolId).toBe(pisu5!.id);
      }
    });

    test("id numérique → protocole déployé", () => {
      const first = protocols[0];
      const r = resolveDeepLink(`?protocole=${first.id}`, true);
      expect(r.autoOpenProtocolId).toBe(first.id);
    });

    test("texte sans ambiguïté → protocole déployé", () => {
      const hemorragie = protocols.filter((p) => p.titre.includes("Hémorragie"));
      expect(hemorragie.length).toBe(1);
      const r = resolveDeepLink("?protocole=hemorragie", true);
      expect(r.autoOpenProtocolId).toBe(hemorragie[0].id);
    });

    test("texte ambigu (Adulte + Enfant) → liste PISU sans auto-ouverture", () => {
      const matches = protocols.filter((p) => p.titre.includes("Détresse Respiratoire"));
      expect(matches.length).toBeGreaterThan(1);
      const r = resolveDeepLink("?protocole=detresse respiratoire", true);
      expect(r.page).toBe("protocoles");
      expect(r.protoCategory).toBe("PISU");
      expect(r.autoOpenProtocolId).toBeUndefined();
    });

    test("sans accès complet → conservé", () => {
      const r = resolveDeepLink("?protocole=pisu5", false);
      expect(r.autoOpenProtocolId).toBeUndefined();
      expect(r.cleanedSearch).toBe("protocole=pisu5");
    });
  });

  describe("?echelle", () => {
    const scales = SCALES as ClinicalScale[];

    test("chaque id d'échelle est résolu", () => {
      for (const scale of scales) {
        const r = resolveDeepLink(`?echelle=${encodeURIComponent(scale.id)}`, true);
        expect(r.page).toBe("echelles");
        expect(r.autoOpenScaleId).toBe(scale.id);
      }
    });

    test("nom sans ambiguïté → échelle déployée", () => {
      const ramsay = scales.filter((s) => s.nom.includes("Ramsay"));
      expect(ramsay.length).toBe(1);
      const r = resolveDeepLink("?echelle=ramsay", true);
      expect(r.autoOpenScaleId).toBe(ramsay[0].id);
    });

    test("nom inconnu → page Échelles sans auto-ouverture", () => {
      const r = resolveDeepLink("?echelle=inexistant", true);
      expect(r.page).toBe("echelles");
      expect(r.autoOpenScaleId).toBeUndefined();
      expect(r.dirty).toBe(true);
    });

    test("sans accès complet → conservé", () => {
      const r = resolveDeepLink("?echelle=glasgow", false);
      expect(r.autoOpenScaleId).toBeUndefined();
      expect(r.cleanedSearch).toBe("echelle=glasgow");
    });
  });

  test("combinaison vocale complète : médicament + poids", () => {
    const drug = findUniqueDrug("CORDARONE");
    const r = resolveDeepLink("?med=CORDARONE&poids=80", true);
    expect(r.page).toBe("medicaments");
    expect(r.autoOpenDrugId).toBe(drug.id);
    expect(r.patientWeight).toBe("80");
    expect(r.cleanedSearch).toBe("");
  });
});
