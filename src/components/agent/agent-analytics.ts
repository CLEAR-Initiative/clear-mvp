"use client";

/**
 * CLEAR Agent usage events. Only the surface and a route pattern (ids
 * collapsed, no query string): never prompt text, Answers or Source titles.
 * Turns are not tracked here; clear-api already stores them.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { routePattern } from "~/lib/analytics/route-pattern";
import { track } from "~/lib/analytics/track";

export const AGENT_PAGE = "/agent";

export function trackAgentOpened(surface: "drawer" | "page", fromPathname: string | null | undefined): void {
  track("agent.opened", { surface, from_route: routePattern(fromPathname) });
}

/**
 * Fires `agent.opened {surface: page}` each time the Agent page comes on
 * screen, with the route the user came from (`direct` when it was the first
 * page of this visit).
 */
export function AgentPageOpenWatcher(): null {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);
  useEffect(() => {
    const from = previous.current;
    previous.current = pathname;
    if (pathname === AGENT_PAGE && from !== AGENT_PAGE) trackAgentOpened("page", from);
  }, [pathname]);
  return null;
}
