import type { IconName } from "./EcgReader.icons";

export type Severite = "info" | "attention" | "critique";
type Anomalie = { libelle: string; derivations?: string[]; severite?: Severite };
type Orientation = { label: string; query: string };

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

type AnonymizationMask = { x: number; y: number; width: number; height: number };

const ECG_IMAGE_MAX_SIZE = 1568;
const ECG_JPEG_QUALITY = 0.82;

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

export const ECG_ANONYMIZATION_NOTICE =
  "Anonymisation automatique appliquée : vérifier que nom, IPP, date de naissance et code-barres sont bien masqués avant analyse.";

export function getEcgAnonymizationMasks(width: number, height: number): AnonymizationMask[] {
  const topBand = Math.max(88, Math.round(height * 0.16));
  const bottomBand = Math.max(36, Math.round(height * 0.055));
  const sideBand = Math.max(18, Math.round(width * 0.035));

  return [
    { x: 0, y: 0, width, height: Math.min(topBand, height) },
    { x: 0, y: Math.max(0, height - bottomBand), width, height: Math.min(bottomBand, height) },
    { x: 0, y: 0, width: Math.min(sideBand, width), height },
    { x: Math.max(0, width - sideBand), y: 0, width: Math.min(sideBand, width), height },
  ];
}

function applyEcgAnonymization(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const masks = getEcgAnonymizationMasks(width, height);
  ctx.save();
  ctx.fillStyle = "#ffffff";
  for (const mask of masks) {
    ctx.fillRect(mask.x, mask.y, mask.width, mask.height);
  }

  // Repère discret directement gravé dans l'image envoyée : on sait que le
  // fichier transmis à l'IA est bien celui qui a été anonymisé côté client.
  ctx.fillStyle = "#6b7280";
  ctx.font = `${Math.max(12, Math.round(width * 0.014))}px sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillText("Donnees patient masquees", Math.max(16, Math.round(width * 0.05)), 14);
  ctx.restore();
}

// Prépare l'image ECG avant l'appel IA : compression + masquage local des
// zones où les imprimantes ECG placent le plus souvent l'identité patient.
export function anonymizeEcgImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image illisible"));
      img.onload = () => {
        let { width, height } = img;
        if (width > ECG_IMAGE_MAX_SIZE || height > ECG_IMAGE_MAX_SIZE) {
          const r = Math.min(ECG_IMAGE_MAX_SIZE / width, ECG_IMAGE_MAX_SIZE / height);
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
        applyEcgAnonymization(ctx, width, height);
        resolve(canvas.toDataURL("image/jpeg", ECG_JPEG_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const num = (v: number | null | undefined, suffix = "") =>
  v == null ? "—" : `${v}${suffix}`;
