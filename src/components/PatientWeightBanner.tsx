import { type ChangeEvent } from "react";

// Bandeau « poids patient » partagé entre toutes les fiches médicament.
// Saisi une fois ici → s'applique à tous les calculateurs (dose, prep, PSE)
// dans toutes les cartes ouvertes. État géré par App.tsx, persisté en
// localStorage avec auto-expiration ~3 h (pour ne pas traîner d'un patient
// à l'autre entre 2 gardes).

type Props = {
  weight: string;
  onChange: (kg: string) => void;
};

const PatientWeightBanner = ({ weight, onChange }: Props) => {
  const handle = (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value);
  return (
    <div className="patient-weight" role="group" aria-label="Poids patient">
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      <span className="patient-weight-label">Poids patient</span>
      <input
        className="patient-weight-input"
        type="number"
        inputMode="decimal"
        min="1"
        max="300"
        step="0.1"
        placeholder="kg"
        value={weight}
        onChange={handle}
        aria-label="Poids patient en kilogrammes"
      />
      <span className="patient-weight-unit">kg</span>
      {weight && (
        <button
          type="button"
          className="patient-weight-clear"
          onClick={() => onChange("")}
          aria-label="Effacer le poids"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default PatientWeightBanner;
