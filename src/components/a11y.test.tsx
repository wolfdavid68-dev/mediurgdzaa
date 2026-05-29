// Tests d'accessibilité automatisés via axe-core (jest-axe).
//
// Objectif : empêcher les régressions sur les violations WCAG 2.x niveau A/AA
// qu'axe sait détecter automatiquement (labels manquants, contrastes
// flagrants côté markup, rôles ARIA invalides, focus piégés, etc.).
//
// Périmètre : on cible les composants à fort risque ergonomique côté
// urgentiste (page principale, fiche médicament ouverte, carte protocole,
// modale charte). Les tests ne remplacent PAS un audit manuel — axe ne
// détecte que ~30-40 % des problèmes a11y — mais ils accrochent les
// régressions évidentes (un `<button>` sans label, un `aria-controls`
// pointant nulle part, etc.).
//
// Note : les modales basées sur <dialog> ne sont pas mises en open via
// showModal() par happy-dom de façon identique au browser. On rend donc
// le markup directement via la prop `open` (qui pose l'attribut HTML
// `open` sans appel JS) et axe analyse le DOM tel quel.

import { axe, toHaveNoViolations } from "jest-axe";
import { render } from "@testing-library/react";
import { expect, test, describe } from "vitest";
import MedicamentsPage from "../pages/MedicamentsPage";
import ProtocolCard from "./ProtocolCard";
import CharterModal from "./CharterModal";
import OfflineBanner from "./OfflineBanner";
import AcrModeModal from "./AcrModeModal";
import KitChecklist from "./KitChecklist";
import IncompatibilityList from "./IncompatibilityList";
import type { Drug, Protocol } from "../types/data";

expect.extend(toHaveNoViolations);

const mkDrug = (over: Partial<Drug> & { id: number; nom: string }): Drug => ({
  commercial: "Commercial",
  dci: "DCI",
  classe: "Classe",
  cat: "Hypnotiques",
  svc: ["SAU"],
  couleur: "#F5D300",
  icon: "💊",
  desc: "Description courte.",
  indic: ["Indication"],
  ci: [],
  ei: [],
  cond: [],
  poso: { a: ["1-2 mg/kg IV lente"], p: ["0,5 mg/kg IV"] },
  ...over,
});

const drugA = mkDrug({ id: 1, nom: "Étomidate" });
const drugB = mkDrug({ id: 2, nom: "Kétamine" });

const baseProps = {
  filtered: [drugA, drugB],
  recentDrugs: [],
  favorites: new Set<number>(),
  showFavoritesOnly: false,
  patientWeight: "",
  onToggleFavorite: () => {},
  onOpen: () => {},
  onOpenChange: () => {},
  onProtocolOpen: () => {},
};

const mockProtocol: Protocol = {
  id: 99,
  code: "TEST-A11Y",
  titre: "Protocole accessibilité",
  service: "SAUV",
  version: "1.0",
  valide: "2026-01-01",
  couleur: "#3b82f6",
  icon: "🧪",
  auteurs: ["Dr Test"],
  ref: "Référence v1",
  sections: [
    {
      type: "inclusion",
      titre: "Critères d'inclusion",
      items: [{ text: "Adulte > 18 ans" }],
    },
    {
      type: "actions",
      titre: "Actions",
      items: [{ text: "Adrénaline 1 mg IV bolus" }],
    },
  ],
};

const mockChecklist = [
  {
    titre: "Préparation",
    items: [
      { type: "check" as const, label: "Patient monitoré" },
      { type: "choice" as const, label: "Pré-oxygénation", options: ["MHC", "VNI"] },
      { type: "select" as const, label: "Hypnotique", from: "Hypnotique" },
      { type: "text" as const, label: "Dose", unit: "mg" },
    ],
  },
];

describe("a11y — axe-core", () => {
  test("MedicamentsPage : liste fermée, aucune violation axe", async () => {
    const { container } = render(<MedicamentsPage {...baseProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("ProtocolCard fermée : aucune violation", async () => {
    const { container } = render(<ProtocolCard protocol={mockProtocol} onDrugSearch={() => {}} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("OfflineBanner : aucune violation (rôle status + texte)", async () => {
    const { container } = render(<OfflineBanner isOnline={false} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("CharterModal ouverte : aucune violation sur le contenu de la dialog", async () => {
    // Le markup <dialog open> est exposé même sans showModal() côté happy-dom :
    // axe peut analyser titre, paragraphes, bouton et leurs relations ARIA.
    const { container } = render(
      <CharterModal open onAccept={() => {}} onClose={() => {}} requireAccept />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("AcrModeModal ouverte : aucune violation sur le picker urgence", async () => {
    const { container } = render(<AcrModeModal open onClose={() => {}} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("KitChecklist : aucune violation sur check-list interactive", async () => {
    const { container } = render(
      <KitChecklist
        kitId="a11y-kit"
        titre="Kit accessibilité"
        checklist={mockChecklist}
        couleur="#FF453A"
        drogues={[{ nom: "Étomidate", role: "Hypnotique d'induction" }]}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("IncompatibilityList : aucune violation sur matrice et vues", async () => {
    const { container } = render(<IncompatibilityList />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
