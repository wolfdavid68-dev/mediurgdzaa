import type { IconName } from "./EcgReader.icons";

export type Severite = "info" | "attention" | "critique";
export type Anomalie = { libelle: string; derivations?: string[]; severite?: Severite };
export type Orientation = { label: string; query: string };

// Forme renvoyée par /api/analyze-ecg (champs tolérants : l'IA peut
// omettre / mettre null ce qu'elle ne mesure pas — on rend défensivement).
export type Analysis = {
  rythme?: { type?: string; regulier?: boolean; frequence_estimee_bpm?: number | null };
  axe?: string | null;
  intervalles?: { PR_ms?: number | null; QRS_ms?: number | null; QT_ms?: number | null };
  verdict?: { kicker?: string; titre?: string; sous_titre?: string; severite?: Severite };
  anomalies_visibles?: Anomalie[];
  orientations_therapeutiques?: Orientation[];
  limites_lecture?: string;
};

export type Screen = "capture" | "preview" | "loading" | "results" | "error";

export const SEV_CLASS: Record<Severite, string> = {
  info: "ecgr-sev-info",
  attention: "ecgr-sev-attention",
  critique: "ecgr-sev-critique",
};

export const SEV_IC: Record<Severite, IconName> = {
  info: "info",
  attention: "alert-triangle",
  critique: "alert-octagon",
};

export const VERDICT_MOD: Record<Severite, string> = {
  info: "ecgr-verdict--info",
  attention: "ecgr-verdict--attention",
  critique: "",
};

// Compresse l'image (max 1568 px de côté, JPEG q.82) avant l'upload :
// garde le payload loin de la limite Vercel (~4,5 Mo) et reste largement
// suffisant pour la lecture vision. Renvoie une data URL.
export function compressImage(file: File): Promise<string> {
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

export const num = (v: number | null | undefined, suffix = "") =>
  v == null ? "—" : `${v}${suffix}`;
