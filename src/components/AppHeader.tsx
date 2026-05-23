import { useEffect, useRef, useState, type ReactNode } from "react";
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

const SunIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
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
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const AppHeader = ({
  isOnline,
  theme,
  bigFont,
  adminLongPress,
  onOpenNotesBackup,
  onToggleFont,
  onToggleTheme,
  children,
}: AppHeaderProps) => {
  // Menu kebab : regroupe thème / police / sauvegarde notes derrière un seul
  // bouton 48 px (au lieu de 3 boutons serrés). Le badge ONLINE/OFFLINE reste
  // visible en permanence à côté.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handle = (action: () => void) => () => {
    action();
    setMenuOpen(false);
  };

  return (
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
          <div className="header-menu" ref={menuRef}>
            <button
              type="button"
              className="header-menu-btn"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Réglages"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
            {menuOpen && (
              <div className="header-menu-list" role="menu" aria-label="Réglages">
                <button
                  type="button"
                  role="menuitem"
                  className="header-menu-item"
                  onClick={handle(onToggleTheme)}
                >
                  <span className="header-menu-ic" aria-hidden="true">
                    {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                  </span>
                  <span>{theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="header-menu-item"
                  onClick={handle(onToggleFont)}
                >
                  <span className="header-menu-ic" aria-hidden="true">
                    <span className="header-menu-ic-text">A+</span>
                  </span>
                  <span>{bigFont ? "Police normale" : "Agrandir la police"}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="header-menu-item"
                  onClick={handle(onOpenNotesBackup)}
                >
                  <span className="header-menu-ic" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                  </span>
                  <span>Sauvegarder mes notes</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {children}
      </div>
    </header>
  );
};

export default AppHeader;
