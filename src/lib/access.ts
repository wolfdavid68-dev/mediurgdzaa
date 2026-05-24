import type { Profile } from "./auth";
import { normalize } from "./normalize";

export type PreviewAccessMode = "full" | "medicaments" | "tutorat";

const MEDICAMENTS_ONLY = new Set(["medecin urgentiste", "interne", "pharmacienne"]);
const TUTORAT_ONLY = new Set(["aide-soignant", "etudiant aide-soignant", "as", "etudiant as"]);

export const getPreviewAccessMode = (
  profile: Pick<Profile, "fonction"> | null,
  preview: boolean
): PreviewAccessMode => {
  if (!preview || !profile) return "full";

  const fonction = normalize(profile.fonction);
  if (MEDICAMENTS_ONLY.has(fonction)) return "medicaments";
  if (TUTORAT_ONLY.has(fonction)) return "tutorat";
  return "full";
};
