import { useEffect, useState, type ReactElement, type ReactNode } from "react";

// Lecteur ECG — module d'aide à la lecture (PREVIEW uniquement, cf.
// ProtocolesPage / isPreview). Mock non-diagnostique : flux photo →
// analyse simulée. Aucune IA réelle, aucune dépendance externe.
// Port React du prototype HTML/Tailwind → CSS scopé .ecg-reader
// (le projet n'utilise pas Tailwind). Valeurs d'échelle alignées
// sur Tailwind v4 (vérifiées via Context7).

type Severite = "info" | "attention" | "critique";
type Anomalie = { libelle: string; derivations: string[]; severite: Severite };

const MOCK = {
  rythme: { type: "Rythme sinusal", regulier: true, frequence_estimee_bpm: 88 },
  axe: "normal",
  intervalles: { PR_ms: 160, QRS_ms: 90, QT_ms: 380 },
  anomalies_visibles: [
    {
      libelle: "Sus-décalage ST 3 mm en V2-V4",
      derivations: ["V2", "V3", "V4"],
      severite: "critique",
    },
    {
      libelle: "Onde Q de nécrose débutante en V2",
      derivations: ["V2"],
      severite: "attention",
    },
    {
      libelle: "Miroir : sous-décalage ST en DII-DIII-aVF",
      derivations: ["DII", "DIII", "aVF"],
      severite: "attention",
    },
  ] as Anomalie[],
  // label = texte affiché ; query = terme envoyé à la recherche
  // Médicaments (même mécanisme que les liens drogue des protocoles).
  orientations_therapeutiques: [
    { label: "Aspirine 250 mg IVD", query: "Aspirine" },
    { label: "Ticagrelor 180 mg PO", query: "Ticagrelor" },
    { label: "Héparine non fractionnée", query: "Héparine" },
    { label: "Morphine titrée si EVA > 3", query: "Morphine" },
  ],
  limites_lecture:
    "Calibration 25 mm/s, 10 mm/mV présumée. Tableau évocateur de SCA ST+ antérieur — coronarographie en urgence à discuter selon contexte clinique.",
};

const ECG_PATH =
  "M 0,150 L 30,150 L 35,148 L 40,152 L 45,150 L 60,150 L 65,140 L 68,180 L 71,100 L 74,170 L 77,150 L 95,150 L 100,130 L 130,130 L 135,148 L 140,152 L 150,150 L 165,150 L 170,140 L 173,180 L 176,100 L 179,170 L 182,150 L 200,150 L 205,125 L 235,125 L 240,148 L 245,152 L 255,150 L 270,150 L 275,140 L 278,180 L 281,100 L 284,170 L 287,150 L 305,150 L 310,128 L 340,128 L 345,150 L 400,150";

type IconName =
  | "activity"
  | "camera"
  | "image"
  | "chevron-right"
  | "x"
  | "sparkles"
  | "loader"
  | "alert-octagon"
  | "alert-triangle"
  | "info"
  | "heart-pulse"
  | "ruler"
  | "pill"
  | "external-link"
  | "refresh-cw"
  | "share-2";

