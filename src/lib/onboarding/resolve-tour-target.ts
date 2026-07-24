/**
 * Prefer the first matching tour target that is actually painted.
 * Desktop/mobile often share a data-tour attr while one copy is display:none.
 */
export function resolveTourTarget(selector: string): Element | null {
  if (typeof document === "undefined") return null;
  const matches = Array.from(document.querySelectorAll(selector));
  if (matches.length === 0) return null;

  for (const el of matches) {
    if (isPainted(el)) return el;
  }
  return matches[0] ?? null;
}

function isPainted(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.hidden) return false;
  // Inline styles win in jsdom (getComputedStyle is unreliable there).
  if (el.style.display === "none" || el.style.visibility === "hidden") return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = el.getBoundingClientRect();
  // In real browsers a Mantine-hidden twin reports 0×0; prefer a painted match.
  if (rect.width === 0 && rect.height === 0) return false;
  return true;
}
