/**
 * Mapbox pitch/rotate listens for Control+drag (and right-drag). On macOS
 * analysts expect ⌘+drag too. We cannot set `pitchRotateKey` to both keys, so
 * promote `metaKey` → `ctrlKey` on the canvas pointer stream (capture phase).
 */

const POINTER_TYPES = ["mousedown", "mousemove", "mouseup"] as const;

/** Make ⌘+drag behave like Ctrl+drag for Mapbox DragRotate / pitch. */
export function bridgeMetaToCtrlForPitch(canvas: HTMLElement): () => void {
  const promote = (e: Event) => {
    const me = e as MouseEvent;
    if (!me.metaKey || me.ctrlKey) return;
    try {
      Object.defineProperty(me, "ctrlKey", {
        configurable: true,
        get: () => true,
      });
    } catch {
      /* ignore — some environments seal events */
    }
  };

  for (const type of POINTER_TYPES) {
    canvas.addEventListener(type, promote, true);
  }
  return () => {
    for (const type of POINTER_TYPES) {
      canvas.removeEventListener(type, promote, true);
    }
  };
}
