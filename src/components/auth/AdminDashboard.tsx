import { useEffect, useRef, useState } from "react";
import { type Profile } from "../../lib/auth";
import { useAdminProfiles, type AdminTab } from "./hooks/useAdminProfiles";
import { BAN_REASONS } from "./authConstants";

// Console d'administration. Affichée uniquement quand profile.role === 'admin'.
// 3 onglets : Demandes (status=pending), Personnels (status=active),
// Suspendus (status=banned). Chaque ligne a des actions contextuelles.
// Logique partagée avec MobileAdminDashboard via useAdminProfiles.

type Props = {
  currentUserName: string;
  onLogout: () => void;
  onExitAdmin: () => void; // retour à la vue user normale
};

const AdminDashboard = ({ currentUserName, onLogout, onExitAdmin }: Props) => {
  const {
    tab,
    setTab,
    profiles,
    loading,
    error,
    selected,
    setSelected,
    busyId,
    toast,
    approve: onApprove,
    reject: onReject,
    ban,
    unban: onUnban,
    handleLogout,
  } = useAdminProfiles(onLogout);
  const [banReason, setBanReason] = useState<string>(BAN_REASONS[0]);

  const onBan = (p: Profile) => ban(p, banReason);

  // A11y du drawer de suspension : focus déplacé dedans à l'ouverture,
  // piège de focus (Tab cyclique), Échap ferme, focus restauré. L'arrière-
  // plan (topbar/sidebar/main) passe `inert` (cf. JSX) → hors clavier/SR.
  const drawerRef = useRef<HTMLElement>(null);
  const drawerOpen = !!selected && tab === "active";
  useEffect(() => {
    if (!drawerOpen) return;
    const el = drawerRef.current;
    const prev = document.activeElement as HTMLElement | null;
    el?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSelected(null);
        return;
      }
      if (e.key !== "Tab" || !el) return;
      const f = el.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [drawerOpen, setSelected]);

  // KPI : compteurs dérivés du lot courant (comme avant — affichage du seul
  // onglet chargé). Pas de fetch supplémentaire.
  const counts = {
    pending: profiles.filter((p) => p.status === "pending").length,
    active: profiles.filter((p) => p.status === "active").length,
    banned: profiles.filter((p) => p.status === "banned").length,
  };

  const tabLabel: Record<AdminTab, string> = {
    pending: "Demandes",
    active: "Personnels actifs",
    banned: "Comptes suspendus",
  };

  return (
    <div className="admin-stage">
      <header className="admin-topbar" inert={drawerOpen ? true : undefined}>
        <div className="admin-brand">
          <img src="/logo-sau.png" alt="" width={28} height={28} />
          <span className="admin-brand-title">Console d'administration</span>
          <span className="admin-brand-sep">·</span>
          <span className="admin-crumbs">{tabLabel[tab]}</span>
        </div>
        <div className="admin-user">
          <span className="admin-user-name">{currentUserName}</span>
          <span className="admin-user-role">Admin</span>
          <button
            type="button"
            className="admin-exit"
            onClick={onExitAdmin}
            title="Vue utilisateur"
          >
            ← App
          </button>
          <button type="button" className="admin-logout" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </header>

      <div className="admin-body">
        <aside className="admin-sidebar" inert={drawerOpen ? true : undefined}>
          <div className="admin-sidebar-section-label">Gestion des accès</div>
          <nav className="admin-nav">
            {(["pending", "active", "banned"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`admin-nav-item ${tab === t ? "admin-nav-item-active" : ""}`}
                onClick={() => setTab(t)}
              >
                <span>{tabLabel[t]}</span>
                <span className="admin-nav-badge">{tab === t ? profiles.length : ""}</span>
              </button>
            ))}
          </nav>
          <div className="admin-kpi">
            <div>
              <div className="admin-kpi-num">{counts.active}</div>
              <div className="admin-kpi-lbl">Actifs</div>
            </div>
            <div>
              <div className="admin-kpi-num">{counts.pending}</div>
              <div className="admin-kpi-lbl">Attente</div>
            </div>
            <div>
              <div className="admin-kpi-num">{counts.banned}</div>
              <div className="admin-kpi-lbl">Suspendus</div>
            </div>
          </div>
        </aside>

        <main className="admin-main" inert={drawerOpen ? true : undefined}>
          <div className="admin-main-head">
            <h1 className="admin-main-title">{tabLabel[tab]}</h1>
            <div className="admin-main-pill">
              {loading ? "…" : `${profiles.length} résultat(s)`}
            </div>
          </div>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          {!loading && profiles.length === 0 && !error && (
            <div className="admin-empty">
              Aucun{" "}
              {tab === "pending"
                ? "demande"
                : tab === "active"
                  ? "personnel actif"
                  : "compte suspendu"}
              .
            </div>
          )}

          <ul className="admin-list">
            {profiles.map((p) => (
              <li
                key={p.id}
                className={`admin-row ${selected?.id === p.id ? "admin-row-selected" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(p);
                  }
                }}
              >
                <div className="admin-row-person">
                  <div className="admin-row-avatar">
                    {p.prenom[0]}
                    {p.nom[0]}
                  </div>
                  <div>
                    <div className="admin-row-name">
                      {p.prenom} {p.nom}
                    </div>
                    <div className="admin-row-email">{p.email}</div>
                  </div>
                </div>
                <div className="admin-row-matricule mono">{p.matricule}</div>
                <div className="admin-row-fonction">{p.fonction}</div>
                <div className="admin-row-service">
                  <span className="admin-pill">{p.service}</span>
                </div>
                <div className="admin-row-meta">
                  {tab === "pending" && new Date(p.created_at).toLocaleDateString("fr-FR")}
                  {tab === "active" &&
                    p.approved_at &&
                    `Approuvé le ${new Date(p.approved_at).toLocaleDateString("fr-FR")}`}
                  {tab === "banned" && p.ban_reason}
                </div>
                <div className="admin-row-actions">
                  {tab === "pending" && (
                    <>
                      <button
                        type="button"
                        className="admin-btn-ghost"
                        disabled={busyId === p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReject(p);
                        }}
                      >
                        Refuser
                      </button>
                      <button
                        type="button"
                        className="admin-btn-primary"
                        disabled={busyId === p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onApprove(p);
                        }}
                      >
                        Approuver
                      </button>
                    </>
                  )}
                  {tab === "active" && (
                    <button
                      type="button"
                      className="admin-btn-danger-soft"
                      disabled={busyId === p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(p);
                      }}
                    >
                      Suspendre…
                    </button>
                  )}
                  {tab === "banned" && (
                    <button
                      type="button"
                      className="admin-btn-soft"
                      disabled={busyId === p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnban(p);
                      }}
                    >
                      Rétablir
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </main>

        {/* Drawer suspension */}
        {selected && tab === "active" && (
          <aside
            ref={drawerRef}
            className="admin-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`Suspendre ${selected.prenom} ${selected.nom}`}
            tabIndex={-1}
          >
            <div className="admin-drawer-head">
              <h3>
                Suspendre {selected.prenom} {selected.nom}
              </h3>
              <button
                type="button"
                className="admin-drawer-close"
                onClick={() => setSelected(null)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <label className="auth-field">
              <span className="auth-field-label">Motif de suspension</span>
              <select
                className="auth-input"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              >
                {BAN_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="auth-btn-primary auth-btn-danger"
              onClick={() => onBan(selected)}
              disabled={busyId === selected.id}
            >
              Confirmer la suspension
            </button>
          </aside>
        )}
      </div>

      {toast && (
        <div className="admin-toast" role="status">
          {toast.kind === "ok" ? "✓" : "⚠"} {toast.msg}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
