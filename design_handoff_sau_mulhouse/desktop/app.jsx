const { useState, useEffect, useRef, useMemo, createContext, useContext } = React;

// ---------- Tweaks ----------
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/ {
  logoScale: 1.25,
  accent: "#E11D2A",
  background: "warm",
  showLogoSeparator: true,
  panelGlass: true,
}; /*EDITMODE-END*/

const TweakCtx = createContext(TWEAK_DEFAULTS);
const useT = () => useContext(TweakCtx);

// ---------- Mock data ----------
const seedMembers = [
  {
    id: 1,
    matricule: "M402100",
    nom: "Bernard",
    prenom: "Camille",
    role: "Médecin urgentiste",
    service: "SAU",
    email: "c.bernard@ghrmsa.fr",
    status: "active",
    since: "2023-04-12",
    lastSeen: "il y a 4 min",
  },
  {
    id: 2,
    matricule: "M408821",
    nom: "Klein",
    prenom: "Antoine",
    role: "Infirmier",
    service: "SAU",
    email: "a.klein@ghrmsa.fr",
    status: "active",
    since: "2024-01-08",
    lastSeen: "il y a 22 min",
  },
  {
    id: 3,
    matricule: "M411034",
    nom: "Schmitt",
    prenom: "Léa",
    role: "Aide-soignant",
    service: "SAU",
    email: "l.schmitt@ghrmsa.fr",
    status: "active",
    since: "2024-09-30",
    lastSeen: "il y a 2 h",
  },
  {
    id: 4,
    matricule: "M399210",
    nom: "Weber",
    prenom: "Julien",
    role: "Médecin urgentiste",
    service: "SMUR",
    email: "j.weber@ghrmsa.fr",
    status: "banned",
    since: "2022-11-02",
    lastSeen: "il y a 14 j",
    banReason: "Partage d'identifiants",
  },
];

const seedRequests = [
  {
    id: 101,
    matricule: "M421987",
    nom: "Muller",
    prenom: "Sophie",
    role: "Infirmière",
    service: "SAU",
    email: "s.muller@ghrmsa.fr",
    submitted: "il y a 6 min",
  },
  {
    id: 102,
    matricule: "M422154",
    nom: "Hartmann",
    prenom: "Théo",
    role: "Interne",
    service: "SAU",
    email: "t.hartmann@ghrmsa.fr",
    submitted: "il y a 1 h",
  },
  {
    id: 103,
    matricule: "M422161",
    nom: "Lefèvre",
    prenom: "Inès",
    role: "Aide-soignante",
    service: "UHCD",
    email: "i.lefevre@ghrmsa.fr",
    submitted: "il y a 3 h",
  },
];

// ---------- Atoms ----------
function Logo({ size = 36 }) {
  const t = useT();
  const s = size * (t.logoScale ?? 1);
  const ghr =
    (typeof window !== "undefined" && window.__resources && window.__resources.logoGhr) ||
    "assets/logo-ghr.png";
  const sau =
    (typeof window !== "undefined" && window.__resources && window.__resources.logoSau) ||
    "assets/logo-sau.png";
  return (
    <div className="logo-row" style={{ height: s }}>
      <img src={ghr} alt="GHR Mulhouse Sud-Alsace" style={{ height: s }} />
      {t.showLogoSeparator && <span className="logo-sep" style={{ height: s * 0.66 }} />}
      <img src={sau} alt="Urgences Mulhouse" style={{ height: s * 1.05 }} />
    </div>
  );
}

function Field({ label, hint, children, error }) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint && <em>{hint}</em>}
      </span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

