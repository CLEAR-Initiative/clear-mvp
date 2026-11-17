// Kept out of src/app/api/monitoring/route.ts: a Next.js route file may only
// export route handlers and route config, and `next build` rejects anything else.

/**
 * The GlitchTip envelope URL for an envelope whose header names `headerDsn`,
 * or null when that DSN is not ours.
 */
export function envelopeTarget(headerDsn: unknown, ourDsn: string | undefined): string | null {
  if (!ourDsn || typeof headerDsn !== "string") return null;
  let ours: URL;
  let theirs: URL;
  try {
    ours = new URL(ourDsn);
    theirs = new URL(headerDsn);
  } catch {
    return null;
  }
  if (theirs.host !== ours.host || theirs.pathname !== ours.pathname) return null;
  const projectId = ours.pathname.replace(/^\/+|\/+$/g, "");
  if (!/^\d+$/.test(projectId)) return null;
  return `${ours.protocol}//${ours.host}/api/${projectId}/envelope/`;
}
