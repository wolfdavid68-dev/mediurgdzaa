import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
  type ReactNode,
} from "react";

// Lecteur ECG — module d'aide à la lecture (PREVIEW uniquement, cf.
// ProtocolesPage / isPreview). Flux RÉEL : photo/galerie → compression
// client → POST /api/analyze-ecg (proxy serverless Vercel, clés API
// secrètes côté serveur, Gemini 2.5 Flash + repli Mistral Pixtral) →
// rendu data-driven. Contenu NON-DIAGNOSTIQUE : disclaimers + validation
// médicale obligatoire conservés. CSS scopé .ecg-reader (pas de Tailwind).
//
// Ergonomie (usage en stress réel, cf. exigence ACR) :
//  - écran capture condensé en 1 ligne fine (pas 2 pavés avant le tableau)
//  - loading : chrono + étapes + Annuler (AbortController)
//  - résultats : verdict EN PREMIER, anomalies, puis photo compacte
//  - Rythme + Intervalles fusionnés en une carte dense
//  - photo zoomable (lightbox tap-to-zoom) + « Ré-analyser cette photo »

type Severite = "info" | "attention" | "critique";
type Anomalie = { libelle: string; derivations?: string[]; severite?: Severite };
type Orientation = { label: string; query: string };

// Forme renvoyée par /api/analyze-ecg (champs tolérants : l'IA peut
// omettre / mettre null ce qu'elle ne mesure pas — on rend défensivement).
type Analysis = {
  rythme?: { type?: string; regulier?: boolean; frequence_estimee_bpm?: number | null };
  axe?: string | null;
  intervalles?: { PR_ms?: number | null; QRS_ms?: number | null; QT_ms?: number | null };
  verdict?: { kicker?: string; titre?: string; sous_titre?: string; severite?: Severite };
  anomalies_visibles?: Anomalie[];
  orientations_therapeutiques?: Orientation[];
  limites_lecture?: string;
};

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
  | "zoom-in";

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
  "zoom-in": (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3M11 8v6M8 11h6" />
    </>
  ),
};

const Ic = ({ n, cls }: { n: IconName; cls?: string }) => (
  <svg className={`ecgr-icon ${cls || ""}`} viewBox="0 0 24 24" aria-hidden="true">
    {PATHS[n]}
  </svg>
);

