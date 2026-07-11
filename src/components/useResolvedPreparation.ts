import { useEffect, useState } from "react";
import { PSE } from "../data/pse";
import { isPreview, isPsePreview } from "../lib/featureFlags";
import type { Drug, PsePreviewByDrugId } from "../types/data";
import { resolvePrep } from "./PrepBlock.parts";
import type { PreviewPrepByDrugId } from "./PrepBlock.parts";
import { resolvePse } from "./PseBlock.parts";

let cachedPreviewPrep: PreviewPrepByDrugId | null = null;
let previewPrepPromise: Promise<PreviewPrepByDrugId> | null = null;
let cachedPreviewPse: PsePreviewByDrugId | null = null;
let previewPsePromise: Promise<PsePreviewByDrugId> | null = null;

const loadPreviewPrep = (): Promise<PreviewPrepByDrugId> => {
  if (!previewPrepPromise) {
    previewPrepPromise = import("../data/drugs.preview")
      .then(({ DRUGS_PREVIEW }) => {
        cachedPreviewPrep = DRUGS_PREVIEW as unknown as PreviewPrepByDrugId;
        return cachedPreviewPrep;
      })
      .catch(() => {
        cachedPreviewPrep = {};
        return cachedPreviewPrep;
      });
  }
  return previewPrepPromise;
};

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

const usePreviewPrepOverlay = (enabled: boolean) => {
  const [overlay, setOverlay] = useState<PreviewPrepByDrugId | null>(cachedPreviewPrep);

  useEffect(() => {
    if (!enabled) {
      setOverlay(null);
      return;
    }
    if (cachedPreviewPrep) {
      setOverlay(cachedPreviewPrep);
      return;
    }

    let active = true;
    void loadPreviewPrep().then((nextOverlay) => {
      if (active) setOverlay(nextOverlay);
    });
    return () => {
      active = false;
    };
  }, [enabled]);

  return overlay;
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
  const previewMode = includePreviewOverrides && isPreview();
  const previewOverlay = usePreviewPrepOverlay(previewMode);
  return {
    prep: resolvePrep(drug, previewMode ? previewOverlay : null),
    loading: previewMode && previewOverlay === null,
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
