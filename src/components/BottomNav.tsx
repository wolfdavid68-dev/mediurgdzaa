type BottomNavProps = {
  page: string;
  version: string;
  onNavigate: (page: string) => void;
  onOpenChangelog: () => void;
  onOpenAcr: () => void;
};

const BottomNav = ({ page, version, onNavigate, onOpenChangelog, onOpenAcr }: BottomNavProps) => (
  <>
    <nav className="bottom-nav">
      <div className="bottom-nav-row">
        <button
          className={`bottom-tab ${page === "medicaments" ? "bottom-tab-active" : ""}`}
          onClick={() => onNavigate("medicaments")}
          aria-current={page === "medicaments" ? "page" : undefined}
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
          </svg>
          <span>Médicaments</span>
        </button>
        <button
          className={`bottom-tab ${page === "protocoles" ? "bottom-tab-active" : ""}`}
          onClick={() => onNavigate("protocoles")}
          aria-current={page === "protocoles" ? "page" : undefined}
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="2" />
            <line x1="9" y1="12" x2="15" y2="12" />
            <line x1="9" y1="16" x2="13" y2="16" />
          </svg>
          <span>Protocoles</span>
        </button>
        <button
          className={`bottom-tab ${page === "echelles" ? "bottom-tab-active" : ""}`}
          onClick={() => onNavigate("echelles")}
          aria-current={page === "echelles" ? "page" : undefined}
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
            <circle cx="9" cy="6" r="1.5" fill="currentColor" />
            <circle cx="15" cy="12" r="1.5" fill="currentColor" />
            <circle cx="7" cy="18" r="1.5" fill="currentColor" />
          </svg>
          <span>Échelles</span>
        </button>
      </div>
      <button
        type="button"
        className="version-badge-nav"
        onClick={onOpenChangelog}
        title="Voir les notes de version"
        aria-label={`Version ${version} — voir les notes de version`}
      >
        {version}
      </button>
    </nav>

    <button
      type="button"
      className="urgence-fab"
      onClick={onOpenAcr}
      aria-label="Ouvrir le mode urgence ACR"
    >
      <span className="urgence-fab-icon" aria-hidden="true">
        🚨
      </span>
      <span className="urgence-fab-label">URGENCE</span>
    </button>
  </>
);

export default BottomNav;
