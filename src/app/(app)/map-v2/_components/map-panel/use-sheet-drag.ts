import { useEffect, useMemo, useRef, type MouseEvent, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

/** How far a pointer moves before a press on the handle becomes a drag, so taps still reach its buttons. */
const DRAG_THRESHOLD_PX = 6;
/** Released faster than this, the sheet follows the flick's direction wherever it is. */
const FLICK_PX_PER_MS = 0.5;

export type SheetDragHandle = {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onClickCapture: (event: MouseEvent<HTMLElement>) => void;
};

/**
 * Whether a released sheet ends up raised. `offset` is how far it was lowered from fully raised, out of
 * `range`; `velocity` is its speed downwards in px/ms.
 */
export function settleSheet({ offset, range, velocity }: { offset: number; range: number; velocity: number }) {
  if (Math.abs(velocity) >= FLICK_PX_PER_MS) return velocity < 0;
  return offset < range / 2;
}

type Drag = {
  pointerId: number;
  startY: number;
  base: number;
  range: number;
  offset: number;
  dragging: boolean;
  lastY: number;
  lastTime: number;
  velocity: number;
};

type UseSheetDragOptions = {
  sheetRef: RefObject<HTMLElement | null>;
  expanded: boolean;
  onSettle: (expanded: boolean) => void;
};

/**
 * Drags the sheet between its peek and fully raised. A press on a handle follows the pointer on the window,
 * as a mouse soon leaves the handle; while it moves, the sheet follows through an inline transform. On
 * release the inline style goes and the sheet's CSS animates it to where it settles.
 */
export function useSheetDrag({ sheetRef, expanded, onSettle }: UseSheetDragOptions): SheetDragHandle {
  const suppressClickRef = useRef(false);
  const stopRef = useRef<(() => void) | null>(null);
  const latest = useRef({ expanded, onSettle });
  latest.current = { expanded, onSettle };

  useEffect(() => () => stopRef.current?.(), []);

  return useMemo(() => {
    const move = (drag: Drag, event: PointerEvent) => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      const dy = event.clientY - drag.startY;
      if (!drag.dragging) {
        if (Math.abs(dy) < DRAG_THRESHOLD_PX) return;
        drag.dragging = true;
        sheet.style.transition = "none";
      }
      drag.offset = Math.min(drag.range, Math.max(0, drag.base + dy));
      sheet.style.transform = `translateY(${drag.offset}px)`;
      const elapsed = Math.max(1, event.timeStamp - drag.lastTime);
      drag.velocity = 0.8 * ((event.clientY - drag.lastY) / elapsed) + 0.2 * drag.velocity;
      drag.lastY = event.clientY;
      drag.lastTime = event.timeStamp;
    };

    const finish = (drag: Drag, released: boolean) => {
      if (!drag.dragging) return;
      const sheet = sheetRef.current;
      if (sheet) {
        sheet.style.transform = "";
        sheet.style.transition = "";
      }
      // The release would otherwise click the button the drag started on.
      suppressClickRef.current = released;
      latest.current.onSettle(released ? settleSheet(drag) : latest.current.expanded);
    };

    return {
      onPointerDown(event) {
        suppressClickRef.current = false;
        stopRef.current?.();
        const sheet = sheetRef.current;
        if (!sheet || !event.isPrimary || event.button !== 0) return;
        const peek = parseFloat(getComputedStyle(sheet).getPropertyValue("--map-sheet-peek-h")) || 0;
        const range = Math.max(0, sheet.offsetHeight - peek);
        const base = latest.current.expanded ? 0 : range;
        const drag: Drag = {
          pointerId: event.pointerId,
          startY: event.clientY,
          base,
          range,
          offset: base,
          dragging: false,
          lastY: event.clientY,
          lastTime: event.timeStamp,
          velocity: 0,
        };

        const onMove = (e: PointerEvent) => {
          if (e.pointerId === drag.pointerId) move(drag, e);
        };
        const onEnd = (e: PointerEvent) => {
          if (e.pointerId !== drag.pointerId) return;
          stop();
          finish(drag, e.type === "pointerup");
        };
        const stop = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onEnd);
          window.removeEventListener("pointercancel", onEnd);
          stopRef.current = null;
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onEnd);
        window.addEventListener("pointercancel", onEnd);
        stopRef.current = stop;
      },
      onClickCapture(event) {
        if (!suppressClickRef.current) return;
        suppressClickRef.current = false;
        event.preventDefault();
        event.stopPropagation();
      },
    };
  }, [sheetRef]);
}