function Pill({ tone = "neutral", children }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function Avatar({ name, tone = "default" }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return <div className={`avatar avatar-${tone}`}>{initials}</div>;
}

// ---------- Login ----------
function LoginScreen({
  onSubmit,
  onGoRegister,
  onGoAdmin,
  knownMembers,
  knownRequests,
  knownBanned,
}) {
  const [matricule, setMatricule] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [shake, setShake] = useState(false);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!/^M\d{6}$/.test(matricule.trim())) {
      setErr("Format attendu : M suivi de 6 chiffres (ex. M402100).");
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    if (password.length < 4) {
      setErr("Mot de passe requis.");
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    setErr(null);
    setLoading(true);
    setTimeout(() => {
      const m = matricule.trim().toUpperCase();
      if (knownBanned.some((u) => u.matricule === m)) {
        setLoading(false);
        setErr("Compte suspendu. Contactez l'administrateur du service.");
        setShake(true);
        setTimeout(() => setShake(false), 400);
        return;
      }
      if (knownRequests.some((u) => u.matricule === m)) {
        setLoading(false);
        setErr("Demande en attente de validation par l'administrateur.");
        return;
      }
      if (knownMembers.some((u) => u.matricule === m && u.status === "active")) {
        onSubmit({ matricule: m, role: "member" });
        return;
      }
      if (m === "ADMIN" || m === "M000001") {
        onSubmit({ matricule: m, role: "admin" });
        return;
      }
      setLoading(false);
      setErr("Matricule inconnu ou mot de passe incorrect.");
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }, 650);
  };

  return (
    <div className="auth-stage">
      <BackgroundDecor />
      <div className="auth-shell">
        <aside className="auth-side">
          <Logo size={64} />
          <div className="side-eyebrow">SAU · Émile-Muller</div>
          <h1 className="side-title">
            Votre espace
            <br />
            de travail, toujours
            <br />
            <span className="t-accent">à portée de main.</span>
          </h1>
          <p className="side-body">
            Plateforme de coordination réservée aux personnels habilités du Groupe Hospitalier de la
            Région Mulhouse Sud-Alsace.
          </p>
          <ul className="side-meta">
            <li>
              <span className="dot dot-ok" /> Système opérationnel
            </li>
            <li>
              <span className="dot dot-mute" /> 142 personnels actifs
            </li>
            <li>
              <span className="dot dot-mute" /> Chiffrement bout-en-bout
            </li>
          </ul>
          <footer className="side-foot">
            <span>v2.4.1 · Émile-Muller</span>
            <span>Support : poste 4118</span>
          </footer>
        </aside>

        <main className={`auth-card ${shake ? "shake" : ""}`}>
          <header className="auth-head">
            <div>
              <div className="auth-eyebrow">Connexion sécurisée</div>
              <h2 className="auth-title">Bienvenue.</h2>
              <p className="auth-sub">Identifiez-vous avec votre matricule professionnel.</p>
            </div>
            <span className="auth-status">
              <span className="dot dot-ok" /> Sécurisé
            </span>
          </header>

          <form onSubmit={submit} className="auth-form">
            <Field label="Matricule" hint="format M + 6 chiffres">
              <div className="input-wrap input-mono">
                <span className="input-prefix">M</span>
                <input
                  className="input"
                  value={matricule.startsWith("M") ? matricule.slice(1) : matricule}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                    setMatricule("M" + v);
                  }}
                  placeholder="402100"
                  inputMode="numeric"
                  autoComplete="username"
                />
              </div>
            </Field>

            <Field label="Mot de passe">
              <div className="input-wrap">
                <input
                  className="input"
                  type={reveal ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="input-affix"
                  onClick={() => setReveal((r) => !r)}
                  aria-label="Afficher"
                >
                  {reveal ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </Field>

            <div className="auth-row">
              <label className="check">
                <input type="checkbox" defaultChecked />{" "}
                <span>Maintenir la session sur ce poste</span>
              </label>
              <a className="link" onClick={(e) => e.preventDefault()} href="#">
                Mot de passe oublié
              </a>
            </div>

            {err && (
              <div className="error-banner">
                <Warn /> <span>{err}</span>
              </div>
            )}

            <button
              className={`btn btn-primary btn-lg ${loading ? "loading" : ""}`}
              disabled={loading}
              type="submit"
            >
              {loading ? (
                <>
                  <Spinner /> Vérification…
                </>
              ) : (
                <>
                  Se connecter <Arrow />
                </>
              )}
            </button>

            <div className="auth-split">
              <span>ou</span>
            </div>

            <button type="button" className="btn btn-ghost" onClick={onGoRegister}>
              Créer un compte personnel
            </button>
          </form>

          <footer className="auth-foot">
            <span>Vous êtes administrateur du service&nbsp;?</span>
            <a
              className="link"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onGoAdmin();
              }}
            >
              Accéder à la console →
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}

