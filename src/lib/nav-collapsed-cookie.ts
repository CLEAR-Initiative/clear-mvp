/**
 * Desktop nav collapsed preference — cookie so hard refresh SSR can paint
 * the correct `--clear-nav-w` / aside width (no expand→collapse flash).
 */

export const NAV_COLLAPSED_COOKIE = "clear-nav-collapsed";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function parseNavCollapsedCookie(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const raw = decodeURIComponent(value).trim();
    return raw === "1" || raw === "true";
  } catch {
    return value.trim() === "1" || value.trim() === "true";
  }
}

export function readNavCollapsedFromDocument(): boolean {
  if (typeof document === "undefined") return false;
  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${NAV_COLLAPSED_COOKIE}=`))
    ?.slice(NAV_COLLAPSED_COOKIE.length + 1);
  return parseNavCollapsedCookie(raw);
}

export function setNavCollapsedCookie(collapsed: boolean): void {
  if (typeof document === "undefined") return;
  document.cookie = `${NAV_COLLAPSED_COOKIE}=${collapsed ? "1" : "0"}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}
