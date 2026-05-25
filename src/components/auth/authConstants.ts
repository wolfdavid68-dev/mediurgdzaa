// Constantes partagées par les écrans d'auth desktop ET mobile.
// Centralisées ici pour qu'une liste reste unique (évite la divergence
// fonctions/services entre RegisterScreen et MobileRegisterScreen).

export const FONCTIONS = [
  "Médecin urgentiste",
  "Interne",
  "Infirmier",
  "Pharmacienne",
  "Aide-soignant",
  "Étudiant infirmier",
  "Étudiant AS",
  "Cadre de santé",
] as const;

export const SERVICES = ["SAU", "SMUR", "UHCD", "Réanimation", "Régulation 15"] as const;

export const BAN_REASONS = [
  "Fin de stage",
  "Partage d'identifiants",
  "Départ du service",
  "Comportement inapproprié",
  "Demande RH",
  "Autre",
] as const;
