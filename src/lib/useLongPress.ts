import { useCallback, useRef, type PointerEvent } from "react";

// Appui long (pointer events → souris + tactile). Utilisé pour l'accès
// caché à la console admin via un appui prolongé sur le logo (remplace
// l'ancienne roue crantée flottante, gênante car superposée au contenu).
//
// Annulé si le doigt/souris relâche, sort, ou bouge trop (scroll) avant
// le délai → pas de déclenchement accidentel pendant un défilement.

const MOVE_TOLERANCE_PX = 10;

export const useLongPress = (onLongPress: () => void, ms = 600) => {
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    start.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      start.current = { x: e.clientX, y: e.clientY };
      timer.current = window.setTimeout(() => {
        timer.current = null;
        onLongPress();
      }, ms);
    },
    [onLongPress, ms]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!start.current || timer.current === null) return;
      const dx = Math.abs(e.clientX - start.current.x);
      const dy = Math.abs(e.clientY - start.current.y);
      if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) clear();
    },
    [clear]
  );

  // onContextMenu : empêche le menu contextuel / callout iOS pendant l'appui.
  const onContextMenu = useCallback((e: { preventDefault: () => void }) => {
    e.preventDefault();
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu,
  };
};
