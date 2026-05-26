import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { getCurrentSession } from "../lib/auth";
import { Ic, Disclaimer } from "./EcgReader.icons";
import {
  anonymizeEcgImage,
  ECG_ANONYMIZATION_NOTICE,
  num,
  SEV_CLASS,
  SEV_IC,
  VERDICT_MOD,
  type Analysis,
  type Screen,
  type Severite,
} from "./EcgReader.helpers";

// Lecteur ECG — module d'aide à la lecture (PREVIEW uniquement, cf.
// ProtocolesPage / isPreview). Flux RÉEL : photo/galerie → compression
// client + anonymisation locale → POST /api/analyze-ecg (proxy serverless
// Vercel, clés API secrètes côté serveur, Gemini 2.5 Flash + repli Mistral Pixtral) →
// rendu data-driven. Contenu NON-DIAGNOSTIQUE : disclaimers + validation
// médicale obligatoire conservés. CSS scopé .ecg-reader (pas de Tailwind).
//
// Ergonomie (usage en stress réel, cf. exigence ACR) :
//  - écran capture condensé en 1 ligne fine (pas 2 pavés avant le tableau)
//  - loading : chrono + étapes + Annuler (AbortController)
//  - résultats : verdict EN PREMIER, anomalies, puis photo compacte
//  - Rythme + Intervalles fusionnés en une carte dense
//  - photo zoomable (lightbox tap-to-zoom) + « Ré-analyser cette photo »

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
      const dataUrl = await anonymizeEcgImage(file);
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
    const session = await getCurrentSession();
    if (!session?.access_token) {
      setErrMsg("Session expirée. Se reconnecter avant de relancer l'analyse ECG.");
      setScreen("error");
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setScreen("loading");
    try {
      const resp = await fetch("/api/analyze-ecg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
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
            <div className="ecgr-privacy">
              <Ic n="alert-triangle" />
              <span>{ECG_ANONYMIZATION_NOTICE}</span>
            </div>
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
                clinique ou thérapeutique. {ECG_ANONYMIZATION_NOTICE}
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
