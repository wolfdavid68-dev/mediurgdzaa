import { fireEvent, render, screen } from "@testing-library/react";
import ProtocolCard from "./ProtocolCard";
import type { Protocol } from "../types/data";

// Mock minimal de protocole — on couvre la structure typique : sections de
// types variés (inclusion, actions, surveillance) avec items texte simples.
const mockProtocol: Protocol = {
  id: 9999,
  code: "TEST-001",
  titre: "Protocole de test",
  service: "SAUV",
  version: "1.0",
  valide: "2026-01-01",
  couleur: "#3b82f6",
  icon: "🧪",
  auteurs: ["Dr Test", "Dr Demo"],
  ref: "Référence interne v1",
  sections: [
    {
      type: "inclusion",
      titre: "Critères d'inclusion",
      items: [{ text: "Adulte > 18 ans" }, { text: "Symptôme X présent" }],
    },
    {
      type: "actions",
      titre: "Actions",
      items: [{ text: "Adrénaline 1 mg IV bolus" }, { text: "Surveillance scope continue" }],
    },
    {
      type: "surveillance",
      titre: "Surveillance",
      items: [{ text: "PA toutes les 5 min" }],
    },
  ],
};

describe("ProtocolCard", () => {
  test("rendu fermé : affiche titre, code, service, version", () => {
    render(<ProtocolCard protocol={mockProtocol} onDrugSearch={() => {}} />);
    expect(screen.getByText("Protocole de test")).toBeInTheDocument();
    expect(screen.getByText("TEST-001")).toBeInTheDocument();
    expect(screen.getByText("SAUV")).toBeInTheDocument();
    expect(screen.getByText(/v1\.0/)).toBeInTheDocument();
  });

  test("le corps n'est pas rendu tant qu'on n'a pas cliqué", () => {
    render(<ProtocolCard protocol={mockProtocol} onDrugSearch={() => {}} />);
    expect(screen.queryByText("Adulte > 18 ans")).not.toBeInTheDocument();
  });

  test("clic sur le header ouvre la carte et active l'onglet « actions » par défaut", () => {
    render(<ProtocolCard protocol={mockProtocol} onDrugSearch={() => {}} />);
    fireEvent.click(screen.getByText("Protocole de test"));
    // Les auteurs / ref sont visibles
    expect(screen.getByText(/Dr Test · Dr Demo/)).toBeInTheDocument();
    // L'onglet "actions" est actif → ses items sont rendus
    expect(screen.getByText(/IV bolus/)).toBeInTheDocument();
    // Les autres sections sont cachées (onglet inactif)
    expect(screen.queryByText("Adulte > 18 ans")).not.toBeInTheDocument();
  });

  test("changer d'onglet affiche les items de la section choisie", () => {
    render(<ProtocolCard protocol={mockProtocol} onDrugSearch={() => {}} />);
    fireEvent.click(screen.getByText("Protocole de test"));
    // Bascule sur Inclusion (le label vient de SECTION_META)
    fireEvent.click(screen.getByText("Inclusion"));
    expect(screen.getByText("Adulte > 18 ans")).toBeInTheDocument();
    expect(screen.getByText("Symptôme X présent")).toBeInTheDocument();
    // Les actions sont maintenant cachées
    expect(screen.queryByText(/IV bolus/)).not.toBeInTheDocument();
  });

  test("clic sur un médicament dans le texte appelle onDrugSearch", () => {
    const onDrugSearch = vi.fn();
    render(<ProtocolCard protocol={mockProtocol} onDrugSearch={onDrugSearch} />);
    fireEvent.click(screen.getByText("Protocole de test"));
    // « Adrénaline » est dans DRUG_PATTERNS → tokenizer génère un button cliquable
    const drugBtn = screen.getByRole("button", { name: /Adrénaline/i });
    fireEvent.click(drugBtn);
    expect(onDrugSearch).toHaveBeenCalledWith(expect.stringMatching(/adrénaline/i));
  });

  test("re-clic sur le header referme la carte", () => {
    render(<ProtocolCard protocol={mockProtocol} onDrugSearch={() => {}} />);
    const header = screen.getByText("Protocole de test").closest("button")!;
    fireEvent.click(header);
    expect(screen.getByText(/IV bolus/)).toBeInTheDocument();
    fireEvent.click(header);
    expect(screen.queryByText(/IV bolus/)).not.toBeInTheDocument();
  });

  test("partage : si navigator.share absent, fallback sur navigator.clipboard.writeText", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    // Pas de navigator.share dans happy-dom → fallback clipboard
    render(<ProtocolCard protocol={mockProtocol} onDrugSearch={() => {}} />);
    fireEvent.click(screen.getByText("Protocole de test"));
    fireEvent.click(screen.getByLabelText(/Partager le protocole/));
    // Le bouton tente clipboard.writeText avec un texte composé
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("MediURG — Protocole de test"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("TEST-001"));
  });

  test("partage : navigator.share appelé en priorité s'il existe", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    render(<ProtocolCard protocol={mockProtocol} onDrugSearch={() => {}} />);
    fireEvent.click(screen.getByText("Protocole de test"));
    fireEvent.click(screen.getByLabelText(/Partager le protocole/));
    await Promise.resolve();
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("Protocole de test"),
        text: expect.stringContaining("TEST-001"),
      })
    );
    // Cleanup pour ne pas fuiter dans les autres tests
    Reflect.deleteProperty(navigator, "share");
  });
});
