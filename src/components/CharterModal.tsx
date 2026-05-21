import { useEffect, useRef, type MouseEvent } from "react";

// Modale « Charte d'utilisation ».
//
// Flux :
//  - Premier lancement de l'app sur l'appareil → ouverte automatiquement
//    par App.tsx tant que localStorage("mediurg-charter-accepted") ne
//    correspond pas à CHARTER_VERSION.
//  - Page d'inscription → ouverte via la case à cocher « J'accepte… ».
//  - Accessible à tout moment via le lien dans la modale changelog
//    (footer de la version).
//
// Mode « première lecture » : le bouton de fermeture (×) est caché et
// l'acceptation est obligatoire. En mode « consultation » (déjà accepté
// ou affichage depuis register), l'utilisateur peut juste fermer.
//
// La version est stockée pour pouvoir forcer une re-acceptation si la
// charte change matériellement à l'avenir.

export const CHARTER_VERSION = "1.0";
export const CHARTER_LS_KEY = "mediurg-charter-accepted";

type Props = {
  open: boolean;
  // Mode obligatoire : pas de × pour fermer, seul « J'accepte » sort.
  requireAccept?: boolean;
  onAccept: () => void;
  onClose: () => void;
};

const CharterModal = ({ open, requireAccept = false, onAccept, onClose }: Props) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      try {
        d.showModal();
      } catch {}
    } else if (!open && d.open) {
      try {
        d.close();
      } catch {}
    }
  }, [open]);

  // En mode obligatoire, on intercepte l'ESC et le clic backdrop : le
  // dialog renvoie l'event onClose qu'on ignore tant que pas accepté.
  const handleClose = (e?: Event) => {
    if (requireAccept) {
      e?.preventDefault();
      // Re-ouvre immédiatement si le browser tente de fermer (ESC).
      const d = dialogRef.current;
      if (d && !d.open) {
        try {
          d.showModal();
        } catch {}
      }
      return;
    }
    onClose();
  };

  const onBackdropClick = (e: MouseEvent) => {
    if (requireAccept) return;
    if (e.target === dialogRef.current) onClose();
  };

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <dialog
      ref={dialogRef}
      className="legal-dialog"
      aria-labelledby="charter-title"
      onClose={handleClose as never}
      onClick={onBackdropClick}
    >
      <div className="legal-modal">
        <header className="legal-header">
          <h2 id="charter-title">Charte d&apos;utilisation</h2>
          {!requireAccept && (
            <button type="button" className="legal-close" onClick={onClose} aria-label="Fermer">
              ×
            </button>
          )}
        </header>

        <div className="legal-body">
          <section>
            <h3>1. Nature de l&apos;application</h3>
            <p>
              Cette application est un mémo numérique destiné à faciliter le suivi et la
              consultation d&apos;informations. Elle constitue un outil d&apos;aide et{" "}
              <strong>ne remplace en aucun cas la prescription médicale</strong>.
            </p>
          </section>

          <section>
            <h3>2. Valeur de la prescription</h3>
            <p>
              Seule la prescription officielle fait foi. En cas de divergence entre les informations
              affichées dans l&apos;application et la prescription,{" "}
              <strong>c&apos;est la prescription qui prévaut, sans exception</strong>.
            </p>
            <p>L&apos;application :</p>
            <ul>
              <li>ne se substitue pas au jugement clinique du professionnel de santé</li>
              <li>ne remplace pas le document de prescription original</li>
              <li>n&apos;a pas de valeur légale ou réglementaire</li>
            </ul>
          </section>

          <section>
            <h3>3. Statut des données affichées</h3>
            <p>
              Les valeurs et informations présentées sont fournies à titre indicatif. Elles peuvent
              être en cours de validation et doivent{" "}
              <strong>toujours être vérifiées avec la prescription de référence</strong> avant toute
              décision ou action.
            </p>
          </section>

          <section>
            <h3>4. Responsabilité de l&apos;utilisateur</h3>
            <p>L&apos;utilisateur s&apos;engage à :</p>
            <ul>
              <li>
                consulter la prescription officielle avant toute action engageant sa responsabilité
              </li>
              <li>
                signaler toute incohérence constatée entre l&apos;application et la prescription
              </li>
              <li>
                ne pas considérer l&apos;application comme une source unique d&apos;information
              </li>
              <li>
                utiliser l&apos;application dans le cadre prévu, en complément et non en
                substitution
              </li>
            </ul>
          </section>

          <section>
            <h3>5. Limitation de responsabilité</h3>
            <p>
              L&apos;éditeur de l&apos;application ne peut être tenu responsable des conséquences
              résultant d&apos;une utilisation de l&apos;application comme source unique, sans
              vérification de la prescription de référence.
            </p>
          </section>

          <section>
            <h3>6. Acceptation</h3>
            <p>
              L&apos;utilisation de l&apos;application implique l&apos;acceptation pleine et entière
              de la présente charte.
            </p>
          </section>

          <section className="legal-update">
            <p className="legal-update-text">
              Version <strong>{CHARTER_VERSION}</strong>
            </p>
          </section>
        </div>

        <footer className="legal-footer">
          {!requireAccept && (
            <button type="button" className="auth-btn-secondary" onClick={onClose}>
              Fermer
            </button>
          )}
          <button type="button" className="auth-btn-primary" onClick={onAccept}>
            {requireAccept ? "J'accepte la charte" : "OK, j'ai lu"}
          </button>
        </footer>
      </div>
    </dialog>
  );
};

export default CharterModal;
