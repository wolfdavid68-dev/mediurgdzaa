import { useEffect, useState } from "react";
import {
  fetchProfilesByStatus,
  approveProfile,
  rejectProfile,
  banProfile,
  unbanProfile,
  logout,
  type Profile,
  type ProfileStatus,
} from "../../lib/auth";

// Console d'administration. Affichée uniquement quand profile.role === 'admin'.
// 3 onglets : Demandes (status=pending), Personnels (status=active),
// Suspendus (status=banned). Chaque ligne a des actions contextuelles.

type Tab = "pending" | "active" | "banned";

const BAN_REASONS = [
  "Partage d'identifiants",
  "Départ du service",
  "Comportement inapproprié",
  "Demande RH",
  "Autre",
];

type Props = {
  currentUserName: string;
  onLogout: () => void;
  onExitAdmin: () => void; // retour à la vue user normale
};

const AdminDashboard = ({ currentUserName, onLogout, onExitAdmin }: Props) => {
  const [tab, setTab] = useState<Tab>("pending");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [banReason, setBanReason] = useState(BAN_REASONS[0]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const counts = {
    pending: profiles.filter((p) => p.status === "pending").length,
    active: profiles.filter((p) => p.status === "active").length,
    banned: profiles.filter((p) => p.status === "banned").length,
  };

  const reload = async (forStatus: ProfileStatus) => {
    setLoading(true);
    setError(null);
    const result = await fetchProfilesByStatus(forStatus);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setProfiles(result.data);
  };

  useEffect(() => {
    reload(tab);
  }, [tab]);

  const flashToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };

  const onApprove = async (p: Profile) => {
    setBusyId(p.id);
    const result = await approveProfile(p.id);
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setProfiles((list) => list.filter((x) => x.id !== p.id));
    setSelected(null);
    flashToast(`✓ ${p.prenom} ${p.nom} approuvé(e)`);
  };

  const onReject = async (p: Profile) => {
    setBusyId(p.id);
    const result = await rejectProfile(p.id);
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setProfiles((list) => list.filter((x) => x.id !== p.id));
    setSelected(null);
    flashToast(`✕ Demande de ${p.prenom} ${p.nom} refusée`);
  };

  const onBan = async (p: Profile) => {
    setBusyId(p.id);
    const result = await banProfile(p.id, banReason);
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setProfiles((list) => list.filter((x) => x.id !== p.id));
    setSelected(null);
    flashToast(`⚠ ${p.prenom} ${p.nom} suspendu(e)`);
  };

  const onUnban = async (p: Profile) => {
    setBusyId(p.id);
    const result = await unbanProfile(p.id);
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setProfiles((list) => list.filter((x) => x.id !== p.id));
    setSelected(null);
    flashToast(`✓ ${p.prenom} ${p.nom} rétabli(e)`);
  };

  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  const tabLabel: Record<Tab, string> = {
    pending: "Demandes",
    active: "Personnels actifs",
    banned: "Comptes suspendus",
  };

  return (
    <div className="admin-stage">
      <header className="admin-topbar">
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
        <aside className="admin-sidebar">
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

        <main className="admin-main">
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
                onClick={() => setSelected(p)}
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
                <div className="admin-row-actions" onClick={(e) => e.stopPropagation()}>
                  {tab === "pending" && (
                    <>
                      <button
                        type="button"
                        className="admin-btn-ghost"
                        disabled={busyId === p.id}
                        onClick={() => onReject(p)}
                      >
                        Refuser
                      </button>
                      <button
                        type="button"
                        className="admin-btn-primary"
                        disabled={busyId === p.id}
                        onClick={() => onApprove(p)}
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
                      onClick={() => setSelected(p)}
                    >
                      Suspendre…
                    </button>
                  )}
                  {tab === "banned" && (
                    <button
                      type="button"
                      className="admin-btn-soft"
                      disabled={busyId === p.id}
                      onClick={() => onUnban(p)}
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
          <aside className="admin-drawer">
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
          {toast}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
