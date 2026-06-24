import type { Profile } from "./auth";
import { isAsFunction, isMedicalFunction, isStudentFunction } from "./auth";

export type PreviewAccessMode = "full" | "medicaments" | "tutorat";

export const getPreviewAccessMode = (
  profile: Pick<Profile, "fonction"> | null,
  preview: boolean
): PreviewAccessMode => {
  if (!profile) return "full";

  const fonction = profile.fonction;
  if (isAsFunction(fonction) || isStudentFunction(fonction)) return "tutorat";
  if (!preview) return "full";
  if (isMedicalFunction(fonction)) return "medicaments";
  return "full";
};
