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
} from "../../../lib/auth";
import MobileLogo from "./MobileLogo";
import {
  BanIcon,
  Check,
  Close,
  Dots,
  ExitIcon,
  InboxIcon,
  SearchIcon,
  UsersIcon,
  Warn,
} from "./icons";

// Console d'administration — design mobile dédié : tab bar flottante en
// bas (Demandes / Personnels / Suspendus) + bottom sheet de détail/action.
// Recréation fidèle de MAdmin/MSheet (design_handoff mobile.jsx), branchée
// sur les actions Supabase de auth.ts (mêmes fonctions que le desktop).

type Tab = "pending" | "active" | "banned";

const BAN_REASONS = [
  "Partage d'identifiants",
  "Départ du service",
  "Comportement inapproprié",
  "Demande RH",
  "Autre",
];

const TAB_TITLE: Record<Tab, string> = {
  pending: "Demandes",
  active: "Personnels",
  banned: "Suspendus",
};

const initials = (p: Profile) => `${p.prenom[0] ?? ""}${p.nom[0] ?? ""}`.toUpperCase();
const frDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "—");

type Props = {
  currentUserName: string;
  onLogout: () => void;
  onExitAdmin: () => void;
};

const MobileAdminDashboard = ({ currentUserName, onLogout, onExitAdmin }: Props) => {
  const [tab, setTab] = useState<Tab>("pending");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "warn"; msg: string } | null>(null);

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
    if (forStatus === "pending") setPendingCount(result.data.length);
  };

  const refreshPendingCount = async () => {
    const result = await fetchProfilesByStatus("pending");
    if (result.ok) setPendingCount(result.data.length);
  };

  useEffect(() => {
    reload(tab);
  }, [tab]);

  useEffect(() => {
    refreshPendingCount();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const runAction = async (
    p: Profile,
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    msg: { kind: "ok" | "warn"; text: string }
  ) => {
    setBusyId(p.id);
    const result = await action();
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setProfiles((list) => list.filter((x) => x.id !== p.id));
    setSelected(null);
    setToast({ kind: msg.kind, msg: msg.text });
    refreshPendingCount();
  };

  const onApprove = (p: Profile) =>
    runAction(p, () => approveProfile(p.id), {
      kind: "ok",
      text: `${p.prenom} ${p.nom} approuvé(e)`,
    });
  const onReject = (p: Profile) =>
    runAction(p, () => rejectProfile(p.id), {
      kind: "warn",
      text: `Demande de ${p.prenom} ${p.nom} refusée`,
    });
  const onBan = (p: Profile, reason: string) =>
    runAction(p, () => banProfile(p.id, reason), {
      kind: "warn",
      text: `${p.prenom} ${p.nom} suspendu(e)`,
    });
  const onUnban = (p: Profile) =>
    runAction(p, () => unbanProfile(p.id), {
      kind: "ok",
      text: `${p.prenom} ${p.nom} rétabli(e)`,
    });

  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? profiles.filter((p) =>
        `${p.prenom} ${p.nom} ${p.matricule} ${p.fonction} ${p.email}`.toLowerCase().includes(q)
      )
    : profiles;

  const subtitle = loading
    ? "Chargement…"
    : tab === "pending"
      ? `${profiles.length} à valider`
      : tab === "active"
        ? `${profiles.length} actifs`
        : `${profiles.length} comptes`;

  return (
    <div className="m-app">
      <div className="m-stage m-admin">
        <div className="m-bg-glow" aria-hidden="true" />

        <header className="m-admin-head">
          <div className="m-admin-head-row">
            <MobileLogo size={40} />
            <div className="m-admin-head-actions">
              <button
                type="button"
                className="m-icn-btn"
                onClick={onExitAdmin}
                title="Vue utilisateur"
                aria-label="Retour à l'application"
              >
                <ExitIcon />
              </button>
              <button
                type="button"
                className="m-icn-btn"
                onClick={handleLogout}
                title="Se déconnecter"
                aria-label="Se déconnecter"
              >
                <Close />
              </button>
            </div>
          </div>
          <h1 className="m-admin-title">{TAB_TITLE[tab]}</h1>
          <p className="m-admin-sub">
            {currentUserName} · {subtitle}
          </p>
          <div className="m-search-wrap">
            <SearchIcon />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un nom, matricule…"
              aria-label="Rechercher"
            />
          </div>
        </header>

        <main className="m-admin-list">
          {error && (
            <div className="m-err" role="alert">
              <Warn />
              <span>{error}</span>
            </div>
          )}
          {!loading && filtered.length === 0 && !error && (
            <div className="m-empty">Aucun résultat.</div>
          )}
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`m-card ${tab === "banned" ? "m-card-banned" : ""}`}
              onClick={() => setSelected(p)}
            >
              <span className={`m-av ${tab === "banned" ? "m-av-muted" : ""}`}>{initials(p)}</span>
              <span className="m-card-body">
                <span className="m-card-line1">
                  <span className="m-card-name">
                    {p.prenom} {p.nom}
                  </span>
                  <span className="m-card-mat m-mono">{p.matricule}</span>
                </span>
                <span className="m-card-line2">
                  <span>{p.fonction}</span>
                  <span className="m-card-dot">·</span>
                  <span>{p.service}</span>
                </span>
                <span className="m-card-line3">
                  {tab === "pending" && (
                    <>
                      <span className="m-card-time">{frDate(p.created_at)}</span>
                      <span className="m-card-email m-mono">{p.email}</span>
                    </>
                  )}
                  {tab === "active" && (
                    <>
                      <span className="m-card-time">
                        <span className="m-dot m-dot-ok" /> {frDate(p.approved_at)}
                      </span>
                      <span className="m-card-email m-mono">{p.email}</span>
                    </>
                  )}
                  {tab === "banned" && (
                    <span className="m-card-time">{p.ban_reason ?? "Motif non précisé"}</span>
                  )}
                </span>
              </span>
              {tab === "pending" && <span className="m-card-cta">À valider</span>}
              <Dots />
            </button>
          ))}
        </main>

        <nav className="m-tabbar">
          <button
            type="button"
            className={`m-tab ${tab === "pending" ? "on" : ""}`}
            onClick={() => setTab("pending")}
          >
            <span className="m-tab-icn">
              <InboxIcon />
            </span>
            <span className="m-tab-lbl">Demandes</span>
            {pendingCount > 0 && <span className="m-tab-badge">{pendingCount}</span>}
          </button>
          <button
            type="button"
            className={`m-tab ${tab === "active" ? "on" : ""}`}
            onClick={() => setTab("active")}
          >
            <span className="m-tab-icn">
              <UsersIcon />
            </span>
            <span className="m-tab-lbl">Personnels</span>
          </button>
          <button
            type="button"
            className={`m-tab ${tab === "banned" ? "on" : ""}`}
            onClick={() => setTab("banned")}
          >
            <span className="m-tab-icn">
              <BanIcon />
            </span>
            <span className="m-tab-lbl">Suspendus</span>
          </button>
        </nav>

        {selected && (
          <MobileSheet
            user={selected}
            tab={tab}
            busy={busyId === selected.id}
            onClose={() => setSelected(null)}
            onApprove={() => onApprove(selected)}
            onReject={() => onReject(selected)}
            onBan={(reason) => onBan(selected, reason)}
            onUnban={() => onUnban(selected)}
          />
        )}

        {toast && (
          <div className={`m-toast m-toast-${toast.kind}`} role="status">
            {toast.kind === "ok" ? <Check /> : <Warn />}
            <span>{toast.msg}</span>
          </div>
        )}
      </div>
    </div>
  );
};