type Screen = "capture" | "preview" | "loading" | "results" | "error";

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
const VERDICT_MOD: Record<Severite, string> = {
  info: "ecgr-verdict--info",
  attention: "ecgr-verdict--attention",
  critique: "",
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

// Compresse l'image (max 1568 px de côté, JPEG q.82) avant l'upload :
// garde le payload loin de la limite Vercel (~4,5 Mo) et reste largement
// suffisant pour la lecture vision. Renvoie une data URL.
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image illisible"));
      img.onload = () => {
        const MAX = 1568;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          const r = Math.min(MAX / width, MAX / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas indisponible"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const num = (v: number | null | undefined, suffix = "") => (v == null ? "—" : `${v}${suffix}`);

type EcgReaderProps = { onDrugSearch?: (name: string) => void };

const EcgReader = ({ onDrugSearch }: EcgReaderProps) => {
  const [screen, setScreen] = useState<Screen>("capture");
  const [photo, setPhoto] = useState<string | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);
  const [errMsg, setErrMsg] = useState<string>("");
  const [elapsed, setElapsed] = useState(0);
  const [zoom, setZoom] = useState(false); // lightbox ouvert
  const [zoomed, setZoomed] = useState(false); // niveau de zoom dans la lightbox
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Évite un setState après démontage si l'utilisateur ferme pendant
  // l'analyse (l'appel réseau peut durer quelques secondes).
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abortRef.current?.abort();
    };
  }, []);

  // Chrono de l'analyse : feedback « ça tourne, pas figé » en stress.
  useEffect(() => {
    if (screen !== "loading") return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [screen]);

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de re-sélectionner le même fichier
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      if (!alive.current) return;
      setPhoto(dataUrl);
      setScreen("preview");
    } catch {
      if (!alive.current) return;
      setErrMsg("Impossible de lire cette image. Réessayer avec une autre photo.");
      setScreen("error");
    }
  };

  const analyze = async () => {
    if (!photo) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setScreen("loading");
    try {
      const resp = await fetch("/api/analyze-ecg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: photo }),
        signal: ctrl.signal,
      });
      const data: unknown = await resp.json().catch(() => null);
      if (!alive.current || ctrl.signal.aborted) return;
      if (!resp.ok) {
        const d = data as { error?: string; message?: string } | null;
        if (resp.status === 422) {
          setErrMsg(d?.message || "L'image ne semble pas être un ECG lisible. Reprendre la photo.");
        } else {
          setErrMsg(d?.error || "L'analyse a échoué. Vérifier la connexion réseau puis réessayer.");
        }
        setScreen("error");
        return;
      }
      setResult(data as Analysis);
      setScreen("results");
    } catch (err) {
      // Annulation volontaire : on est déjà revenu sur « preview ».
      if ((err as Error)?.name === "AbortError" || ctrl.signal.aborted) return;
      if (!alive.current) return;
      setErrMsg("Analyse impossible — connexion indisponible. Cette fonction nécessite Internet.");
      setScreen("error");
    }
  };

  const cancelAnalyze = () => {
    abortRef.current?.abort();
    setScreen("preview");
  };

  const reset = () => {
    abortRef.current?.abort();
    setPhoto(null);
    setResult(null);
    setErrMsg("");
    setZoom(false);
    setScreen("capture");
  };

  const closeZoom = () => {
    setZoom(false);
    setZoomed(false);
  };

  const a = result;
  const verdict = a?.verdict;
  const verdictSev: Severite = verdict?.severite || "attention";
  const anomalies = a?.anomalies_visibles ?? [];
  const orientations = a?.orientations_therapeutiques ?? [];

  return (
    <div className="ecg-reader">
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onPick}
      />
      <input ref={galleryInput} type="file" accept="image/*" hidden onChange={onPick} />

      {/* Lightbox zoom — vérification fine du tracé. Tap image = bascule
          ajusté ⇄ 2×, tap fond / ✕ = ferme. */}
      {zoom && photo && (
        <div
          className="ecgr-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Tracé ECG agrandi"
          tabIndex={-1}
          onClick={closeZoom}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeZoom();
          }}
        >
          <button className="ecgr-lb-close" type="button" aria-label="Fermer" onClick={closeZoom}>
            <Ic n="x" />
          </button>
          <div className="ecgr-lb-scroll">
            <button
              type="button"
              className="ecgr-lb-imgbtn"
              aria-label={zoomed ? "Réduire le tracé" : "Zoomer le tracé"}
              onClick={(e) => {
                e.stopPropagation();
                setZoomed((z) => !z);
              }}
            >
              <img
                src={photo}
                alt="Tracé ECG agrandi"
                className={`ecgr-lb-img ${zoomed ? "is-2x" : ""}`}
              />
            </button>
          </div>
          <div className="ecgr-lb-hint">Toucher l'image pour {zoomed ? "réduire" : "zoomer"}</div>
        </div>
      )}

      {screen === "capture" && (
        <div className="ecgr-pad">
          <header className="ecgr-head">
            <span className="ecgr-head-ic">
              <Ic n="activity" />
            </span>
            <h1 className="ecgr-h1">Lecture ECG</h1>
            <span className="ecgr-head-tag">Aide à la lecture</span>
          </header>

          <button className="ecgr-cta" onClick={() => cameraInput.current?.click()} type="button">
            <span className="ecgr-cta-ic">
              <Ic n="camera" />
            </span>
            <span>
              <span className="ecgr-cta-title">Prendre une photo de l'ECG</span>
              <span className="ecgr-cta-sub">12 dérivations · papier à plat · sans reflet</span>
            </span>
          </button>

          <button
            className="ecgr-row-btn"
            onClick={() => galleryInput.current?.click()}
            type="button"
          >
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

          {/* Ligne fine unique : tip + disclaimer fusionnés (au lieu de 2
              pavés qui repoussaient le tableau diagnostic plus bas). */}
          <p className="ecgr-note">
            <Ic n="alert-triangle" cls="ecgr-note-ic" />
            <span>
              ECG entier visible avec calibration 1 mV. Aide <strong>non-diagnostique</strong> —
              validation par un médecin obligatoire avant toute décision.
            </span>
          </p>
        </div>
      )}

      {screen === "preview" && photo && (
        <div>
          <header className="ecgr-bar">
            <button className="ecgr-bar-close" onClick={reset} type="button" aria-label="Fermer">
              <Ic n="x" />
            </button>
            <h1 className="ecgr-bar-h1">Photo capturée</h1>
          </header>

          <div className="ecgr-pad ecgr-stack">
            <button
              className="ecgr-photo ecgr-photo-btn"
              type="button"
              onClick={() => setZoom(true)}
              aria-label="Agrandir le tracé"
            >
              <img src={photo} alt="ECG capturé" className="ecgr-img" />
              <span className="ecgr-zoom-badge">
                <Ic n="zoom-in" />
              </span>
            </button>

            <button className="ecgr-analyze" onClick={analyze} type="button">
              <Ic n="sparkles" /> Analyser cet ECG
            </button>
            <button className="ecgr-secondary" onClick={reset} type="button">
              Reprendre la photo
            </button>
          </div>
        </div>
      )}

      {screen === "loading" && (
        <div>
          <header className="ecgr-bar">
            <button
              className="ecgr-bar-close"
              onClick={cancelAnalyze}
              type="button"
              aria-label="Annuler l'analyse"
            >
              <Ic n="x" />
            </button>
            <h1 className="ecgr-bar-h1">Analyse en cours</h1>
            <span className="ecgr-bar-tag ecgr-mono">{elapsed}s</span>
          </header>
          <div className="ecgr-pad ecgr-stack">
            {photo && (
              <div className="ecgr-photo" style={{ opacity: 0.45 }}>
                <img src={photo} alt="" className="ecgr-img" />
              </div>
            )}
            <div className="ecgr-loadbox">
              <span className="ecgr-spin">
                <Ic n="loader" />
              </span>
              <div>
                <div className="ecgr-load-t">Lecture du tracé…</div>
                <div className="ecgr-load-s">
                  <span className="ecgr-dot">●</span> Rythme · intervalles · anomalies
                  {elapsed >= 8 && " · presque terminé"}
                </div>
              </div>
            </div>
            <button className="ecgr-secondary" onClick={cancelAnalyze} type="button">
              Annuler
            </button>
          </div>
        </div>
      )}

      {screen === "error" && (
        <div>
          <header className="ecgr-bar">
            <button className="ecgr-bar-close" onClick={reset} type="button" aria-label="Fermer">
              <Ic n="x" />
            </button>
            <h1 className="ecgr-bar-h1">Analyse impossible</h1>
          </header>
          <div className="ecgr-pad ecgr-stack">
            <div className="ecgr-verdict ecgr-verdict--attention">
              <span className="ecgr-verdict-ic">
                <Ic n="alert-triangle" />
              </span>
              <div>
                <div className="ecgr-verdict-k">Échec</div>
                <div className="ecgr-verdict-t">{errMsg}</div>
              </div>
            </div>
            {photo && (
              <button className="ecgr-analyze" onClick={analyze} type="button">
                <Ic n="refresh-cw" /> Réessayer l'analyse
              </button>
            )}
            <button className="ecgr-secondary" onClick={reset} type="button">
              Nouvelle photo
            </button>
          </div>
        </div>
      )}

      {screen === "results" && a && (
        <div>
          <header className="ecgr-bar">
            <button className="ecgr-bar-close" onClick={reset} type="button" aria-label="Fermer">
              <Ic n="x" />
            </button>
            <h1 className="ecgr-bar-h1">Analyse ECG</h1>
            <span className="ecgr-bar-tag">Non-diagnostique</span>
          </header>

          <div className="ecgr-pad ecgr-stack">
            {/* 1. Verdict EN PREMIER — l'info actionnable en stress. */}
            {verdict && (
              <div className={`ecgr-verdict fade-up fade-up-1 ${VERDICT_MOD[verdictSev]}`}>
                <span className="ecgr-verdict-ic">
                  <Ic n={SEV_IC[verdictSev]} />
                </span>
                <div>
                  <div className="ecgr-verdict-k">{verdict.kicker || "Lecture"}</div>
                  <div className="ecgr-verdict-t">{verdict.titre || "—"}</div>
                  {verdict.sous_titre && <div className="ecgr-verdict-s">{verdict.sous_titre}</div>}
                </div>
              </div>
            )}

            {/* 2. Anomalies juste après le verdict. */}
            {anomalies.length > 0 && (
              <section className="fade-up fade-up-2">
                <div className="ecgr-sec-h">Anomalies visibles · {anomalies.length}</div>
                <div className="ecgr-stack-sm">
                  {anomalies.map((an, i) => {
                    const sev: Severite = an.severite || "info";
                    return (
                      <div key={`${an.libelle}-${i}`} className={`ecgr-anom ${SEV_CLASS[sev]}`}>
                        <span className="ecgr-anom-ic">
                          <Ic n={SEV_IC[sev]} />
                        </span>
                        <div>
                          <div className="ecgr-anom-t">{an.libelle}</div>
                          {an.derivations && an.derivations.length > 0 && (
                            <div className="ecgr-anom-d">{an.derivations.join(" · ")}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 3. Photo compacte, tap pour agrandir. */}
            {photo && (
              <button
                className="ecgr-thumb fade-up fade-up-3"
                type="button"
                onClick={() => setZoom(true)}
              >
                <img src={photo} alt="ECG analysé" className="ecgr-thumb-img" />
                <span className="ecgr-thumb-cap">
                  <Ic n="zoom-in" /> Toucher pour agrandir le tracé
                </span>
              </button>
            )}

            {/* 4. Rythme + Intervalles fusionnés en une seule carte dense. */}
            <section className="ecgr-card fade-up fade-up-3">
              <div className="ecgr-card-h">
                <Ic n="heart-pulse" /> Rythme &amp; intervalles
              </div>
              <div className="ecgr-grid3">
                <div>
                  <div className="ecgr-k">Type</div>
                  <div className="ecgr-v">{a.rythme?.type || "—"}</div>
                </div>
                <div>
                  <div className="ecgr-k">FC</div>
                  <div className="ecgr-v ecgr-mono">
                    {num(a.rythme?.frequence_estimee_bpm, " bpm")}
                  </div>
                </div>
                <div>
                  <div className="ecgr-k">Rég.</div>
                  <div className="ecgr-v">
                    {a.rythme?.regulier == null ? "—" : a.rythme.regulier ? "Régulier" : "Irrég."}
                  </div>
                </div>
                <div>
                  <div className="ecgr-k">PR</div>
                  <div className="ecgr-v ecgr-mono">{num(a.intervalles?.PR_ms, " ms")}</div>
                </div>
                <div>
                  <div className="ecgr-k">QRS</div>
                  <div className="ecgr-v ecgr-mono">{num(a.intervalles?.QRS_ms, " ms")}</div>
                </div>
                <div>
                  <div className="ecgr-k">QT</div>
                  <div className="ecgr-v ecgr-mono">{num(a.intervalles?.QT_ms, " ms")}</div>
                </div>
              </div>
              <div className="ecgr-card-foot">
                Axe : <span className="ecgr-axe">{a.axe || "—"}</span>
              </div>
            </section>

            {orientations.length > 0 && (
              <section className="ecgr-card fade-up fade-up-4">
                <div className="ecgr-card-h">
                  <Ic n="pill" /> Pistes thérapeutiques — fiches MediURG
                </div>
                <div>
                  {orientations.map((o) => (
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
            )}

            {a.limites_lecture && (
              <div className="ecgr-limits fade-up fade-up-5">
                <div className="ecgr-limits-h">
                  <Ic n="info" /> Limites de la lecture
                </div>
                {a.limites_lecture}
              </div>
            )}

            <div className="ecgr-grid2">
              <button className="ecgr-secondary ecgr-ico-btn" type="button" onClick={analyze}>
                <Ic n="refresh-cw" /> Ré-analyser
              </button>
              <button className="ecgr-secondary ecgr-ico-btn" type="button" onClick={reset}>
                <Ic n="camera" /> Nouvelle photo
              </button>
            </div>

            {/* Disclaimer unique fort (suffit médico-légalement ; on a
                retiré les blocs redondants pour alléger). */}
            <div className="ecgr-warn">
              <Disclaimer title="À titre indicatif et éducatif">
                Analyse automatisée pouvant contenir des erreurs, <strong>non-diagnostique</strong>.{" "}
                <strong>Faire systématiquement valider par un médecin</strong> avant toute décision
                clinique ou thérapeutique.
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
