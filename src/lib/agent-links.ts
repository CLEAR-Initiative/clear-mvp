/**
 * The Agent's link structure: every app page an Answer's text may link to,
 * and how its link is written. One list for the system prompt (which tells
 * the model how to write the links) and the Thread (which opens only these
 * in the app), so a page added here becomes linkable on both sides.
 *
 * - An Event, Signal or Crisis page, by id: `/event/<id>`.
 * - The Map or Detection, with or without filters (see agent-deep-link.ts).
 * - A nav section's page: `/dashboard`, `/inbox`, …
 *
 * Anything else (admin and settings pages, other origins, unknown query
 * parameters) is not an app link. The pages still decide what the user may
 * see: a link to a place outside the team's scope is refused by the page.
 */

import { CURRENT_VIEW_ENTITY_KINDS } from "~/lib/agent-current-view-contract";
import {
  DETECTION_ROLLING_DATES,
  DETECTION_SEVERITIES,
  MAP_TIMEFRAMES,
  detectionDeepLinkHref,
  mapDeepLinkHref,
  readDetectionDeepLink,
  readMapDeepLink,
} from "~/lib/agent-deep-link";
import { NAV_ROUTES } from "~/lib/nav-routes";

const ENTITY_HREF = new RegExp(`^/(?:${CURRENT_VIEW_ENTITY_KINDS.join("|")})/[A-Za-z0-9_-]{1,128}$`);
const SECTION_HREFS: ReadonlySet<string> = new Set(Object.values(NAV_ROUTES));
/** Never another origin (`//host`, `/\host`), never a fragment. */
const APP_PATH = /^\/(?!\/)[^#\\]*$/;

/** What kind of page an app link opens. */
export type AgentLinkKind = "entity" | "filtered" | "section";

export interface AgentLink {
  kind: AgentLinkKind;
  /** The link as the app will open it: only the parameters the page reads. */
  href: string;
}

/** The app page an Answer's link points at, or null when it isn't one the Agent may link to. */
export function agentLink(href: unknown): AgentLink | null {
  if (typeof href !== "string" || !APP_PATH.test(href)) return null;
  if (ENTITY_HREF.test(href)) return { kind: "entity", href };
  const [path = "", search = ""] = href.split("?", 2);
  if (!SECTION_HREFS.has(path)) return null;
  if (!search) return { kind: "section", href: path };
  const params = new URLSearchParams(search);
  const filtered =
    path === NAV_ROUTES.map
      ? mapDeepLinkHref(readMapDeepLink(params))
      : path === NAV_ROUTES.detection
        ? detectionDeepLinkHref(readDetectionDeepLink(params))
        : path;
  return filtered === path ? { kind: "section", href: path } : { kind: "filtered", href: filtered };
}

/** The link structure as the model reads it, in the system prompt. */
export const AGENT_LINK_GUIDE: string = [
  "App links you may write as Markdown links, `[text](path)`. Always a path starting with `/`, never a full URL:",
  ...CURRENT_VIEW_ENTITY_KINDS.map(
    (kind) => `- \`/${kind}/<id>\`: one ${kind}'s page, with its id exactly as a clear_* tool returned it.`,
  ),
  `- \`/map?countryId=<id>&regionId=<id>&timeframe=<${MAP_TIMEFRAMES.join("|")}>\`: the Map, filtered. ` +
    "Ids are location ids from clear_find_location (country at level 0, region at level 1); every parameter is optional.",
  `- \`/detection?countryId=<id>&regionId=<id>&date=<${DETECTION_ROLLING_DATES.join("|")}>&severities=<${DETECTION_SEVERITIES.join(",")}>\`: ` +
    "Detection, filtered the same way. Write spaces in `date` as `%20`.",
  `- ${Object.values(NAV_ROUTES)
    .map((href) => `\`${href}\``)
    .join(", ")}: the app's sections.`,
].join("\n");
