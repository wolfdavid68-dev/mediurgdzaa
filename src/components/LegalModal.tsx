import ModalDialog from "./ModalDialog";

// Modale Mention légale + Politique de confidentialité (RGPD).
// Accessible depuis le footer de l'écran login ET depuis l'app principale
// (header ou changelog).
//
// ⚠ Le contenu ci-dessous est un TEMPLATE juridiquement structuré mais
// doit être validé par le DPO du GHRMSA avant activation en prod.
// Les champs marqués [À COMPLÉTER] doivent être remplis par le service
// communication / juridique.

type Props = { open: boolean; onClose: () => void };

const LegalModal = ({ open, onClose }: Props) => {
  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      className="legal-dialog"
      aria-labelledby="legal-title"
    >
      <div className="legal-modal">
        <header className="legal-header">
          <h2 id="legal-title">Mentions légales &amp; confidentialité</h2>
          <button type="button" className="legal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </header>

        <div className="legal-body">
          {/* ─── Mention légale ─── */}
          <section>
            <h3>Éditeur</h3>
            <p>
              MediURG est un livret pharmacologique numérique d&apos;urgence édité par le{" "}
              <strong>Service d&apos;Accueil des Urgences (SAU)</strong> de l&apos;hôpital
              Émile-Muller,{" "}
              <strong>Groupe Hospitalier de la Région Mulhouse Sud-Alsace (GHRMSA)</strong>.
            </p>
            <p>
              Adresse : 20 Avenue du Docteur René Laennec, 68100 Mulhouse, France.
              <br />
              Directeur de la publication : [À COMPLÉTER — chef de service SAU]
              <br />
              Contact technique : <a href="mailto:wolfdavid68@gmail.com">wolfdavid68@gmail.com</a>
            </p>
          </section>

          <section>
            <h3>Hébergement</h3>
            <p>
              Frontend (PWA) hébergé par <strong>Vercel Inc.</strong> (San Francisco, CA, USA), via
              leur infrastructure CDN européenne. Transferts hors UE encadrés par les Clauses
              Contractuelles Types de la Commission européenne.
            </p>
            <p>
              Backend (authentification + base de données) hébergé par
              <strong> Supabase Inc.</strong>, instance située à{" "}
              <strong>Frankfurt (eu-central-1)</strong> — données stockées et traitées au sein de
              l&apos;UE.
            </p>
          </section>

          {/* ─── RGPD ─── */}
          <section>
            <h3>Données personnelles collectées</h3>
            <p>
              MediURG collecte les données suivantes lors de la création d&apos;un compte par un
              personnel hospitalier autorisé :
            </p>
            <ul>
              <li>
                <strong>Matricule professionnel</strong> (format M + 6 chiffres) — utilisé pour
                l&apos;authentification
              </li>
              <li>
                <strong>Email professionnel</strong> (@ghrmsa.fr ou whitelist administrateur) —
                login + communications administratives
              </li>
              <li>
                <strong>Prénom, nom, fonction, service</strong> — affichage dans la console
                d&apos;administration et traçabilité interne
              </li>
              <li>
                <strong>Mot de passe</strong> — stocké haché (bcrypt), jamais accessible en clair,
                ni par les administrateurs ni par l&apos;hébergeur
              </li>
              <li>
                <strong>Notes personnelles par médicament</strong> — stockées
                <em> localement sur l&apos;appareil</em> de l&apos;utilisateur (localStorage du
                navigateur), jamais transmises au serveur
              </li>
              <li>
                <strong>Favoris et historique</strong> de consultation des médicaments — stockés{" "}
                <em>localement</em> uniquement
              </li>
            </ul>
          </section>

          <section>
            <h3>Finalités du traitement</h3>
            <ul>
              <li>
                Permettre l&apos;accès sécurisé à la base pharmacologique d&apos;urgence aux
                personnels hospitaliers habilités du GHRMSA
              </li>
              <li>
                Tracer l&apos;origine des consultations en cas d&apos;incident clinique
                (responsabilité médicale)
              </li>
              <li>Permettre la personnalisation du livret par chaque praticien (notes, favoris)</li>
            </ul>
          </section>

          <section>
            <h3>Base légale</h3>
            <p>
              Le traitement repose sur l&apos;<strong>intérêt légitime</strong> du GHRMSA (article
              6.1.f RGPD) à fournir un outil de référence pharmacologique sécurisé à ses agents, et
              sur l&apos;exécution de la mission de service public hospitalier (article 6.1.e RGPD).
            </p>
          </section>

          <section>
            <h3>Durée de conservation</h3>
            <ul>
              <li>
                <strong>Compte actif</strong> : conservé tant que l&apos;agent fait partie du
                personnel du GHRMSA
              </li>
              <li>
                <strong>Compte suspendu</strong> : conservé 12 mois pour audit, puis anonymisé
              </li>
              <li>
                <strong>Compte refusé</strong> (demande non approuvée) : supprimé immédiatement
              </li>
              <li>
                <strong>Données locales</strong> (notes, favoris) : conservées jusqu&apos;à
                désinstallation de l&apos;application ou vidage du cache par l&apos;utilisateur
              </li>
            </ul>
          </section>

          <section>
            <h3>Vos droits (RGPD art. 15 à 22)</h3>
            <p>Vous disposez à tout moment du droit :</p>
            <ul>
              <li>
                <strong>D&apos;accès</strong> à vos données (art. 15) — demande écrite au DPO
              </li>
              <li>
                <strong>De rectification</strong> (art. 16) — directement depuis votre profil ou via
                le DPO
              </li>
              <li>
                <strong>D&apos;effacement</strong> (art. 17) — suppression de votre compte sur
                demande
              </li>
              <li>
                <strong>De limitation</strong> du traitement (art. 18)
              </li>
              <li>
                <strong>De portabilité</strong> (art. 20) — export JSON de vos notes via le bouton
                💾 dans l&apos;application
              </li>
              <li>
                <strong>D&apos;opposition</strong> (art. 21) — refus du traitement avec motivation
              </li>
              <li>
                <strong>De réclamation</strong> auprès de la CNIL :
                <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
                  {" "}
                  cnil.fr
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h3>Délégué à la Protection des Données (DPO)</h3>
            <p>
              <strong>DPO du GHRMSA</strong>
              <br />
              Email : <a href="mailto:dpo@ghrmsa.fr">dpo@ghrmsa.fr</a> [À CONFIRMER]
              <br />
              Adresse postale : 20 Avenue du Docteur René Laennec, 68100 Mulhouse
            </p>
          </section>

          <section>
            <h3>Sécurité</h3>
            <ul>
              <li>Chiffrement des mots de passe par bcrypt (jamais en clair)</li>
              <li>Communications HTTPS uniquement (TLS 1.2+) via Vercel et Supabase</li>
              <li>Cloisonnement des données par utilisateur via Row Level Security PostgreSQL</li>
              <li>
                Aucune donnée personnelle ne quitte l&apos;Union européenne sauf pour le hosting
                frontend (Vercel, encadré par les CCT de la Commission)
              </li>
            </ul>
          </section>

          <section>
            <h3>Cookies et traceurs</h3>
            <p>
              MediURG n&apos;utilise <strong>aucun cookie publicitaire ni traceur tiers</strong>.
              Les seules données stockées localement sur votre appareil sont :
            </p>
            <ul>
              <li>
                Le jeton de session Supabase (pour rester connecté entre les ouvertures de
                l&apos;application)
              </li>
              <li>Vos préférences locales (thème, taille de police, favoris, historique, notes)</li>
            </ul>
            <p>
              Aucune analyse comportementale (Google Analytics, Matomo, Hotjar, etc.) n&apos;est en
              place.
            </p>
          </section>

          <section>
            <h3>Avertissement clinique</h3>
            <p>
              MediURG est un <strong>outil d&apos;aide à la décision</strong>, pas un substitut au
              jugement clinique. Le médecin reste seul responsable de ses prescriptions. Les
              posologies, indications et contre-indications affichées sont issues des
              recommandations françaises et européennes en vigueur, mais doivent être vérifiées par
              le praticien selon le contexte clinique du patient (allergies, comorbidités,
              interactions, fonction rénale et hépatique, etc.).
            </p>
          </section>

          <section className="legal-update">
            <p className="legal-update-text">
              Dernière mise à jour : <strong>14 mai 2026</strong>
              <br />
              Version applicable à partir de l&apos;activation des comptes utilisateurs (cf.
              changelog).
            </p>
          </section>
        </div>

        <footer className="legal-footer">
          <button type="button" className="auth-btn-secondary" onClick={onClose}>
            Fermer
          </button>
        </footer>
      </div>
    </ModalDialog>
  );
};

export default LegalModal;
