import { useEffect, useState } from "react";
import { isPsePreview } from "../lib/featureFlags";
import type { Drug, PsePreviewByDrugId } from "../types/data";
import { resolvePrep } from "./PrepBlock.parts";
import { resolvePse } from "./PseBlock.parts";
import type { PseEntry } from "./PseBlock.parts";

let cachedPreviewPse: PsePreviewByDrugId | null = null;
let previewPsePromise: Promise<PsePreviewByDrugId> | null = null;
let cachedMainPreps: Map<number, Drug["prep"]> | null = null;
let mainPrepsPromise: Promise<Map<number, Drug["prep"]>> | null = null;
let cachedMainPse: Record<number, PseEntry> | null = null;
let mainPsePromise: Promise<Record<number, PseEntry>> | null = null;

const loadMainPreps = () => {
  if (!mainPrepsPromise) {
    mainPrepsPromise = import("virtual:drug-details").then(({ DRUG_DETAILS }) => {
      cachedMainPreps = new Map(DRUG_DETAILS.map((drug) => [drug.id, drug.prep]));
      return cachedMainPreps;
    });
  }
  return mainPrepsPromise;
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

const loadMainPse = () => {
  if (!mainPsePromise) {
    mainPsePromise = import("../data/pse").then(({ PSE }) => {
      cachedMainPse = PSE;
      return cachedMainPse;
    });
  }
  return mainPsePromise;
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

export const useResolvedDrugPrep = (drug: Drug, enabled = true) => {
  const inlinePrep = resolvePrep(drug, null);
  const shouldLoadDeferredPrep = Boolean(drug._prepDeferred && !inlinePrep);
  const [prep, setPrep] = useState<Drug["prep"] | null>(
    inlinePrep ?? cachedMainPreps?.get(drug.id) ?? null
  );
  const [loading, setLoading] = useState(enabled && shouldLoadDeferredPrep && !cachedMainPreps);

  useEffect(() => {
    if (inlinePrep) {
      setPrep(inlinePrep);
      setLoading(false);
      return;
    }
    if (!shouldLoadDeferredPrep) {
      setPrep(null);
      setLoading(false);
      return;
    }
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (cachedMainPreps) {
      setPrep(cachedMainPreps.get(drug.id) ?? null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void loadMainPreps().then((preps) => {
      if (!active) return;
      setPrep(preps.get(drug.id) ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [drug.id, enabled, inlinePrep, shouldLoadDeferredPrep]);

  return { prep, loading };
};

export const useResolvedDrugPse = (
  drugId: number,
  includePreviewOverrides = true,
  enabled = true
) => {
  const [mainPse, setMainPse] = useState<Record<number, PseEntry> | null>(cachedMainPse);
  const previewMode = enabled && includePreviewOverrides && isPsePreview();
  const previewOverlay = usePreviewPseOverlay(previewMode);

  useEffect(() => {
    if (!enabled || mainPse) return;
    let active = true;
    void loadMainPse().then((nextPse) => {
      if (active) setMainPse(nextPse);
    });
    return () => {
      active = false;
    };
  }, [enabled, mainPse]);

  return {
    pse: mainPse ? resolvePse(mainPse, previewMode ? previewOverlay : null)[drugId] || null : null,
    loading: enabled && (!mainPse || (previewMode && previewOverlay === null)),
  };
};