// ---------- Register ----------
function RegisterScreen({ onSubmit, onBack }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    matricule: "M",
    nom: "",
    prenom: "",
    email: "",
    role: "Infirmier",
    service: "SAU",
    password: "",
    confirm: "",
    consent: false,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const [err, setErr] = useState(null);

  const next = () => {
    setErr(null);
    if (step === 1) {
      if (!/^M\d{6}$/.test(form.matricule))
        return setErr("Matricule invalide. Format : M suivi de 6 chiffres.");
      if (!form.nom || !form.prenom) return setErr("Renseignez nom et prénom.");
      if (!/@ghrmsa\.fr$/.test(form.email)) return setErr("Email professionnel @ghrmsa.fr requis.");
      setStep(2);
    } else if (step === 2) {
      if (form.password.length < 8) return setErr("Mot de passe : 8 caractères minimum.");
      if (form.password !== form.confirm) return setErr("Les mots de passe ne correspondent pas.");
      if (!form.consent) return setErr("La charte doit être acceptée.");
      setStep(3);
    }
  };

  return (
    <div className="auth-stage">
      <BackgroundDecor />
      <div className="auth-shell">
        <aside className="auth-side">
          <Logo size={64} />
          <div className="side-eyebrow">Nouvelle demande d'accès</div>
          <h1 className="side-title">
            Rejoindre
            <br />
            les équipes
            <br />
            <span className="t-accent">du SAU.</span>
          </h1>
          <p className="side-body">
            Votre demande sera transmise à l'administrateur du service. Activation sous 24 h ouvrées
            après vérification de votre matricule.
          </p>
          <ol className="side-steps">
            <li className={step >= 1 ? "on" : ""}>
              <span>1</span> Identité professionnelle
            </li>
            <li className={step >= 2 ? "on" : ""}>
              <span>2</span> Sécurité du compte
            </li>
            <li className={step >= 3 ? "on" : ""}>
              <span>3</span> Demande transmise
            </li>
          </ol>
          <footer className="side-foot">
            <span>Aide : sau-admin@ghrmsa.fr</span>
          </footer>
        </aside>

        <main className="auth-card">
          {step < 3 && (
            <header className="auth-head">
              <div>
                <div className="auth-eyebrow">Création de compte · {step}/2</div>
                <h2 className="auth-title">
                  {step === 1 ? "Vos informations" : "Choisissez votre mot de passe"}
                </h2>
                <p className="auth-sub">
                  {step === 1
                    ? "Tels qu'inscrits sur votre badge professionnel."
                    : "Au moins 8 caractères. Évitez les mots de passe utilisés ailleurs."}
                </p>
              </div>
              <a
                className="link"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onBack();
                }}
              >
                ← Connexion
              </a>
            </header>
          )}

          {step === 1 && (
            <form
              className="auth-form"
              onSubmit={(e) => {
                e.preventDefault();
                next();
              }}
            >
              <Field label="Matricule" hint="ex. M402100">
                <div className="input-wrap input-mono">
                  <span className="input-prefix">M</span>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={
                      form.matricule.startsWith("M") ? form.matricule.slice(1) : form.matricule
                    }
                    onChange={(e) =>
                      set("matricule", "M" + e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
                    }
                    placeholder="402100"
                  />
                </div>
              </Field>
              <div className="grid-2">
                <Field label="Prénom">
                  <input
                    className="input"
                    value={form.prenom}
                    onChange={(e) => set("prenom", e.target.value)}
                    placeholder="Camille"
                  />
                </Field>
                <Field label="Nom">
                  <input
                    className="input"
                    value={form.nom}
                    onChange={(e) => set("nom", e.target.value)}
                    placeholder="Bernard"
                  />
                </Field>
              </div>
              <Field label="Email professionnel">
                <input
                  className="input"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="c.bernard@ghrmsa.fr"
                />
              </Field>
              <div className="grid-2">
                <Field label="Fonction">
                  <select
                    className="input"
                    value={form.role}
                    onChange={(e) => set("role", e.target.value)}
                  >
                    {[
                      "Médecin urgentiste",
                      "Interne",
                      "Infirmier",
                      "Aide-soignant",
                      "Ambulancier SMUR",
                      "Cadre",
                    ].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Service de rattachement">
                  <select
                    className="input"
                    value={form.service}
                    onChange={(e) => set("service", e.target.value)}
                  >
                    {["SAU", "SMUR", "UHCD", "Réanimation", "Régulation 15"].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </Field>
              </div>
              {err && (
                <div className="error-banner">
                  <Warn /> <span>{err}</span>
                </div>
              )}
              <button className="btn btn-primary btn-lg" type="submit">
                Continuer <Arrow />
              </button>
            </form>
          )}

          {step === 2 && (
            <form
              className="auth-form"
              onSubmit={(e) => {
                e.preventDefault();
                next();
              }}
            >
              <Field label="Mot de passe">
                <input
                  className="input"
                  type="password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
              <PasswordStrength value={form.password} />
              <Field label="Confirmer le mot de passe">
                <input
                  className="input"
                  type="password"
                  value={form.confirm}
                  onChange={(e) => set("confirm", e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
              <label className="check check-block">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => set("consent", e.target.checked)}
                />
                <span>
                  J'accepte la charte d'usage du SI hospitalier et la politique de confidentialité
                  du GHRMSA.
                </span>
              </label>
              {err && (
                <div className="error-banner">
                  <Warn /> <span>{err}</span>
                </div>
              )}
              <div className="row-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                  ← Retour
                </button>
                <button className="btn btn-primary btn-lg" type="submit">
                  Envoyer la demande <Arrow />
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="success-state">
              <div className="success-mark">
                <Check large />
              </div>
              <h2 className="auth-title">Demande transmise</h2>
              <p className="auth-sub">
                Votre demande pour{" "}
                <b>
                  {form.prenom} {form.nom}
                </b>{" "}
                (<span className="mono">{form.matricule}</span>) est en attente de validation par
                l'administrateur du SAU.
              </p>
              <div className="recap">
                <div>
                  <span>Matricule</span>
                  <b className="mono">{form.matricule}</b>
                </div>
                <div>
                  <span>Fonction</span>
                  <b>{form.role}</b>
                </div>
                <div>
                  <span>Service</span>
                  <b>{form.service}</b>
                </div>
                <div>
                  <span>Délai habituel</span>
                  <b>&lt; 24 h ouvrées</b>
                </div>
              </div>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => {
                  onSubmit(form);
                }}
              >
                Retour à la connexion
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function PasswordStrength({ value }) {
  const score = useMemo(() => {
    let s = 0;
    if (value.length >= 8) s++;
    if (/[A-Z]/.test(value)) s++;
    if (/[0-9]/.test(value)) s++;
    if (/[^A-Za-z0-9]/.test(value)) s++;
    if (value.length >= 12) s++;
    return s;
  }, [value]);
  const labels = ["Très faible", "Faible", "Moyen", "Bon", "Solide", "Excellent"];
  return (
    <div className="pw-strength">
      <div className="pw-bars">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={`pw-bar ${i < score ? `on s${score}` : ""}`} />
        ))}
      </div>
      <span className="pw-label">{value ? labels[score] : "Saisissez un mot de passe"}</span>
    </div>
  );
}

// ---------- Admin ----------
function AdminConsole({ onLogout, members, setMembers, requests, setRequests }) {
  const [tab, setTab] = useState("requests");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const approve = (r) => {
    setRequests((rs) => rs.filter((x) => x.id !== r.id));
    setMembers((ms) => [
      { ...r, id: Date.now(), status: "active", since: "à l'instant", lastSeen: "à l'instant" },
      ...ms,
    ]);
    setToast({ kind: "ok", msg: `${r.prenom} ${r.nom} a été ajouté(e) au service.` });
    setSelected(null);
  };
  const reject = (r) => {
    setRequests((rs) => rs.filter((x) => x.id !== r.id));
    setToast({ kind: "warn", msg: `Demande de ${r.prenom} ${r.nom} refusée.` });
    setSelected(null);
  };
  const ban = (m, reason) => {
    setMembers((ms) =>
      ms.map((x) =>
        x.id === m.id ? { ...x, status: "banned", banReason: reason || "Non précisé" } : x
      )
    );
    setToast({ kind: "warn", msg: `${m.prenom} ${m.nom} a été suspendu(e).` });
    setSelected(null);
  };
  const unban = (m) => {
    setMembers((ms) =>
      ms.map((x) => (x.id === m.id ? { ...x, status: "active", banReason: undefined } : x))
    );
    setToast({ kind: "ok", msg: `Accès rétabli pour ${m.prenom} ${m.nom}.` });
    setSelected(null);
  };

  const active = members.filter((m) => m.status === "active");
  const banned = members.filter((m) => m.status === "banned");

  const list = tab === "requests" ? requests : tab === "members" ? active : banned;

  const filtered = query
    ? list.filter((u) =>
        (
          u.nom +
          " " +
          u.prenom +
          " " +
          u.matricule +
          " " +
          (u.service || "") +
          " " +
          (u.role || "")
        )
          .toLowerCase()
          .includes(query.toLowerCase())
      )
    : list;

  return (
    <div className="admin-stage">
      <BackgroundDecor faint />
      <header className="admin-top">
        <div className="admin-top-left">
          <Logo size={36} />
          <div className="admin-crumbs">
            <span>Console d'administration</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-now">
              {tab === "requests" ? "Demandes" : tab === "members" ? "Personnels" : "Suspendus"}
            </span>
          </div>
        </div>
        <div className="admin-top-right">
          <div className="kbd-search">
            <SearchIcon />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un matricule, un nom…"
            />
            <span className="kbd">⌘K</span>
          </div>
          <div className="admin-me">
            <Avatar name="Dr A" tone="admin" />
            <div>
              <div className="me-name">Dr. Andrieu</div>
              <div className="me-role">Administrateur · SAU</div>
            </div>
            <button className="icon-btn" onClick={onLogout} title="Déconnexion">
              <Logout />
            </button>
          </div>
        </div>
      </header>

      <div className="admin-layout">
        <nav className="admin-nav">
          <div className="nav-section">
            <div className="nav-title">Gestion des accès</div>
            <NavItem
              icon={<Inbox />}
              label="Demandes"
              badge={requests.length}
              active={tab === "requests"}
              onClick={() => {
                setTab("requests");
                setSelected(null);
              }}
            />
            <NavItem
              icon={<Users />}
              label="Personnels actifs"
              badge={active.length}
              active={tab === "members"}
              onClick={() => {
                setTab("members");
                setSelected(null);
              }}
            />
            <NavItem
              icon={<Ban />}
              label="Comptes suspendus"
              badge={banned.length}
              active={tab === "banned"}
              onClick={() => {
                setTab("banned");
                setSelected(null);
              }}
            />
          </div>
          <div className="nav-section">
            <div className="nav-title">Journal</div>
            <NavItem icon={<Activity />} label="Activité du service" muted />
            <NavItem icon={<Shield />} label="Sécurité & sessions" muted />
          </div>
          <div className="nav-foot">
            <div className="kpi">
              <div>
                <b>{active.length}</b>
                <span>actifs</span>
              </div>
              <div>
                <b>{requests.length}</b>
                <span>en attente</span>
              </div>
              <div>
                <b>{banned.length}</b>
                <span>suspendus</span>
              </div>
            </div>
          </div>
        </nav>

        <main className="admin-main">
          <header className="panel-head">
            <div>
              <h1 className="panel-title">
                {tab === "requests" && "Demandes en attente"}
                {tab === "members" && "Personnels habilités"}
                {tab === "banned" && "Comptes suspendus"}
              </h1>
              <p className="panel-sub">
                {tab === "requests" &&
                  "Validez ou refusez les demandes d'inscription au service d'accueil des urgences."}
                {tab === "members" && "Personnels avec un accès actif à la plateforme."}
                {tab === "banned" &&
                  "Comptes dont l'accès a été révoqué. Le rétablissement est possible à tout moment."}
              </p>
            </div>
            <div className="panel-meta">
              <Pill tone={tab === "requests" ? "amber" : tab === "members" ? "green" : "red"}>
                {filtered.length} résultats
              </Pill>
            </div>
          </header>

          <section className="table-card">
            <div className="table-head">
              <div>Personne</div>
              <div>Matricule</div>
              <div>Fonction</div>
              <div>Service</div>
              <div>{tab === "requests" ? "Soumise" : tab === "banned" ? "Motif" : "Activité"}</div>
              <div className="ta-right">Action</div>
            </div>
            <ul className="table-body">
              {filtered.length === 0 && <li className="empty-row">Aucun résultat.</li>}
              {filtered.map((u) => (
                <li
                  key={u.id}
                  className={`row ${selected?.id === u.id ? "row-on" : ""}`}
                  onClick={() => setSelected(u)}
                >
                  <div className="cell-person">
                    <Avatar
                      name={`${u.prenom} ${u.nom}`}
                      tone={tab === "banned" ? "muted" : "default"}
                    />
                    <div className="p-stack">
                      <div className="p-name">
                        {u.prenom} {u.nom}
                      </div>
                      <a
                        className="p-email"
                        href={`mailto:${u.email}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {u.email}
                      </a>
                    </div>
                  </div>
                  <div className="cell-mat">
                    <span className="mono">{u.matricule}</span>
                  </div>
                  <div>{u.role}</div>
                  <div>
                    <Pill tone="muted">{u.service}</Pill>
                  </div>
                  <div className="cell-meta">
                    {tab === "requests" && <span className="meta-time">{u.submitted}</span>}
                    {tab === "members" && (
                      <span className="meta-time">
                        <span className="dot dot-ok" /> {u.lastSeen}
                      </span>
                    )}
                    {tab === "banned" && <span className="meta-time">{u.banReason}</span>}
                  </div>
                  <div className="cell-action ta-right">
                    {tab === "requests" && (
                      <>
                        <button
                          className="btn btn-soft"
                          onClick={(e) => {
                            e.stopPropagation();
                            reject(u);
                          }}
                        >
                          Refuser
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            approve(u);
                          }}
                        >
                          Approuver
                        </button>
                      </>
                    )}
                    {tab === "members" && (
                      <button
                        className="btn btn-soft btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected({ ...u, askBan: true });
                        }}
                      >
                        Suspendre
                      </button>
                    )}
                    {tab === "banned" && (
                      <button
                        className="btn btn-soft"
                        onClick={(e) => {
                          e.stopPropagation();
                          unban(u);
                        }}
                      >
                        Rétablir
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </main>

        {selected && (
          <DetailDrawer
            user={selected}
            tab={tab}
            onClose={() => setSelected(null)}
            onApprove={() => approve(selected)}
            onReject={() => reject(selected)}
            onBan={(reason) => ban(selected, reason)}
            onUnban={() => unban(selected)}
            askBan={selected.askBan}
          />
        )}
      </div>

      {toast && (
        <div className={`toast toast-${toast.kind}`}>
          {toast.kind === "ok" ? <Check /> : <Warn />}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, badge, active, muted, onClick }) {
  return (
    <button className={`nav-item ${active ? "on" : ""} ${muted ? "muted" : ""}`} onClick={onClick}>
      <span className="nav-icn">{icon}</span>
      <span className="nav-lbl">{label}</span>
      {badge != null && <span className="nav-badge">{badge}</span>}
    </button>
  );
}

function DetailDrawer({ user, tab, onClose, onApprove, onReject, onBan, onUnban, askBan }) {
  const [banReason, setBanReason] = useState("");
  const [confirming, setConfirming] = useState(!!askBan);

  return (
    <aside className="drawer">
      <header className="drawer-head">
        <button className="icon-btn" onClick={onClose}>
          <Close />
        </button>
        <span className="drawer-eyebrow">
          {tab === "requests"
            ? "Demande d'accès"
            : tab === "members"
              ? "Personnel actif"
              : "Compte suspendu"}
        </span>
      </header>
      <div className="drawer-id">
        <Avatar name={`${user.prenom} ${user.nom}`} tone={tab === "banned" ? "muted" : "default"} />
        <div>
          <h3 className="d-name">
            {user.prenom} {user.nom}
          </h3>
          <div className="d-meta">
            <span className="mono">{user.matricule}</span> · {user.role}
          </div>
        </div>
      </div>

      <dl className="d-table">
        <div>
          <dt>Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Service</dt>
          <dd>{user.service}</dd>
        </div>
        {tab === "requests" && (
          <div>
            <dt>Soumise</dt>
            <dd>{user.submitted}</dd>
          </div>
        )}
        {tab === "members" && (
          <div>
            <dt>Membre depuis</dt>
            <dd>{user.since}</dd>
          </div>
        )}
        {tab === "members" && (
          <div>
            <dt>Dernière activité</dt>
            <dd>{user.lastSeen}</dd>
          </div>
        )}
        {tab === "banned" && (
          <div>
            <dt>Motif</dt>
            <dd>{user.banReason}</dd>
          </div>
        )}
      </dl>

      {tab === "members" && (
        <div className="d-section">
          <h4 className="d-section-title">Activité récente</h4>
          <ul className="d-events">
            <li>
              <span className="dot dot-ok" /> Connexion · poste SAU-03 · il y a 4 min
            </li>
            <li>
              <span className="dot dot-mute" /> Consultation dossier #82310 · il y a 2 h
            </li>
            <li>
              <span className="dot dot-mute" /> Connexion · mobile · hier 22:14
            </li>
          </ul>
        </div>
      )}

      {tab === "requests" && (
        <div className="d-actions">
          <button className="btn btn-ghost" onClick={onReject}>
            Refuser la demande
          </button>
          <button className="btn btn-primary btn-lg" onClick={onApprove}>
            Approuver l'accès
          </button>
        </div>
      )}

      {tab === "members" && !confirming && (
        <div className="d-actions">
          <button className="btn btn-soft btn-danger" onClick={() => setConfirming(true)}>
            Suspendre ce compte
          </button>
        </div>
      )}

      {tab === "members" && confirming && (
        <div className="d-confirm">
          <h4 className="d-section-title">
            Suspendre {user.prenom} {user.nom}
          </h4>
          <p className="d-confirm-sub">
            L'accès à la plateforme sera révoqué immédiatement. Cette action est journalisée.
          </p>
          <Field label="Motif de suspension">
            <select
              className="input"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
            >
              <option value="">Sélectionner un motif…</option>
              <option>Partage d'identifiants</option>
              <option>Départ du service</option>
              <option>Comportement inapproprié</option>
              <option>Demande RH</option>
              <option>Autre</option>
            </select>
          </Field>
          <div className="d-actions">
            <button className="btn btn-ghost" onClick={() => setConfirming(false)}>
              Annuler
            </button>
            <button
              className="btn btn-danger btn-lg"
              disabled={!banReason}
              onClick={() => onBan(banReason)}
            >
              Confirmer la suspension
            </button>
          </div>
        </div>
      )}

      {tab === "banned" && (
        <div className="d-actions">
          <button className="btn btn-primary btn-lg" onClick={onUnban}>
            Rétablir l'accès
          </button>
        </div>
      )}
    </aside>
  );
}

// ---------- Member view (after login) ----------
function MemberShell({ matricule, onLogout }) {
  return (
    <div className="member-stage">
      <BackgroundDecor faint />
      <div className="welcome">
        <Logo size={68} />
        <div className="welcome-eyebrow">Authentification réussie</div>
        <h1 className="welcome-title">Bienvenue au SAU.</h1>
        <p className="welcome-body">
          Vous êtes connecté(e) en tant que <span className="mono">{matricule}</span>. La plateforme
          métier va se charger.
        </p>
        <div className="welcome-card">
          <div className="wc-row">
            <span>Service</span>
            <b>Accueil Urgences · Émile-Muller</b>
          </div>
          <div className="wc-row">
            <span>Garde en cours</span>
            <b>14:00 → 22:00</b>
          </div>
          <div className="wc-row">
            <span>Patients en attente</span>
            <b>23</b>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={onLogout}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

// ---------- Background ----------
function BackgroundDecor({ faint }) {
  return (
    <div className={`bg-decor ${faint ? "faint" : ""}`} aria-hidden>
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />
      <div className="bg-grid" />
    </div>
  );
}

// ---------- Icons ----------
const I = (p) => ({
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  ...p,
});
const Eye = () => (
  <svg {...I()}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOff = () => (
  <svg {...I()}>
    <path d="M3 3l18 18" />
    <path d="M10.6 6.2A10.9 10.9 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 4.1" />
    <path d="M6.5 6.5C3.6 8.4 2 12 2 12s3.5 7 10 7a10.9 10.9 0 0 0 5-1.2" />
    <path d="M9.9 9.9A3 3 0 0 0 14.1 14.1" />
  </svg>
);
const Arrow = () => (
  <svg {...I({ width: 16, height: 16 })}>
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);
const Warn = () => (
  <svg {...I()}>
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
    <path d="M10.3 3.5 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0Z" />
  </svg>
);
const Check = ({ large }) => (
  <svg {...I({ width: large ? 32 : 18, height: large ? 32 : 18 })}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const Spinner = () => (
  <svg {...I({ width: 16, height: 16 })} className="spin">
    <path d="M21 12a9 9 0 1 1-6.2-8.5" />
  </svg>
);
const SearchIcon = () => (
  <svg {...I()}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
const Inbox = () => (
  <svg {...I()}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.5 5h13l3.5 7v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7Z" />
  </svg>
);
const Users = () => (
  <svg {...I()}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
    <path d="M16 3.1a4 4 0 0 1 0 7.7" />
  </svg>
);
const Ban = () => (
  <svg {...I()}>
    <circle cx="12" cy="12" r="10" />
    <path d="m4.9 4.9 14.2 14.2" />
  </svg>
);
const Activity = () => (
  <svg {...I()}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);
const Shield = () => (
  <svg {...I()}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
  </svg>
);
const Logout = () => (
  <svg {...I()}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);
const Close = () => (
  <svg {...I()}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

// ---------- Root ----------
const HUE_PRESETS = {
  warm: { bg: 25, fg: 80 },
  cool: { bg: 250, fg: 250 },
  neutral: { bg: 0, fg: 0 },
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [view, setView] = useState("login");
  const [session, setSession] = useState(null);
  const [members, setMembers] = useState(seedMembers);
  const [requests, setRequests] = useState(seedRequests);

  // push tweaks into CSS vars
  useEffect(() => {
    const root = document.documentElement;
    const hue = HUE_PRESETS[t.background] || HUE_PRESETS.warm;
    root.style.setProperty("--bg-hue", hue.bg);
    root.style.setProperty("--bg", `oklch(0.16 0.008 ${hue.bg})`);
    root.style.setProperty("--bg-2", `oklch(0.19 0.008 ${hue.bg})`);
    root.style.setProperty("--surface", `oklch(0.22 0.008 ${hue.bg})`);
    root.style.setProperty("--surface-2", `oklch(0.25 0.008 ${hue.bg})`);
    root.style.setProperty("--surface-3", `oklch(0.29 0.008 ${hue.bg})`);
    root.style.setProperty("--accent", t.accent);
    root.style.setProperty("--accent-soft", t.accent + "26");
    root.style.setProperty("--accent-glow", t.accent + "73");
    root.classList.toggle("no-glass", !t.panelGlass);
  }, [t]);

  const banned = members.filter((m) => m.status === "banned");

  return (
    <TweakCtx.Provider value={t}>
      {view === "login" && (
        <LoginScreen
          knownMembers={members}
          knownRequests={requests}
          knownBanned={banned}
          onSubmit={(s) => {
            setSession(s);
            setView(s.role === "admin" ? "admin" : "member");
          }}
          onGoRegister={() => setView("register")}
          onGoAdmin={() => {
            setSession({ matricule: "ADMIN", role: "admin" });
            setView("admin");
          }}
        />
      )}
      {view === "register" && (
        <RegisterScreen
          onSubmit={(form) => {
            setRequests((rs) => [{ id: Date.now(), ...form, submitted: "à l'instant" }, ...rs]);
            setView("login");
          }}
          onBack={() => setView("login")}
        />
      )}
      {view === "admin" && (
        <AdminConsole
          members={members}
          setMembers={setMembers}
          requests={requests}
          setRequests={setRequests}
          onLogout={() => {
            setSession(null);
            setView("login");
          }}
        />
      )}
      {view === "member" && (
        <MemberShell
          matricule={session.matricule}
          onLogout={() => {
            setSession(null);
            setView("login");
          }}
        />
      )}

      <TweaksPanel>
        <TweakSection label="Identité visuelle" />
        <TweakSlider
          label="Taille des logos"
          value={t.logoScale}
          min={0.6}
          max={2.2}
          step={0.05}
          onChange={(v) => setTweak("logoScale", v)}
        />
        <TweakToggle
          label="Séparateur entre logos"
          value={t.showLogoSeparator}
          onChange={(v) => setTweak("showLogoSeparator", v)}
        />

        <TweakSection label="Couleur d'accent" />
        <TweakColor
          label="Accent"
          value={t.accent}
          options={["#E11D2A", "#D71920", "#B91C1C", "#DC2626", "#F43F5E"]}
          onChange={(v) => setTweak("accent", v)}
        />

        <TweakSection label="Ambiance" />
        <TweakRadio
          label="Fond"
          value={t.background}
          options={["warm", "cool", "neutral"]}
          onChange={(v) => setTweak("background", v)}
        />
        <TweakToggle
          label="Effet verre"
          value={t.panelGlass}
          onChange={(v) => setTweak("panelGlass", v)}
        />

        <TweakSection label="Navigation rapide" />
        <TweakButton label="Aller à la connexion" onClick={() => setView("login")} />
        <TweakButton label="Aller à l'inscription" onClick={() => setView("register")} />
        <TweakButton
          label="Console admin"
          onClick={() => {
            setSession({ matricule: "ADMIN", role: "admin" });
            setView("admin");
          }}
        />
      </TweaksPanel>
    </TweakCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
