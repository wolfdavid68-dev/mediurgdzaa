import type { FallbackProps } from "react-error-boundary";

// Filet de sécurité ULTIME — rendu par l'<ErrorBoundary> racine (index.tsx)
// quand une erreur de rendu/lifecycle non rattrapée remonte jusqu'au sommet.
// Sans lui, une telle erreur démonte tout l'arbre React → #root vide → écran
// noir (fond sombre du body). En réa, un écran noir est inacceptable : ici on
// affiche au moins un message lisible, l'erreur exacte (pour diagnostic) et un
// bouton de rechargement.
//
// Styles 100 % inline À DESSEIN : ce composant doit s'afficher même si la
// feuille de style globale n'a pas chargé. Aucune dépendance lazy / réseau.
const RootErrorFallback = ({ error }: FallbackProps) => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  // Erreur de chargement de module (chunk lazy non dispo hors-ligne) : message
  // dédié, c'est le cas le plus probable pour un outil offline-first.
  const isChunkError =
    /dynamically imported module|Failed to fetch|importing a module|ChunkLoadError|Loading chunk/i.test(
      message
    );

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        inset: 0,
        background: "#0a0a12",
        color: "#e8e8f0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        textAlign: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        zIndex: 99999,
        overflowY: "auto",
      }}
    >
      <div style={{ fontSize: 40 }} aria-hidden="true">
        ⚠️
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Une erreur est survenue</h1>
      <p style={{ fontSize: 14, color: "#b8b8c8", maxWidth: 380, lineHeight: 1.5, margin: 0 }}>
        {isChunkError
          ? "Un composant n'a pas pu être chargé. Recharge l'application une fois en ligne pour réparer le cache hors-ligne."
          : "L'application a rencontré un problème. Recharge-la pour continuer."}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          background: "#FF3B30",
          color: "#fff",
          border: "none",
          borderRadius: 12,
          padding: "12px 24px",
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Recharger l'application
      </button>
      {/* Détail technique repliable — sert au diagnostic (screenshot par l'user). */}
      <details style={{ marginTop: 8, maxWidth: 360, width: "100%" }}>
        <summary style={{ fontSize: 12, color: "#888", cursor: "pointer" }}>
          Détail technique
        </summary>
        <pre
          style={{
            marginTop: 8,
            fontSize: 11,
            color: "#ff8a80",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            padding: 12,
            textAlign: "left",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            overflowX: "auto",
          }}
        >
          {message}
          {stack ? `\n\n${stack}` : ""}
        </pre>
      </details>
    </div>
  );
};

export default RootErrorFallback;
