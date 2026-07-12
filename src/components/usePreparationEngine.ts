import { useEffect, useState } from "react";
import type * as PreparationEngine from "./PreparationModel";

type PreparationEngineApi = typeof PreparationEngine;

let cachedEngine: PreparationEngineApi | null = null;
let enginePromise: Promise<PreparationEngineApi> | null = null;

const loadPreparationEngine = () => {
  if (!enginePromise) {
    enginePromise = Promise.all([
      import("./PreparationModel"),
      import("../styles/drug-preparation.css"),
      import("../styles/preparation-v25.css"),
      import("../styles/pse.css"),
    ]).then(([engine]) => {
      cachedEngine = engine;
      return engine;
    });
  }
  return enginePromise;
};

export const usePreparationEngine = (enabled: boolean) => {
  const [engine, setEngine] = useState<PreparationEngineApi | null>(cachedEngine);

  useEffect(() => {
    if (!enabled || engine) return;
    let active = true;
    void loadPreparationEngine().then((nextEngine) => {
      if (active) setEngine(nextEngine);
    });
    return () => {
      active = false;
    };
  }, [enabled, engine]);

  return { engine, loading: enabled && !engine };
};
