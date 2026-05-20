import type { ReactNode } from "react";
import type { useLongPress } from "../lib/useLongPress";

type AppHeaderProps = {
  isOnline: boolean;
  theme: string;
  bigFont: boolean;
  adminLongPress: ReturnType<typeof useLongPress>;
  onOpenNotesBackup: () => void;
  onToggleFont: () => void;
  onToggleTheme: () => void;
  children?: ReactNode;
};

const AppHeader = ({
  isOnline,
  theme,
  bigFont,
  adminLongPress,
  onOpenNotesBackup,
  onToggleFont,
  onToggleTheme,
  children,
}: AppHeaderProps) => (
  <header className="app-header">
    <div className="header-inner">
      <div className="logo-row">
        <div
          className="logo"
          {...adminLongPress}
          style={{ WebkitUserSelect: "none", userSelect: "none" }}
        >
          <div className="logo-mark">
            <img src="/logo-sau.png" alt="Urgences Mulhouse" draggable={false} />
          </div>
          <div className="logo-text">
            <h1>MediURG</h1>
            <p>Pharmacologie d'urgence · SAUV · SMUR · SAU</p>
          </div>
        </div>
        <span
          className={`net-status ${isOnline ? "net-status-online" : "net-status-offline"}`}
          aria-live="polite"
          title={isOnline ? "Connecté au réseau" : "Hors ligne — données en cache"}
        >
          <span className="net-status-dot" aria-hidden="true" />
          {isOnline ? "Online" : "Offline"}
        </span>
        <button
          type="button"
          className="notes-backup-toggle"
          onClick={onOpenNotesBackup}
          aria-label="Sauvegarder mes notes personnelles"
          title="Sauvegarder / restaurer mes notes"
        >
          💾
        </button>
        <button
          className={`font-toggle ${bigFont ? "font-toggle-active" : ""}`}
          onClick={onToggleFont}
          aria-label={bigFont ? "Réduire la police" : "Agrandir la police"}
        >
          A+
        </button>
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
        >
          {theme === "dark" ? (
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>

      {children}
    </div>
  </header>
);

export default AppHeader;
