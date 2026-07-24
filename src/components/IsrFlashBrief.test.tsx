import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, vi } from "vitest";
import IsrFlashBrief, { isIsrBriefComplete } from "./IsrFlashBrief";

type Values = Record<string, boolean | string>;

const sourceValues: Values = {
  "0-0": "Dr Martin",
  "0-1": "Dr Bernard",
  "0-4": "IDE Robert",
  "0-5": "IDE Petit",
  "5-0": "Kétamine",
  "5-1": "108",
  "5-2": "Rocuronium",
  "5-3": "86,4",
};

const BriefHarness = ({ initialValues = sourceValues }: { initialValues?: Values }) => {
  const [values, setValues] = useState(initialValues);
  return (
    <>
      <IsrFlashBrief
        open
        patientWeight="72"
        values={values}
        onValueChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
        onClose={() => {}}
      />
      <button type="button" onClick={() => setValues((current) => ({ ...current, "5-1": "120" }))}>
        Modifier la dose source
      </button>
      <output data-testid="brief-values">{JSON.stringify(values)}</output>
    </>
  );
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("IsrFlashBrief", () => {
  test("reprend les rôles, les drogues et les doses fournies par la check-list", () => {
    render(<BriefHarness />);

    expect(screen.getByDisplayValue("Dr Martin")).toBeInTheDocument();
    expect(screen.getByDisplayValue("IDE Robert")).toBeInTheDocument();
    expect(screen.getByText("Kétamine · 108 mg IV")).toBeInTheDocument();
    expect(screen.getByText("Rocuronium · 86,4 mg IV")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Modifier la dose source" }));
    expect(screen.getByText("Kétamine · 120 mg IV")).toBeInTheDocument();
  });

  test("le minuteur démarre à 30 secondes et peut être mis en pause", () => {
    render(<BriefHarness />);
    expect(screen.getByText("00:30")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("00:29")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mettre en pause" }));
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText("00:29")).toBeInTheDocument();
  });

  test("bloque la validation tant que les neuf éléments ne sont pas confirmés", () => {
    render(<BriefHarness />);
    const completeButton = screen.getByRole("button", { name: "Équipe prête — démarrer" });
    expect(completeButton).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/Poids confirmé/));
    fireEvent.click(screen.getByLabelText(/Capnographie branchée/));
    fireEvent.change(screen.getByLabelText("Alternative annoncée à l’équipe"), {
      target: { value: "Vidéolaryngoscope + mandrin" },
    });
    fireEvent.click(screen.getByLabelText(/Plan B annoncé/));
    fireEvent.click(screen.getByLabelText(/Drogues \+ doses vérifiées/));

    expect(completeButton).toBeEnabled();
    fireEvent.click(completeButton);

    const values = JSON.parse(screen.getByTestId("brief-values").textContent || "{}") as Values;
    expect(isIsrBriefComplete(values, "72")).toBe(true);
    expect(values["6-6"]).toBeUndefined();
  });

  test("une modification de dose invalide une validation antérieure", () => {
    render(<BriefHarness />);
    fireEvent.click(screen.getByLabelText(/Poids confirmé/));
    fireEvent.click(screen.getByLabelText(/Capnographie branchée/));
    fireEvent.change(screen.getByLabelText("Alternative annoncée à l’équipe"), {
      target: { value: "Dispositif supraglottique" },
    });
    fireEvent.click(screen.getByLabelText(/Plan B annoncé/));
    fireEvent.click(screen.getByLabelText(/Drogues \+ doses vérifiées/));
    fireEvent.click(screen.getByRole("button", { name: "Équipe prête — démarrer" }));

    fireEvent.click(screen.getByRole("button", { name: "Modifier la dose source" }));
    const values = JSON.parse(screen.getByTestId("brief-values").textContent || "{}") as Values;
    expect(isIsrBriefComplete(values, "72")).toBe(false);
    expect(screen.getByLabelText(/Drogues \+ doses vérifiées/)).not.toBeChecked();
  });
});
