import { useEffect, useId, useState } from "react";
import type { PreparationNumericControl } from "../PreparationModel";

type PreparationDoseStepperProps = {
  label: string;
  displayValue: string;
  control: PreparationNumericControl;
  onDecrease: () => void;
  onIncrease: () => void;
  onEdit: () => void;
  onValueChange: (value: number) => void;
};

const formatEditableNumber = (value: number) => String(value).replace(".", ",");

const parseEditableNumber = (value: string) => {
  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? +parsed.toFixed(6) : null;
};

const formatControlBound = (value: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 6 }).format(value);

const isUnsetPreviewValue = (value: number, minimum: number | undefined) =>
  value === 0 && minimum !== undefined && minimum > 0;

const formatControlDraft = (value: number, minimum: number | undefined) =>
  isUnsetPreviewValue(value, minimum) ? "" : formatEditableNumber(value);

export const PreparationDoseStepper = ({
  label,
  displayValue,
  control,
  onDecrease,
  onIncrease,
  onEdit,
  onValueChange,
}: PreparationDoseStepperProps) => {
  const [draft, setDraft] = useState(() => formatControlDraft(control.value, control.min));
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const minimum = control.min;
  const maximum = control.max;

  useEffect(() => {
    setDraft(formatControlDraft(control.value, control.min));
    setError(null);
  }, [control.value, control.min]);

  const rangeHint =
    minimum !== undefined && maximum !== undefined
      ? `${formatControlBound(minimum)} à ${formatControlBound(maximum)}`
      : minimum !== undefined
        ? `au moins ${formatControlBound(minimum)}`
        : maximum !== undefined
          ? `au plus ${formatControlBound(maximum)}`
          : null;

  const validate = (value: string) => {
    const parsed = parseEditableNumber(value);
    if (parsed === null) return { value: null, message: "Saisir un nombre valide" };
    if (minimum !== undefined && parsed < minimum) {
      return { value: null, message: `Valeur attendue : ${rangeHint}` };
    }
    if (maximum !== undefined && parsed > maximum) {
      return { value: null, message: `Valeur attendue : ${rangeHint}` };
    }
    if (
      control.kind === "recipe" &&
      control.steps?.length &&
      !control.steps.some((step) => Math.abs(step - parsed) < 0.0001)
    ) {
      return {
        value: null,
        message: `Valeurs disponibles : ${control.steps.join(", ")}`,
      };
    }
    return { value: parsed, message: null };
  };

  const applyDraft = (value: string) => {
    const result = validate(value);
    if (result.value === null) {
      setError(`${result.message} · valeur précédente conservée`);
      setDraft(formatControlDraft(control.value, control.min));
      return;
    }
    setDraft(formatEditableNumber(result.value));
    setError(null);
    if (result.value !== control.value) onValueChange(result.value);
  };

  const handleDraftChange = (value: string) => {
    onEdit();
    setDraft(value);
    const result = validate(value);
    setError(result.message);
    if (result.value !== null && result.value !== control.value) {
      onValueChange(result.value);
    }
  };

  return (
    <>
      <div className="preview-v25-dose-stepper">
        <button
          type="button"
          aria-label={
            control.kind === "pse" ? "Diminuer le réglage" : "Diminuer la valeur prescrite"
          }
          disabled={minimum !== undefined && control.value <= minimum}
          onClick={onDecrease}
        >
          −
        </button>
        <span className="preview-v25-dose-entry">
          <input
            type="text"
            role="spinbutton"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={draft}
            placeholder="Saisir"
            aria-label={`Saisir ${label}`}
            aria-valuemin={minimum}
            aria-valuemax={maximum}
            aria-valuenow={
              isUnsetPreviewValue(control.value, control.min) ? undefined : control.value
            }
            aria-valuetext={
              isUnsetPreviewValue(control.value, control.min) ? "Non renseigné" : displayValue
            }
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            onFocus={(event) => {
              setError(null);
              event.currentTarget.select();
            }}
            onChange={(event) => handleDraftChange(event.currentTarget.value)}
            onBlur={(event) => applyDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                onDecrease();
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                onIncrease();
              } else if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              } else if (event.key === "Escape") {
                event.preventDefault();
                setDraft(formatControlDraft(control.value, control.min));
                setError(null);
                event.currentTarget.blur();
              }
            }}
          />
          {control.unit && <span aria-hidden="true">{control.unit}</span>}
        </span>
        <button
          type="button"
          aria-label={
            control.kind === "pse" ? "Augmenter le réglage" : "Augmenter la valeur prescrite"
          }
          disabled={maximum !== undefined && control.value >= maximum}
          onClick={onIncrease}
        >
          +
        </button>
      </div>
      {control.result && <output className="preview-v25-dose-result">{control.result}</output>}
      {error && (
        <span id={errorId} className="preview-v25-dose-error" role="alert">
          {error}
        </span>
      )}
    </>
  );
};
