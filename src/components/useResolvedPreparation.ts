import { useEffect, useState } from "react";
import { PSE } from "../data/pse";
import { isPsePreview } from "../lib/featureFlags";
import type { Drug, PsePreviewByDrugId } from "../types/data";
import { resolvePrep } from "./PrepBlock.parts";
import { resolvePse } from "./PseBlock.parts";

let cachedPreviewPse: PsePreviewByDrugId | null = null;
let previewPsePromise: Promise<PsePreviewByDrugId> | null = null;

const loadPreviewPse = (): Promise<PsePreviewByDrugId> => {
  if (!previewPsePromise) {
    previewPsePromise = import("../data/pse.preview")
      .then(({ PSE_PREVIEW }) => {
        cachedPreviewPse = PSE_PREVIEW;
        return cachedPreviewPse;
      })
      .catch(() => {
        cachedPreviewPse = {};
        return cachedPreviewPse;
      });
  }
  return previewPsePromise;
};

const usePreviewPseOverlay = (enabled: boolean) => {
  const [overlay, setOverlay] = useState<PsePreviewByDrugId | null>(cachedPreviewPse);

  useEffect(() => {
    if (!enabled) {
      setOverlay(null);
      return;
    }
    if (cachedPreviewPse) {
      setOverlay(cachedPreviewPse);
      return;
    }

    let active = true;
    void loadPreviewPse().then((nextOverlay) => {
      if (active) setOverlay(nextOverlay);
    });
    return () => {
      active = false;
    };
  }, [enabled]);

  return overlay;
};

export const useResolvedDrugPrep = (drug: Drug, includePreviewOverrides = true) => {
  void includePreviewOverrides;
  return {
    prep: resolvePrep(drug, null),
    loading: false,
  };
};

export const useResolvedDrugPse = (drugId: number, includePreviewOverrides = true) => {
  const previewMode = includePreviewOverrides && isPsePreview();
  const previewOverlay = usePreviewPseOverlay(previewMode);
  return {
    pse: resolvePse(PSE, previewMode ? previewOverlay : null)[drugId] || null,
    loading: previewMode && previewOverlay === null,
  };
};