const PATHS: Record<IconName, ReactElement> = {
  activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  camera: (
    <>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </>
  ),
  "chevron-right": <path d="m9 18 6-6-6-6" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  sparkles: (
    <>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4M22 5h-4M4 17v2M5 18H3" />
    </>
  ),
  loader: (
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  ),
  "alert-octagon": (
    <>
      <path d="M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
  "alert-triangle": (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  "heart-pulse": (
    <>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5" />
      <path d="M3.22 12H9.5l.5-1.5 2 4 1-2 .5 1h6.78" />
    </>
  ),
  ruler: (
    <>
      <path d="M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0L2.7 16.7a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4Z" />
      <path d="m7.5 10.5 2 2M10.5 7.5l2 2M13.5 4.5l2 2M4.5 13.5l2 2" />
    </>
  ),
  pill: (
    <>
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
      <path d="m8.5 8.5 7 7" />
    </>
  ),
  "external-link": (
    <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  ),
  "refresh-cw": (
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M3 21v-5h5" />
  ),
  "share-2": (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
    </>
  ),
};

const Ic = ({ n, cls }: { n: IconName; cls?: string }) => (
  <svg className={`ecgr-icon ${cls || ""}`} viewBox="0 0 24 24" aria-hidden="true">
    {PATHS[n]}
  </svg>
);

type Screen = "capture" | "preview" | "loading" | "results";

const SEV_CLASS: Record<Severite, string> = {
  info: "ecgr-sev-info",
  attention: "ecgr-sev-attention",
  critique: "ecgr-sev-critique",
};
const SEV_IC: Record<Severite, IconName> = {
  info: "info",
  attention: "alert-triangle",
  critique: "alert-octagon",
};

const Disclaimer = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="ecgr-disc">
    <span className="ecgr-disc-ic">
      <Ic n="alert-triangle" />
    </span>
    <div className="ecgr-disc-txt">
      <div className="ecgr-disc-title">{title}</div>
      <div>{children}</div>
    </div>
  </div>
);

type EcgReaderProps = { onDrugSearch?: (name: string) => void };

const EcgReader = ({ onDrugSearch }: EcgReaderProps) => {
  const [screen, setScreen] = useState<Screen>("capture");

  useEffect(() => {
    if (screen !== "loading") return;
    const t = setTimeout(() => setScreen("results"), 2500);
    return () => clearTimeout(t);
  }, [screen]);

  const a = MOCK;

  return (
    <div className="ecg-reader">
      {screen === "capture" && (
        <div className="ecgr-pad">
          <header className="ecgr-head">
            <span className="ecgr-head-ic">
              <Ic n="activity" />
            </span>
            <h1 className="ecgr-h1">Lecture ECG</h1>
            <span className="ecgr-head-tag">Aide à la lecture</span>
          </header>

          <button className="ecgr-cta" onClick={() => setScreen("preview")} type="button">
            <span className="ecgr-cta-ic">
              <Ic n="camera" />
            </span>
            <span>
              <span className="ecgr-cta-title">Prendre une photo de l'ECG</span>
              <span className="ecgr-cta-sub">Cadrage 12 dérivations, papier à plat</span>
            </span>
          </button>

          <button className="ecgr-row-btn" onClick={() => setScreen("preview")} type="button">
            <span className="ecgr-row-ic">
              <Ic n="image" />
            </span>
            <span className="ecgr-row-body">
              <span className="ecgr-row-title">Importer depuis la galerie</span>
              <span className="ecgr-row-sub">JPG · PNG · HEIC</span>
            </span>
            <span className="ecgr-row-chev">
              <Ic n="chevron-right" />
            </span>
          </button>

          <div className="ecgr-tips">
            <div className="ecgr-tips-h">Conseils de prise de vue</div>
            <ul className="ecgr-tips-list">
              <li>
                <span className="ecgr-bullet">·</span> Lumière homogène, pas de reflets
              </li>
              <li>
                <span className="ecgr-bullet">·</span> ECG entier visible avec calibration (1mV)
              </li>
              <li>
                <span className="ecgr-bullet">·</span> Masquer les données patient identifiantes
              </li>
            </ul>
          </div>

          <div className="ecgr-warn">
            <Disclaimer title="À titre indicatif et éducatif">
              Contenu non-diagnostique. Toujours faire valider par un médecin avant toute décision
              thérapeutique.
            </Disclaimer>
          </div>
        </div>
      )}

      {screen === "preview" && (
        <div>
          <header className="ecgr-bar">
            <button
              className="ecgr-bar-close"
              onClick={() => setScreen("capture")}
              type="button"
              aria-label="Fermer"
            >
              <Ic n="x" />
            </button>
            <h1 className="ecgr-bar-h1">Photo capturée</h1>
          </header>

          <div className="ecgr-pad ecgr-stack">
            <div className="ecgr-photo">
              <div className="ecg-grid ecgr-photo-in">
                <svg viewBox="0 0 400 300" preserveAspectRatio="none" className="ecgr-svg">
                  <path d={ECG_PATH} fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
                </svg>
                <div className="ecgr-photo-tag">V2-V4 · 25 mm/s · 10 mm/mV</div>
              </div>
            </div>

            <button className="ecgr-analyze" onClick={() => setScreen("loading")} type="button">
              <Ic n="sparkles" /> Analyser cet ECG
            </button>
            <button className="ecgr-secondary" onClick={() => setScreen("capture")} type="button">
              Reprendre la photo
            </button>
          </div>
        </div>
      )}

      {screen === "loading" && (
        <div>
          <header className="ecgr-bar">
            <span style={{ width: 20 }} />
            <h1 className="ecgr-bar-h1">Analyse en cours</h1>
          </header>
          <div className="ecgr-pad ecgr-stack">
            <div className="ecgr-photo" style={{ opacity: 0.5 }}>
              <div className="ecg-grid ecgr-photo-in">
                <svg viewBox="0 0 400 300" preserveAspectRatio="none" className="ecgr-svg">
                  <path d={ECG_PATH} fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
                </svg>
              </div>
            </div>
            <div className="ecgr-loadbox">
              <span className="ecgr-spin">
                <Ic n="loader" />
              </span>
              <div>
                <div className="ecgr-load-t">Lecture du tracé…</div>
                <div className="ecgr-load-s">
                  <span className="ecgr-dot">●</span> Analyse rythme · intervalles · anomalies
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {screen === "results" && (
        <div>
          <header className="ecgr-bar">
            <button
              className="ecgr-bar-close"
              onClick={() => setScreen("capture")}
              type="button"
              aria-label="Fermer"
            >
              <Ic n="x" />
            </button>
            <h1 className="ecgr-bar-h1">Analyse ECG</h1>
            <span className="ecgr-bar-tag">Non-diagnostique</span>
          </header>

          <div className="ecgr-banner">
            <Disclaimer title="À titre indicatif et éducatif">
              Cette analyse ne remplace pas l'avis d'un médecin.{" "}
              <strong>Toujours faire valider</strong> par un praticien avant toute décision
              thérapeutique.
            </Disclaimer>
          </div>

          <div className="ecgr-pad ecgr-stack">
            <div className="ecgr-photo fade-up fade-up-1">
              <div className="ecg-grid ecgr-strip">
                <svg viewBox="0 0 400 150" preserveAspectRatio="none" className="ecgr-svg">
                  <path
                    d="M 0,75 L 30,75 L 35,73 L 40,77 L 45,75 L 60,75 L 65,65 L 68,105 L 71,25 L 74,95 L 77,75 L 95,75 L 100,55 L 130,55 L 135,73 L 140,77 L 150,75 L 200,75 L 205,50 L 235,50 L 240,73 L 245,77 L 255,75 L 305,75 L 310,53 L 340,53 L 345,75 L 400,75"
                    fill="none"
                    stroke="#1a1a1a"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            </div>

            <div className="ecgr-verdict fade-up fade-up-2">
              <span className="ecgr-verdict-ic">
                <Ic n="alert-octagon" />
              </span>
              <div>
                <div className="ecgr-verdict-k">Tableau évocateur</div>
                <div className="ecgr-verdict-t">SCA ST+ antérieur</div>
                <div className="ecgr-verdict-s">
                  À confirmer cliniquement — orientation USIC / coronarographie
                </div>
              </div>
            </div>

            <section className="ecgr-card fade-up fade-up-3">
              <div className="ecgr-card-h">
                <Ic n="heart-pulse" /> Rythme
              </div>
              <div className="ecgr-grid3">
                <div>
                  <div className="ecgr-k">Type</div>
                  <div className="ecgr-v">{a.rythme.type}</div>
                </div>
                <div>
                  <div className="ecgr-k">Rég.</div>
                  <div className="ecgr-v">{a.rythme.regulier ? "Régulier" : "Irrégulier"}</div>
                </div>
                <div>
                  <div className="ecgr-k">FC</div>
                  <div className="ecgr-v ecgr-mono">{a.rythme.frequence_estimee_bpm} bpm</div>
                </div>
              </div>
            </section>

            <section className="ecgr-card fade-up fade-up-3">
              <div className="ecgr-card-h">
                <Ic n="ruler" /> Intervalles
              </div>
              <div className="ecgr-grid3">
                <div>
                  <div className="ecgr-k">PR</div>
                  <div className="ecgr-v ecgr-mono">{a.intervalles.PR_ms} ms</div>
                </div>
                <div>
                  <div className="ecgr-k">QRS</div>
                  <div className="ecgr-v ecgr-mono">{a.intervalles.QRS_ms} ms</div>
                </div>
                <div>
                  <div className="ecgr-k">QT</div>
                  <div className="ecgr-v ecgr-mono">{a.intervalles.QT_ms} ms</div>
                </div>
              </div>
              <div className="ecgr-card-foot">
                Axe : <span className="ecgr-axe">{a.axe}</span>
              </div>
            </section>

            <section className="fade-up fade-up-4">
              <div className="ecgr-sec-h">Anomalies visibles · {a.anomalies_visibles.length}</div>
              <div className="ecgr-stack-sm">
                {a.anomalies_visibles.map((an) => (
                  <div key={an.libelle} className={`ecgr-anom ${SEV_CLASS[an.severite]}`}>
                    <span className="ecgr-anom-ic">
                      <Ic n={SEV_IC[an.severite]} />
                    </span>
                    <div>
                      <div className="ecgr-anom-t">{an.libelle}</div>
                      <div className="ecgr-anom-d">{an.derivations.join(" · ")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="ecgr-card fade-up fade-up-5">
              <div className="ecgr-card-h">
                <Ic n="pill" /> Pistes thérapeutiques — fiches MediURG
              </div>
              <div>
                {a.orientations_therapeutiques.map((o) => (
                  <button
                    key={o.label}
                    className="ecgr-piste"
                    type="button"
                    disabled={!onDrugSearch}
                    onClick={onDrugSearch ? () => onDrugSearch(o.query) : undefined}
                    title={onDrugSearch ? `Ouvrir la fiche ${o.query}` : undefined}
                  >
                    <span className="ecgr-piste-chev">
                      <Ic n="chevron-right" />
                    </span>
                    <span className="ecgr-piste-t">{o.label}</span>
                    <span className="ecgr-piste-ext">
                      <Ic n="external-link" />
                    </span>
                  </button>
                ))}
              </div>
              <div className="ecgr-card-foot">
                Suggestions générées à partir du tableau ECG — posologies et contre-indications à
                vérifier sur la fiche.
              </div>
            </section>

            <div className="ecgr-limits fade-up fade-up-5">
              <div className="ecgr-limits-h">
                <Ic n="info" /> Limites de la lecture
              </div>
              {a.limites_lecture}
            </div>

            <div className="ecgr-grid2">
              <button className="ecgr-secondary ecgr-ico-btn" type="button" disabled>
                <Ic n="refresh-cw" /> Nouvelle analyse
              </button>
              <button className="ecgr-secondary ecgr-ico-btn" type="button" disabled>
                <Ic n="share-2" /> Partager
              </button>
            </div>

            <div className="ecgr-warn">
              <Disclaimer title="Rappel important">
                Contenu fourni à <strong>titre indicatif et éducatif uniquement</strong>. Cette
                analyse automatisée peut contenir des erreurs et ne constitue pas un diagnostic
                médical. <strong>Faire systématiquement valider par un médecin</strong> avant toute
                prise de décision clinique ou thérapeutique.
              </Disclaimer>
            </div>

            <div className="ecgr-foot">MediURG · Module d'aide à la lecture · v1.0</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EcgReader;
