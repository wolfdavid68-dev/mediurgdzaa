import { type ChangeEvent } from "react";

// Champ matricule réutilisable (Login + Register).
// Préfixe `M` figé à gauche (chip), input numérique 6 chiffres max.
// Toute saisie non-numérique est strippée à l'événement onChange.
type Props = {
  value: string; // sans le M (juste les chiffres)
  onChange: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  id?: string;
};

const MatriculeInput = ({ value, onChange, autoFocus, disabled, id }: Props) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const stripped = e.target.value.replace(/\D/g, "").slice(0, 6);
    onChange(stripped);
  };
  return (
    <div className="auth-matricule-field">
      <span className="auth-matricule-prefix mono" aria-hidden="true">
        M
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="username"
        className="auth-matricule-input mono"
        placeholder="402100"
        value={value}
        onChange={handleChange}
        autoFocus={autoFocus}
        disabled={disabled}
        maxLength={6}
        aria-label="Matricule professionnel (6 chiffres)"
      />
    </div>
  );
};

export default MatriculeInput;