type SheetProps = {
  user: Profile;
  tab: Tab;
  busy: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onBan: (reason: string) => void;
  onUnban: () => void;
};

const MobileSheet = ({
  user,
  tab,
  busy,
  onClose,
  onApprove,
  onReject,
  onBan,
  onUnban,
}: SheetProps) => {
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState("");

  const eyebrow =
    tab === "pending"
      ? "Demande d'accès"
      : tab === "active"
        ? "Personnel actif"
        : "Compte suspendu";

  return (
    <>
      <button type="button" className="m-scrim" onClick={onClose} aria-label="Fermer le panneau" />
      <div className="m-sheet" role="dialog" aria-modal="true" aria-label={eyebrow}>
        <div className="m-sheet-grip" aria-hidden="true" />
        <header>
          <div className="m-sheet-eyebrow">{eyebrow}</div>
          <div className="m-sheet-id">
            <span className={`m-av ${tab === "banned" ? "m-av-muted" : ""}`}>{initials(user)}</span>
            <div>
              <div className="m-sheet-name">
                {user.prenom} {user.nom}
              </div>
              <div className="m-sheet-meta">
                <span className="m-mono">{user.matricule}</span> · {user.fonction}
              </div>
            </div>
          </div>
        </header>

        <dl className="m-sheet-table">
          <div>
            <dt>Email</dt>
            <dd className="m-mono">{user.email}</dd>
          </div>
          <div>
            <dt>Service</dt>
            <dd>{user.service}</dd>
          </div>
          {tab === "pending" && (
            <div>
              <dt>Soumise</dt>
              <dd>{frDate(user.created_at)}</dd>
            </div>
          )}
          {tab === "active" && (
            <div>
              <dt>Approuvé</dt>
              <dd>{frDate(user.approved_at)}</dd>
            </div>
          )}
          {tab === "banned" && (
            <div>
              <dt>Motif</dt>
              <dd>{user.ban_reason ?? "Non précisé"}</dd>
            </div>
          )}
        </dl>

        {tab === "pending" && (
          <div className="m-sheet-actions">
            <button type="button" className="m-btn m-btn-ghost" onClick={onReject} disabled={busy}>
              Refuser
            </button>
            <button
              type="button"
              className="m-btn m-btn-primary"
              onClick={onApprove}
              disabled={busy}
            >
              Approuver
            </button>
          </div>
        )}

        {tab === "active" && !confirm && (
          <div className="m-sheet-actions">
            <button
              type="button"
              className="m-btn m-btn-danger"
              onClick={() => setConfirm(true)}
              disabled={busy}
            >
              Suspendre ce compte
            </button>
          </div>
        )}
        {tab === "active" && confirm && (
          <div className="m-confirm">
            <h4>Motif de suspension</h4>
            <select
              className="m-input m-select"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="">Sélectionner…</option>
              {BAN_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <div className="m-sheet-actions">
              <button
                type="button"
                className="m-btn m-btn-ghost"
                onClick={() => setConfirm(false)}
                disabled={busy}
              >
                Annuler
              </button>
              <button
                type="button"
                className="m-btn m-btn-danger"
                disabled={!reason || busy}
                onClick={() => onBan(reason)}
              >
                Confirmer
              </button>
            </div>
          </div>
        )}

        {tab === "banned" && (
          <div className="m-sheet-actions">
            <button type="button" className="m-btn m-btn-primary" onClick={onUnban} disabled={busy}>
              Rétablir l'accès
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default MobileAdminDashboard;
