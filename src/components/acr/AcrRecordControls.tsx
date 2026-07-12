import { useId, useState, type ReactNode } from "react";
import { Check as CheckIcon, CheckCircle2, ChevronDown } from "lucide-react";
import type { AcrDevenir, AcrVoie } from "../../lib/acrSession";

export const SIGNE_REVEIL = [
  "Mouvements volontaires",
  "Ouverture des yeux",
  "Respiration spontanée",
  "Autre",
];
export const DESTINATIONS: AcrDevenir[] = ["Décès", "Transfert réa", "Retour domicile", "Autre"];
export const VOIES: AcrVoie[] = ["Périphérique", "Centrale", "IO"];

type FieldProps = {
  label: string;
  value?: string | number;
  type?: string;
  placeholder?: string;
  suffix?: string;
  onChange: (value: string) => void;
};

export const Field = ({
  label,
  value,
  type = "text",
  placeholder,
  suffix,
  onChange,
}: FieldProps) => (
  <label className="acr-record-field">
    <span>{label}</span>
    <div className="acr-record-input-wrap">
      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event: { currentTarget: HTMLInputElement }) =>
          onChange(event.currentTarget.value)
        }
      />
      {suffix && <em>{suffix}</em>}
    </div>
  </label>
);

export const Section = ({
  title,
  subtitle,
  showStatus = true,
  children,
}: {
  title: string;
  subtitle?: string;
  showStatus?: boolean;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(true);
  const panelId = useId();
  const match = /^(\d+)\.\s*(.*)$/.exec(title);
  const index = match?.[1];
  const cleanTitle = match?.[2] ?? title;
  return (
    <section className={`acr-record-section ${open ? "" : "acr-record-section-collapsed"}`}>
      <button
        type="button"
        className="acr-record-section-head"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${open ? "Replier" : "Déplier"} ${cleanTitle}`}
        onClick={() => setOpen((value) => !value)}
      >
        {index && <span className="acr-record-section-index">{index}</span>}
        <div className="acr-record-section-head-text">
          <h4>{cleanTitle}</h4>
          {subtitle && <p className="acr-record-section-subtitle">{subtitle}</p>}
        </div>
        {showStatus && (
          <CheckCircle2
            className="acr-record-section-status"
            size={20}
            strokeWidth={2.7}
            aria-hidden="true"
          />
        )}
        <ChevronDown
          className="acr-record-section-chevron"
          size={20}
          strokeWidth={2.4}
          aria-hidden="true"
        />
      </button>
      <div id={panelId} className="acr-record-section-body">
        {children}
      </div>
    </section>
  );
};

export const Chip = ({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    className={`acr-record-chip ${active ? "acr-record-chip-active" : ""}`}
    aria-pressed={active}
    onClick={onClick}
  >
    {children}
  </button>
);

export const CheckOption = ({
  checked,
  children,
  className,
  onChange,
}: {
  checked: boolean;
  children: ReactNode;
  className?: string;
  onChange: () => void;
}) => (
  <button
    type="button"
    className={`acr-record-check ${checked ? "acr-record-check-on" : ""} ${className ?? ""}`}
    aria-pressed={checked}
    onClick={onChange}
  >
    <span aria-hidden="true">{checked && <CheckIcon size={14} strokeWidth={3} />}</span>
    {children}
  </button>
);

export const toggleInArray = (items: string[], value: string): string[] =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

export const parseOptionalNumber = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
};
