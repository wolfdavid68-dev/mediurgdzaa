// Mock DRUGS pour avoir un dataset déterministe et compact (3 drugs).
// Évite la dépendance à drugs.js réel (78 entrées) qui rendrait les tests
// fragiles aux ajouts/modifs futurs.
vi.mock("../data/drugs", () => ({
  DRUGS: [
    { id: 1, nom: "DIPRIVAN" },
    { id: 2, nom: "HYPNOMIDATE" },
    { id: 3, nom: "KÉTAMINE" },
  ],
}));

vi.mock("../data/changelog", () => ({
  APP_VERSION: "v-test",
  CHANGELOG: [],
}));

import { fireEvent, render, screen } from "@testing-library/react";
import NotesBackup from "./NotesBackup";

// Stub localStorage avec un Map (Node 22 + happy-dom n'a pas de localStorage
// fonctionnel — cf. AcrModeModal.test.tsx pour le détail).
const lsStore = new Map<string, string>();
beforeEach(() => {
  lsStore.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => lsStore.get(k) ?? null,
    setItem: (k: string, v: string) => {
      lsStore.set(k, String(v));
    },
    removeItem: (k: string) => {
      lsStore.delete(k);
    },
    clear: () => lsStore.clear(),
    key: (i: number) => Array.from(lsStore.keys())[i] ?? null,
    get length() {
      return lsStore.size;
    },
  });
  // Stub URL.createObjectURL/revokeObjectURL sur le constructor existant
  // (happy-dom ne les implémente pas) — sans remplacer URL en entier sinon
  // les autres usages internes de happy-dom plantent.
  URL.createObjectURL = vi.fn(() => "blob:fake-url");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("NotesBackup — UI", () => {
  test("rend les 2 boutons + le texte explicatif", () => {
    render(<NotesBackup />);
    expect(screen.getByText("Mes notes personnelles")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exporter/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Importer/ })).toBeInTheDocument();
  });
});

describe("NotesBackup — export", () => {
  test("aucune note → message 'Aucune note à exporter'", () => {
    render(<NotesBackup />);
    fireEvent.click(screen.getByRole("button", { name: /Exporter/ }));
    expect(screen.getByText(/Aucune note à exporter/)).toBeInTheDocument();
  });

  test("notes présentes → déclenche createObjectURL et message succès", () => {
    lsStore.set("mediurg-note-1", "Note sur DIPRIVAN");
    lsStore.set("mediurg-note-3", "Note sur KÉTAMINE");
    render(<NotesBackup />);
    fireEvent.click(screen.getByRole("button", { name: /Exporter/ }));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/2 notes exportées/)).toBeInTheDocument();
  });

  test("note vide ou whitespace ignorée", () => {
    lsStore.set("mediurg-note-1", "Note réelle");
    lsStore.set("mediurg-note-2", "   "); // whitespace seul
    render(<NotesBackup />);
    fireEvent.click(screen.getByRole("button", { name: /Exporter/ }));
    expect(screen.getByText(/1 note exportée/)).toBeInTheDocument();
  });
});

describe("NotesBackup — import", () => {
  // Helper pour simuler un upload de fichier JSON
  const uploadFile = async (content: string) => {
    const file = new File([content], "notes.json", { type: "application/json" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    fireEvent.change(input);
    // Attend la résolution de file.text()
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
  };

  test("import valide : 2 notes match par id, écrites en localStorage", async () => {
    render(<NotesBackup />);
    const payload = JSON.stringify({
      schema: 1,
      exportedAt: "2026-05-14T00:00:00Z",
      appVersion: "v94",
      notes: [
        { drugId: 1, drugName: "DIPRIVAN", note: "Note A" },
        { drugId: 2, drugName: "HYPNOMIDATE", note: "Note B" },
      ],
    });
    await uploadFile(payload);
    expect(lsStore.get("mediurg-note-1")).toBe("Note A");
    expect(lsStore.get("mediurg-note-2")).toBe("Note B");
    expect(screen.getByText(/2 notes importées/)).toBeInTheDocument();
  });

  test("fallback par nom : id inconnu mais nom existe → migration", async () => {
    render(<NotesBackup />);
    const payload = JSON.stringify({
      schema: 1,
      exportedAt: "2026-05-14T00:00:00Z",
      notes: [
        // id 99 inexistant, mais "DIPRIVAN" existe → doit migrer vers id 1
        { drugId: 99, drugName: "DIPRIVAN", note: "Note migrée" },
      ],
    });
    await uploadFile(payload);
    expect(lsStore.get("mediurg-note-1")).toBe("Note migrée");
    expect(screen.getByText(/1 note importée.*1 migrée par nom/)).toBeInTheDocument();
  });

  test("entrée sans match (id et nom inconnus) → ignorée", async () => {
    render(<NotesBackup />);
    const payload = JSON.stringify({
      schema: 1,
      notes: [
        { drugId: 999, drugName: "INCONNU_XYZ", note: "Devrait être ignoré" },
        { drugId: 1, drugName: "DIPRIVAN", note: "OK" },
      ],
    });
    await uploadFile(payload);
    expect(lsStore.get("mediurg-note-1")).toBe("OK");
    expect(lsStore.has("mediurg-note-999")).toBe(false);
    expect(screen.getByText(/1 note importée.*1 ignorée/)).toBeInTheDocument();
  });

  test("note vide ignorée silencieusement", async () => {
    render(<NotesBackup />);
    const payload = JSON.stringify({
      schema: 1,
      notes: [
        { drugId: 1, drugName: "DIPRIVAN", note: "" },
        { drugId: 2, drugName: "HYPNOMIDATE", note: "valid" },
      ],
    });
    await uploadFile(payload);
    expect(lsStore.has("mediurg-note-1")).toBe(false);
    expect(lsStore.get("mediurg-note-2")).toBe("valid");
    expect(screen.getByText(/1 note importée/)).toBeInTheDocument();
  });

  test("JSON invalide → message d'erreur, localStorage intact", async () => {
    render(<NotesBackup />);
    await uploadFile("ceci n'est pas du JSON {{{");
    expect(screen.getByText(/Lecture du fichier échouée/)).toBeInTheDocument();
    expect(lsStore.size).toBe(0);
  });

  test("JSON sans champ notes → message d'erreur fichier invalide", async () => {
    render(<NotesBackup />);
    await uploadFile(JSON.stringify({ schema: 1, somethingElse: true }));
    expect(screen.getByText(/Fichier invalide/)).toBeInTheDocument();
  });

  test("clic sur Importer ouvre le file picker (file input présent)", () => {
    render(<NotesBackup />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.accept).toContain("json");
    // Spy sur le click() de l'input
    const clickSpy = vi.spyOn(input, "click");
    fireEvent.click(screen.getByRole("button", { name: /Importer/ }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
