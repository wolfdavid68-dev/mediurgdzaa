import { useEffect, useRef, useState } from "react";
import { type Profile } from "../../../lib/auth";
import { useAdminProfiles, type AdminTab } from "../hooks/useAdminProfiles";
import { BAN_REASONS } from "../authConstants";
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
// Recréation fidèle de MAdmin/MSheet (design_handoff mobile.jsx). Logique
// partagée avec le desktop via useAdminProfiles.

const TAB_TITLE: Record<AdminTab, string> = {
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
  const {
    tab,
    setTab,
    profiles,
    pendingCount,
    loading,
    error,
    selected,
    setSelected,
    busyId,
    toast,
    approve: onApprove,
    reject: onReject,
    ban: onBan,
    unban: onUnban,
    handleLogout,
  } = useAdminProfiles(onLogout);
  const [query, setQuery] = useState("");

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

        <header className="m-admin-head" inert={selected ? true : undefined}>
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

        <main className="m-admin-list" inert={selected ? true : undefined}>
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

        <nav className="m-tabbar" inert={selected ? true : undefined}>
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
  tab: AdminTab;
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
  const sheetRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // A11y bottom sheet : focus déplacé dans la feuille à l'ouverture, piégé
  // dedans (Tab cyclique), Échap ferme, focus restauré sur l'élément
  // déclencheur à la fermeture. L'arrière-plan (header/liste/tab bar) est
  // `inert` côté parent → invisible pour le clavier et les lecteurs d'écran.
  useEffect(() => {
    const sheet = sheetRef.current;
    const prevFocused = document.activeElement as HTMLElement | null;
    sheet?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !sheet) return;
      const f = sheet.querySelectorAll<HTMLElement>(
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
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      prevFocused?.focus?.();
    };
  }, []);

  const eyebrow =
    tab === "pending"
      ? "Demande d'accès"
      : tab === "active"
        ? "Personnel actif"
        : "Compte suspendu";

  return (
    <>
      <button type="button" className="m-scrim" onClick={onClose} aria-label="Fermer le panneau" />
      <div
        ref={sheetRef}
        className="m-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={eyebrow}
        tabIndex={-1}
      >
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
