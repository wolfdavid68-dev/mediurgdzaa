const { useState, useEffect, useMemo, createContext, useContext } = React;

// ----- seed data
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

const RES = (k, fallback) =>
  (typeof window !== "undefined" && window.__resources && window.__resources[k]) || fallback;

// ----- atoms
function MLogo({ size = 28 }) {
  return (
    <div className="m-logo" style={{ height: size }}>
      <img src={RES("logoGhr", "assets/logo-ghr.png")} alt="GHR" style={{ height: size }} />
      <span className="m-logo-sep" style={{ height: size * 0.66 }} />
      <img
        src={RES("logoSau", "assets/logo-sau.png")}
        alt="Urgences"
        style={{ height: size * 1.05 }}
      />
    </div>
  );
}
function MAvatar({ name, tone = "default" }) {
  const i = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return <div className={`m-av m-av-${tone}`}>{i}</div>;
}
function MPill({ tone = "muted", children }) {
  return <span className={`m-pill m-pill-${tone}`}>{children}</span>;
}

// ----- icons
const I = (p) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  ...p,
});
const Eye = () => (
  <svg {...I({ width: 18, height: 18 })}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOff = () => (
  <svg {...I({ width: 18, height: 18 })}>
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
const ArrowL = () => (
  <svg {...I({ width: 18, height: 18 })}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);
const Warn = () => (
  <svg {...I({ width: 16, height: 16 })}>
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
    <path d="M10.3 3.5 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0Z" />
  </svg>
);
const Check = ({ big }) => (
  <svg {...I({ width: big ? 28 : 16, height: big ? 28 : 16 })}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const Spinner = () => (
  <svg {...I({ width: 16, height: 16 })} className="m-spin">
    <path d="M21 12a9 9 0 1 1-6.2-8.5" />
  </svg>
);
const Search = () => (
  <svg {...I({ width: 16, height: 16 })}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
const Close = () => (
  <svg {...I({ width: 20, height: 20 })}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const InboxI = () => (
  <svg {...I()}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.5 5h13l3.5 7v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7Z" />
  </svg>
);
const UsersI = () => (
  <svg {...I()}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
    <path d="M16 3.1a4 4 0 0 1 0 7.7" />
  </svg>
);
const BanI = () => (
  <svg {...I()}>
    <circle cx="12" cy="12" r="10" />
    <path d="m4.9 4.9 14.2 14.2" />
  </svg>
);
const Dots = () => (
  <svg {...I({ width: 18, height: 18 })}>
    <circle cx="5" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="19" cy="12" r="1.5" />
  </svg>
);

// ----- LOGIN
function MLogin({ onLogin, onRegister, onAdmin, knownMembers, knownRequests, knownBanned }) {
  const [m, setM] = useState(""),
    [pw, setPw] = useState(""),
    [rev, setRev] = useState(false);
  const [err, setErr] = useState(null),
    [load, setLoad] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setErr(null);
    if (!/^M\d{6}$/.test(m.trim())) return setErr("Format : M + 6 chiffres.");
    if (pw.length < 4) return setErr("Mot de passe requis.");
    setLoad(true);
    setTimeout(() => {
      const M = m.trim().toUpperCase();
      if (knownBanned.some((u) => u.matricule === M)) {
        setLoad(false);
        return setErr("Compte suspendu.");
      }
      if (knownRequests.some((u) => u.matricule === M)) {
        setLoad(false);
        return setErr("Demande en attente.");
      }
      if (knownMembers.some((u) => u.matricule === M && u.status === "active"))
        return onLogin({ matricule: M });
      if (M === "ADMIN" || M === "M000001") return onAdmin();
      setLoad(false);
      setErr("Identifiants invalides.");
    }, 600);
  };

  return (
    <div className="m-stage m-login">
      <div className="m-bg-glow" />
      <header className="m-auth-head">
        <MLogo size={42} />
      </header>

      <div className="m-hero">
        <div className="m-eyebrow">SAU · Émile-Muller</div>
        <h1 className="m-h1">
          Votre espace
          <br />
          de travail, toujours
          <br />
          <span className="m-h1-accent">à portée de main.</span>
        </h1>
      </div>

      <form className="m-form" onSubmit={submit}>
        <label className="m-field">
          <span className="m-field-lbl">Matricule</span>
          <div className="m-input-wrap m-mono">
            <span className="m-prefix">M</span>
            <input
              className="m-input"
              inputMode="numeric"
              value={m.startsWith("M") ? m.slice(1) : m}
              onChange={(e) => setM("M" + e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="402100"
            />
          </div>
        </label>
        <label className="m-field">
          <span className="m-field-lbl">Mot de passe</span>
          <div className="m-input-wrap">
            <input
              className="m-input"
              type={rev ? "text" : "password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••••••"
            />
            <button type="button" className="m-affix" onClick={() => setRev((r) => !r)}>
              {rev ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </label>

        {err && (
          <div className="m-err">
            <Warn /> <span>{err}</span>
          </div>
        )}

        <button className={`m-btn m-btn-primary ${load ? "is-load" : ""}`} disabled={load}>
          {load ? (
            <>
              <Spinner /> Vérification…
            </>
          ) : (
            <>
              Se connecter <Arrow />
            </>
          )}
        </button>

        <button type="button" className="m-btn m-btn-ghost" onClick={onRegister}>
          Créer un compte
        </button>
      </form>

      <footer className="m-foot">
        <a
          className="m-link"
          onClick={(e) => {
            e.preventDefault();
            onAdmin();
          }}
          href="#"
        >
          Accès administrateur →
        </a>
        <span className="m-foot-meta">v2.4.1 · poste 4118</span>
      </footer>
    </div>
  );
}

// ----- REGISTER
function MRegister({ onSubmit, onBack }) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState({
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
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const [err, setErr] = useState(null);

  const next = () => {
    setErr(null);
    if (step === 1) {
      if (!/^M\d{6}$/.test(f.matricule)) return setErr("Matricule invalide.");
      if (!f.nom || !f.prenom) return setErr("Nom et prénom requis.");
      if (!/@ghrmsa\.fr$/.test(f.email)) return setErr("Email @ghrmsa.fr requis.");
      setStep(2);
    } else if (step === 2) {
      if (f.password.length < 8) return setErr("8 caractères minimum.");
      if (f.password !== f.confirm) return setErr("Les mots de passe ne correspondent pas.");
      if (!f.consent) return setErr("Charte à accepter.");
      setStep(3);
    }
  };

  return (
    <div className="m-stage m-reg">
      <div className="m-bg-glow" />
      <header className="m-top-nav">
        <button
          className="m-back"
          onClick={step > 1 && step < 3 ? () => setStep(step - 1) : onBack}
        >
          <ArrowL />
        </button>
        <div className="m-top-title">{step < 3 ? `Inscription · ${step}/2` : "Confirmation"}</div>
        <div style={{ width: 32 }} />
      </header>

      {step < 3 && (
        <div className="m-progress">
          <div className="m-progress-bar" style={{ width: `${(step / 2) * 100}%` }} />
        </div>
      )}

      {step === 1 && (
        <>
          <div className="m-hero m-hero-sm">
            <h2 className="m-h2">Vos informations</h2>
            <p className="m-sub">Tels qu'inscrits sur votre badge professionnel.</p>
          </div>
          <form
            className="m-form"
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
          >
            <label className="m-field">
              <span className="m-field-lbl">Matricule</span>
              <div className="m-input-wrap m-mono">
                <span className="m-prefix">M</span>
                <input
                  className="m-input"
                  inputMode="numeric"
                  value={f.matricule.startsWith("M") ? f.matricule.slice(1) : f.matricule}
                  onChange={(e) =>
                    set("matricule", "M" + e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
                  }
                  placeholder="402100"
                />
              </div>
            </label>
            <div className="m-row-2">
              <label className="m-field">
                <span className="m-field-lbl">Prénom</span>
                <div className="m-input-wrap">
                  <input
                    className="m-input"
                    value={f.prenom}
                    onChange={(e) => set("prenom", e.target.value)}
                    placeholder="Camille"
                  />
                </div>
              </label>
              <label className="m-field">
                <span className="m-field-lbl">Nom</span>
                <div className="m-input-wrap">
                  <input
                    className="m-input"
                    value={f.nom}
                    onChange={(e) => set("nom", e.target.value)}
                    placeholder="Bernard"
                  />
                </div>
              </label>
            </div>
            <label className="m-field">
              <span className="m-field-lbl">Email pro</span>
              <div className="m-input-wrap">
                <input
                  className="m-input"
                  value={f.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="c.bernard@ghrmsa.fr"
                />
              </div>
            </label>
            <div className="m-row-2">
              <label className="m-field">
                <span className="m-field-lbl">Fonction</span>
                <div className="m-input-wrap">
                  <select
                    className="m-input"
                    value={f.role}
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
                </div>
              </label>
              <label className="m-field">
                <span className="m-field-lbl">Service</span>
                <div className="m-input-wrap">
                  <select
                    className="m-input"
                    value={f.service}
                    onChange={(e) => set("service", e.target.value)}
                  >
                    {["SAU", "SMUR", "UHCD", "Réanimation", "Régulation 15"].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </label>
            </div>
            {err && (
              <div className="m-err">
                <Warn /> <span>{err}</span>
              </div>
            )}
            <button className="m-btn m-btn-primary">
              Continuer <Arrow />
            </button>
          </form>
        </>
      )}

      {step === 2 && (
        <>
          <div className="m-hero m-hero-sm">
            <h2 className="m-h2">Mot de passe</h2>
            <p className="m-sub">Au moins 8 caractères, unique à cette plateforme.</p>
          </div>
          <form
            className="m-form"
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
          >
            <label className="m-field">
              <span className="m-field-lbl">Mot de passe</span>
              <div className="m-input-wrap">
                <input
                  className="m-input"
                  type="password"
                  value={f.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </label>
            <MStrength value={f.password} />
            <label className="m-field">
              <span className="m-field-lbl">Confirmer</span>
              <div className="m-input-wrap">
                <input
                  className="m-input"
                  type="password"
                  value={f.confirm}
                  onChange={(e) => set("confirm", e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </label>
            <label className="m-check">
              <input
                type="checkbox"
                checked={f.consent}
                onChange={(e) => set("consent", e.target.checked)}
              />
              <span>J'accepte la charte d'usage du SI hospitalier du GHRMSA.</span>
            </label>
            {err && (
              <div className="m-err">
                <Warn /> <span>{err}</span>
              </div>
            )}
            <button className="m-btn m-btn-primary">
              Envoyer la demande <Arrow />
            </button>
          </form>
        </>
      )}

      {step === 3 && (
        <div className="m-success">
          <div className="m-success-mark">
            <Check big />
          </div>
          <h2 className="m-h2">Demande transmise</h2>
          <p className="m-sub">
            La demande de{" "}
            <b>
              {f.prenom} {f.nom}
            </b>{" "}
            (<span className="m-mono">{f.matricule}</span>) est en attente de validation par
            l'administrateur.
          </p>
          <div className="m-recap">
            <div>
              <span>Matricule</span>
              <b className="m-mono">{f.matricule}</b>
            </div>
            <div>
              <span>Fonction</span>
              <b>{f.role}</b>
            </div>
            <div>
              <span>Service</span>
              <b>{f.service}</b>
            </div>
            <div>
              <span>Délai</span>
              <b>&lt; 24 h</b>
            </div>
          </div>
          <button className="m-btn m-btn-primary" onClick={() => onSubmit(f)}>
            Retour à la connexion
          </button>
        </div>
      )}
    </div>
  );
}

function MStrength({ value }) {
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
    <div className="m-pw">
      <div className="m-pw-bars">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={`m-pw-bar ${i < score ? "on" : ""}`} />
        ))}
      </div>
      <span>{value ? labels[score] : "Saisissez un mot de passe"}</span>
    </div>
  );
}

// ----- ADMIN
function MAdmin({ members, setMembers, requests, setRequests, onLogout }) {
  const [tab, setTab] = useState("requests");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const active = members.filter((m) => m.status === "active");
  const banned = members.filter((m) => m.status === "banned");

  const approve = (r) => {
    setRequests((rs) => rs.filter((x) => x.id !== r.id));
    setMembers((ms) => [
      { ...r, id: Date.now(), status: "active", since: "à l'instant", lastSeen: "à l'instant" },
      ...ms,
    ]);
    setToast({ k: "ok", msg: `${r.prenom} ${r.nom} ajouté(e).` });
    setSel(null);
  };
  const reject = (r) => {
    setRequests((rs) => rs.filter((x) => x.id !== r.id));
    setToast({ k: "warn", msg: `Demande refusée.` });
    setSel(null);
  };
  const ban = (m, reason) => {
    setMembers((ms) =>
      ms.map((x) =>
        x.id === m.id ? { ...x, status: "banned", banReason: reason || "Non précisé" } : x
      )
    );
    setToast({ k: "warn", msg: `${m.prenom} suspendu(e).` });
    setSel(null);
  };
  const unban = (m) => {
    setMembers((ms) =>
      ms.map((x) => (x.id === m.id ? { ...x, status: "active", banReason: undefined } : x))
    );
    setToast({ k: "ok", msg: `Accès rétabli.` });
    setSel(null);
  };

  const list = tab === "requests" ? requests : tab === "members" ? active : banned;
  const filt = q
    ? list.filter((u) =>
        (u.nom + " " + u.prenom + " " + u.matricule + " " + (u.role || ""))
          .toLowerCase()
          .includes(q.toLowerCase())
      )
    : list;

  const title = tab === "requests" ? "Demandes" : tab === "members" ? "Personnels" : "Suspendus";
  const subtitle =
    tab === "requests"
      ? "À valider"
      : tab === "members"
        ? `${active.length} actifs`
        : `${banned.length} comptes`;

  return (
    <div className="m-stage m-admin">
      <div className="m-bg-glow" />
      <header className="m-admin-head">
        <div className="m-admin-head-row">
          <MLogo size={42} />
          <button className="m-icn-btn" onClick={onLogout} title="Quitter">
            <Close />
          </button>
        </div>
        <h1 className="m-admin-title">{title}</h1>
        <p className="m-admin-sub">{subtitle}</p>
        <div className="m-search-wrap">
          <Search />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un nom, matricule…"
          />
        </div>
      </header>

      <main className="m-admin-list">
        {filt.length === 0 && <div className="m-empty">Aucun résultat.</div>}
        {filt.map((u) => (
          <button key={u.id} className={`m-card m-card-${tab}`} onClick={() => setSel(u)}>
            <MAvatar name={`${u.prenom} ${u.nom}`} tone={tab === "banned" ? "muted" : "default"} />
            <div className="m-card-body">
              <div className="m-card-line1">
                <span className="m-card-name">
                  {u.prenom} {u.nom}
                </span>
                <span className="m-card-mat m-mono">{u.matricule}</span>
              </div>
              <div className="m-card-line2">
                <span>{u.role}</span>
                <span className="m-card-dot">·</span>
                <span>{u.service}</span>
              </div>
              <div className="m-card-line3">
                {tab === "requests" && (
                  <>
                    <span className="m-card-time">{u.submitted}</span>
                    <span className="m-card-email m-mono">{u.email}</span>
                  </>
                )}
                {tab === "members" && (
                  <>
                    <span className="m-card-time">
                      <span className="m-dot m-dot-ok" /> {u.lastSeen}
                    </span>
                    <span className="m-card-email m-mono">{u.email}</span>
                  </>
                )}
                {tab === "banned" && <span className="m-card-time">{u.banReason}</span>}
              </div>
            </div>
            {tab === "requests" && <div className="m-card-cta">À valider</div>}
            <Dots />
          </button>
        ))}
      </main>

      <nav className="m-tabbar">
        <button
          className={`m-tab ${tab === "requests" ? "on" : ""}`}
          onClick={() => setTab("requests")}
        >
          <span className="m-tab-icn">
            <InboxI />
          </span>
          <span className="m-tab-lbl">Demandes</span>
          {requests.length > 0 && <span className="m-tab-badge">{requests.length}</span>}
        </button>
        <button
          className={`m-tab ${tab === "members" ? "on" : ""}`}
          onClick={() => setTab("members")}
        >
          <span className="m-tab-icn">
            <UsersI />
          </span>
          <span className="m-tab-lbl">Personnels</span>
        </button>
        <button
          className={`m-tab ${tab === "banned" ? "on" : ""}`}
          onClick={() => setTab("banned")}
        >
          <span className="m-tab-icn">
            <BanI />
          </span>
          <span className="m-tab-lbl">Suspendus</span>
        </button>
      </nav>

      {sel && (
        <MSheet
          user={sel}
          tab={tab}
          onClose={() => setSel(null)}
          onApprove={() => approve(sel)}
          onReject={() => reject(sel)}
          onBan={(r) => ban(sel, r)}
          onUnban={() => unban(sel)}
        />
      )}

      {toast && (
        <div className={`m-toast m-toast-${toast.k}`}>
          {toast.k === "ok" ? <Check /> : <Warn />}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

function MSheet({ user, tab, onClose, onApprove, onReject, onBan, onUnban }) {
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <>
      <div className="m-scrim" onClick={onClose} />
      <div className="m-sheet">
        <div className="m-sheet-grip" />
        <header className="m-sheet-head">
          <div className="m-sheet-eyebrow">
            {tab === "requests"
              ? "Demande d'accès"
              : tab === "members"
                ? "Personnel actif"
                : "Compte suspendu"}
          </div>
          <div className="m-sheet-id">
            <MAvatar
              name={`${user.prenom} ${user.nom}`}
              tone={tab === "banned" ? "muted" : "default"}
            />
            <div>
              <div className="m-sheet-name">
                {user.prenom} {user.nom}
              </div>
              <div className="m-sheet-meta">
                <span className="m-mono">{user.matricule}</span> · {user.role}
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
          {tab === "requests" && (
            <div>
              <dt>Soumise</dt>
              <dd>{user.submitted}</dd>
            </div>
          )}
          {tab === "members" && (
            <div>
              <dt>Depuis</dt>
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

        {tab === "requests" && (
          <div className="m-sheet-actions m-row-2">
            <button className="m-btn m-btn-ghost" onClick={onReject}>
              Refuser
            </button>
            <button className="m-btn m-btn-primary" onClick={onApprove}>
              Approuver
            </button>
          </div>
        )}
        {tab === "members" && !confirm && (
          <div className="m-sheet-actions">
            <button className="m-btn m-btn-danger" onClick={() => setConfirm(true)}>
              Suspendre ce compte
            </button>
          </div>
        )}
        {tab === "members" && confirm && (
          <div className="m-confirm">
            <h4>Motif de suspension</h4>
            <select
              className="m-input m-select"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="">Sélectionner…</option>
              <option>Partage d'identifiants</option>
              <option>Départ du service</option>
              <option>Comportement inapproprié</option>
              <option>Demande RH</option>
            </select>
            <div className="m-row-2">
              <button className="m-btn m-btn-ghost" onClick={() => setConfirm(false)}>
                Annuler
              </button>
              <button
                className="m-btn m-btn-danger"
                disabled={!reason}
                onClick={() => onBan(reason)}
              >
                Confirmer
              </button>
            </div>
          </div>
        )}
        {tab === "banned" && (
          <div className="m-sheet-actions">
            <button className="m-btn m-btn-primary" onClick={onUnban}>
              Rétablir l'accès
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ----- Member welcome
function MMember({ matricule, onLogout }) {
  return (
    <div className="m-stage m-welcome-stage">
      <div className="m-bg-glow" />
      <div className="m-welcome">
        <MLogo size={42} />
        <div className="m-eyebrow m-eyebrow-ok">Authentification réussie</div>
        <h1 className="m-h1 m-h1-sm">Bienvenue au SAU.</h1>
        <p className="m-sub">
          Connecté en tant que <span className="m-mono">{matricule}</span>.
        </p>
        <div className="m-welcome-card">
          <div className="m-wc-row">
            <span>Service</span>
            <b>Émile-Muller</b>
          </div>
          <div className="m-wc-row">
            <span>Garde en cours</span>
            <b>14:00 → 22:00</b>
          </div>
          <div className="m-wc-row">
            <span>Patients en attente</span>
            <b>23</b>
          </div>
        </div>
        <button className="m-btn m-btn-ghost" onClick={onLogout}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

// ----- App
function MobileApp() {
  const [view, setView] = useState("login");
  const [session, setSession] = useState(null);
  const [members, setMembers] = useState(seedMembers);
  const [requests, setRequests] = useState(seedRequests);
  const banned = members.filter((m) => m.status === "banned");

  return (
    <IOSDevice width={402} height={874} dark={true}>
      <div className="m-app">
        {view === "login" && (
          <MLogin
            knownMembers={members}
            knownRequests={requests}
            knownBanned={banned}
            onLogin={(s) => {
              setSession(s);
              setView("member");
            }}
            onRegister={() => setView("register")}
            onAdmin={() => setView("admin")}
          />
        )}
        {view === "register" && (
          <MRegister
            onSubmit={(form) => {
              setRequests((rs) => [{ id: Date.now(), ...form, submitted: "à l'instant" }, ...rs]);
              setView("login");
            }}
            onBack={() => setView("login")}
          />
        )}
        {view === "admin" && (
          <MAdmin
            members={members}
            setMembers={setMembers}
            requests={requests}
            setRequests={setRequests}
            onLogout={() => setView("login")}
          />
        )}
        {view === "member" && (
          <MMember matricule={session?.matricule || "M402100"} onLogout={() => setView("login")} />
        )}
      </div>
    </IOSDevice>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<MobileApp />);
