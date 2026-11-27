"use client";

import { createContext, useContext, useEffect } from "react";
import type { SheetDragHandle } from "./use-sheet-drag";

type MapSheetContextValue = {
  /** Clears the selection and lowers the sheet to its peek. */
  close: () => void;
  /** Lowers the sheet to its peek. */
  lower: () => void;
  setPeekTitle: (title: string | null) => void;
  /** Spread on the parts of a view that drag the sheet up and down. */
  dragHandle: SheetDragHandle;
};

/** Set by the map sheet around its view; null in the Map panel, so a view knows which of the two holds it. */
export const MapSheetContext = createContext<MapSheetContextValue | null>(null);

export function useMapSheet() {
  return useContext(MapSheetContext);
}

/** Names the view in the sheet's peek, the bar left in sight when the sheet is lowered. Does nothing in the panel. */
export function usePeekTitle(title: string | null) {
  const setPeekTitle = useMapSheet()?.setPeekTitle;
  useEffect(() => {
    if (!setPeekTitle) return;
    setPeekTitle(title);
    return () => setPeekTitle(null);
  }, [setPeekTitle, title]);
}
