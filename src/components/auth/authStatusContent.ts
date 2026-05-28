import { logout } from "../../lib/auth";

export type AuthStatusKind = "pending" | "banned";

export const AUTH_STATUS_COPY = {
  pending: {
    eyebrow: "En attente de validation",
    title: "Compte non encore activé",
    mobileTitle: "Compte non activé.",
    body: "Ta demande d'inscription a bien été transmise à l'administrateur du service. Tu recevras un email dès qu'elle sera validée.",
    mobileBody:
      "Ta demande d'inscription a bien été transmise à l'administrateur du service. Tu recevras un email dès qu'elle sera validée — délai habituel : moins de 24 h ouvrées.",
    help: "Délai habituel : moins de 24 heures ouvrées.",
  },
  banned: {
    eyebrow: "Compte suspendu",
    title: "Accès révoqué",
    mobileTitle: "Accès révoqué.",
    body: "Ton compte a été suspendu par l'administrateur du service. Contacte le cadre de garde ou la cellule SI du GHRMSA pour comprendre la raison et demander un rétablissement.",
    mobileBody:
      "Ton compte a été suspendu par l'administrateur du service. Contacte le cadre de garde ou la cellule SI du GHRMSA pour demander un rétablissement.",
  },
} satisfies Record<AuthStatusKind, Record<string, string>>;

export const logoutAndNotify = async (onLogout: () => void) => {
  await logout();
  onLogout();
};
